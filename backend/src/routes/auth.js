const { randomBytes } = require("node:crypto");
const express = require("express");
const { rateLimit } = require("express-rate-limit");
const { OAuth2Client } = require("google-auth-library");
const { z } = require("zod");
const { env } = require("../config/env");
const { authenticate } = require("../middleware/authenticate");
const GoogleLoginExchange = require("../models/GoogleLoginExchange");
const GoogleOAuthState = require("../models/GoogleOAuthState");
const Session = require("../models/Session");
const User = require("../models/User");
const { passwordSchema } = require("../utils/password");
const {
  ACCESS_TOKEN_TTL_SECONDS,
  createAccessToken,
  hasMatchingRecoveryKey,
  hashPassword,
  makeRecoveryKeys,
  newSessionId,
  newVerificationToken,
  oauthStateDigest,
  recoveryDigest,
  verificationDigest,
  verifyPassword
} = require("../utils/auth");
const { sendVerificationEmail } = require("../services/mailer");
const { createUniqueUsername } = require("../utils/username");
const { isValidDateOfBirth, nameSchema, optionalNameSchema } = require("../utils/validation");

const router = express.Router();
const RESEND_COOLDOWN_MS = 60 * 1000;
const UNVERIFIED_ACCOUNT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const googleClient = new OAuth2Client(
  env.GOOGLE_CLIENT_ID || undefined,
  env.GOOGLE_CLIENT_SECRET || undefined,
  env.GOOGLE_REDIRECT_URI
);
function createSensitiveActionLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many attempts. Try again later." }
  });
}
const registrationLimiter = createSensitiveActionLimiter();
const loginLimiter = createSensitiveActionLimiter();
const recoveryLimiter = createSensitiveActionLimiter();
const googleLimiter = createSensitiveActionLimiter();
const resendVerificationLimiter = createSensitiveActionLimiter();
const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many verification attempts. Try again later." }
});
const loginIdentifierSchema = z.string().trim().min(1).max(254);
const registrationSchema = z.object({
  firstName: nameSchema,
  middleName: optionalNameSchema,
  lastName: nameSchema,
  username: z.string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, "Username can contain letters, numbers, underscores, and periods."),
  email: z.string().trim().email().max(254),
  password: passwordSchema,
  confirmPassword: z.string(),
  dateOfBirth: z.string().refine(isValidDateOfBirth, "You must be at least 16 years old.")
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match."
});

const resetSchema = z.object({
  identifier: loginIdentifierSchema,
  recoveryKey: z.string().trim().min(1).max(64),
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match."
});

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const error = new Error("Invalid request.");
    error.status = 400;
    error.details = result.error.issues.map(({ path, message }) => ({
      field: path.join("."),
      message
    }));
    throw error;
  }
  return result.data;
}

function publicUser(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    dateOfBirth: user.dateOfBirth,
    authProvider: user.authProvider,
    emailVerified: Boolean(user.emailVerified)
  };
}

function verificationLink(token) {
  const link = new URL("/verify-email", env.FRONTEND_URL);
  link.searchParams.set("token", token);
  return link.toString();
}

/** Stores a fresh (hashed) token on the user document and returns the raw token. */
function assignVerificationToken(user) {
  const token = newVerificationToken();
  const now = Date.now();
  user.emailVerification = {
    tokenHash: verificationDigest(token),
    expiresAt: new Date(now + env.EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000),
    lastSentAt: new Date(now)
  };
  return token;
}


async function issueSession(user) {
  const sessionId = newSessionId();
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000);
  await Session.create({ _id: sessionId, userId: user._id, expiresAt });
  return {
    accessToken: createAccessToken(user._id, sessionId),
    tokenType: "Bearer",
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    user: publicUser(user)
  };
}

function redirectGoogleResult(res, path, values = {}) {
  const destination = new URL(path, env.FRONTEND_URL);
  for (const [key, value] of Object.entries(values)) {
    destination.searchParams.set(key, value);
  }
  return res.redirect(destination.toString());
}

async function signInWithGoogleClaims(claims) {
  if (!claims?.sub || !claims.email || claims.email_verified !== true) {
    const error = new Error("Google account could not be verified.");
    error.status = 401;
    throw error;
  }

  let user = await User.findOne({
    $or: [{ googleSubject: claims.sub }, { email: claims.email.toLowerCase() }]
  }).select("+googleSubject +recoveryKeysPending");

  if (user?.googleSubject && user.googleSubject !== claims.sub) {
    const error = new Error("This email is linked to a different Google account.");
    error.status = 409;
    throw error;
  }

  // Someone may have registered (but never verified) this address with a password of
  // their choosing. Google has now proven ownership, so discard that unverified
  // account instead of inheriting its credentials and recovery keys.
  if (user && !user.googleSubject && !user.emailVerified) {
    await User.deleteOne({ _id: user._id });
    user = null;
  }

  if (!user) {
    const fullName = claims.name || claims.email.split("@")[0];
    const firstName = claims.given_name || fullName.split(/\s+/)[0] || "Google";
    const lastName = claims.family_name || fullName.split(/\s+/).slice(1).join(" ") || "User";
    user = await User.create({
      firstName,
      lastName,
      username: await createUniqueUsername(User, fullName),
      email: claims.email.toLowerCase(),
      dateOfBirth: null,
      googleSubject: claims.sub,
      recoveryKeyDigests: [],
      recoveryKeysPending: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      authProvider: "google"
    });
  } else {
    let changed = false;
    if (!user.googleSubject) {
      user.googleSubject = claims.sub;
      user.authProvider = user.authProvider === "local" ? "local+google" : user.authProvider;
      changed = true;
    }
    if (!user.emailVerified) {
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
      user.unverifiedExpiresAt = null;
      changed = true;
    }
    if (changed) await user.save();
  }

  return user;
}

router.get("/providers", (_req, res) => {
  res.json({
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    emailVerification: true
  });
});

router.post("/register", registrationLimiter, async (req, res, next) => {
  try {
    const input = parse(registrationSchema, req.body);
    const email = input.email.toLowerCase();
    const username = input.username.toLowerCase();
    const duplicate = await User.exists({ $or: [{ email }, { username }] });

    if (duplicate) {
      return res.status(409).json({ error: "Email or username is already registered." });
    }

    const recoveryKeys = makeRecoveryKeys();
    const user = new User({
      firstName: input.firstName,
      middleName: input.middleName,
      lastName: input.lastName,
      username,
      email,
      dateOfBirth: new Date(`${input.dateOfBirth}T00:00:00.000Z`),
      passwordHash: await hashPassword(input.password),
      recoveryKeyDigests: recoveryKeys.map(recoveryDigest),
      emailVerified: false,
      unverifiedExpiresAt: new Date(Date.now() + UNVERIFIED_ACCOUNT_TTL_MS),
      authProvider: "local"
    });
    const token = assignVerificationToken(user);
    await user.save();

    try {
      await sendVerificationEmail(user, verificationLink(token));
    } catch (mailError) {
      console.error("Verification email failed:", mailError);
      await User.deleteOne({ _id: user._id });
      const error = new Error("We could not send the verification email. Check the address and try again.");
      error.status = 503;
      error.expose = true;
      throw error;
    }

    return res.status(201).json({
      requiresEmailVerification: true,
      email,
      message: "Account created. Check your email and confirm your address before signing in.",
      recoveryKeys,
      recoveryKeysNotice: "Save these five keys now. They are shown only once and each key can be reused."
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const identifier = parse(loginIdentifierSchema, req.body?.identifier);
    const password = req.body?.password;
    if (typeof password !== "string" || password.length > 128) {
      return res.status(400).json({ error: "Invalid request." });
    }

    const normalized = identifier.toLowerCase();
    const user = await User.findOne({
      $or: [{ email: normalized }, { username: normalized }]
    }).select("+passwordHash");

    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid username/email or password." });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        code: "email-not-verified",
        email: user.email,
        error: "Confirm your email address before signing in. Check your inbox for the verification link."
      });
    }

    return res.json(await issueSession(user));
  } catch (error) {
    return next(error);
  }
});

router.post("/verify-email", verifyEmailLimiter, async (req, res, next) => {
  try {
    const { token } = parse(z.object({
      token: z.string().regex(/^[A-Za-z0-9_-]{43}$/)
    }), req.body);

    // Atomic: a token can only be redeemed once.
    const user = await User.findOneAndUpdate(
      {
        "emailVerification.tokenHash": verificationDigest(token),
        "emailVerification.expiresAt": { $gt: new Date() }
      },
      {
        $set: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
          unverifiedExpiresAt: null,
          "emailVerification.tokenHash": null,
          "emailVerification.expiresAt": null
        }
      },
      { new: true }
    );

    if (!user) {
      return res.status(400).json({
        code: "invalid-token",
        error: "This verification link is invalid or has expired."
      });
    }

    return res.json({ message: "Email confirmed. You can now sign in.", email: user.email });
  } catch (error) {
    return next(error);
  }
});

router.post("/resend-verification", resendVerificationLimiter, async (req, res, next) => {
  try {
    const { email } = parse(z.object({ email: z.string().trim().email().max(254) }), req.body);
    const generic = {
      message: "If that account exists and is not confirmed yet, a new verification email has been sent."
    };

    const user = await User.findOne({ email: email.toLowerCase() })
      .select("+emailVerification.lastSentAt");

    if (!user || user.emailVerified) {
      return res.json(generic);
    }

    const lastSentAt = user.emailVerification?.lastSentAt;
    if (lastSentAt && Date.now() - lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
      return res.status(429).json({ error: "Please wait a minute before requesting another email." });
    }

    const token = assignVerificationToken(user);
    user.unverifiedExpiresAt = new Date(Date.now() + UNVERIFIED_ACCOUNT_TTL_MS);
    await user.save();

    try {
      await sendVerificationEmail(user, verificationLink(token));
    } catch (mailError) {
      console.error("Verification email failed:", mailError);
      const error = new Error("We could not send the verification email. Please try again shortly.");
      error.status = 503;
      error.expose = true;
      throw error;
    }

    return res.json(generic);
  } catch (error) {
    return next(error);
  }
});


router.post("/google", googleLimiter, async (req, res, next) => {
  try {
    if (!env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: "Google sign-in is not configured." });
    }

    const idToken = parse(z.string().min(1).max(8192), req.body?.idToken);
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID
      });
    } catch (error) {
      if (error.name === "GaxiosError") {
        return next(error);
      }
      return res.status(401).json({ error: "Google account could not be verified." });
    }
    const user = await signInWithGoogleClaims(ticket.getPayload());
    const session = await issueSession(user);
    let recoveryKeys;
    if (user.recoveryKeysPending) {
      recoveryKeys = makeRecoveryKeys();
      user.recoveryKeyDigests = recoveryKeys.map(recoveryDigest);
      user.recoveryKeysPending = false;
      await user.save();
    }
    return res.json({ ...session, ...(recoveryKeys ? { recoveryKeys } : {}) });
  } catch (error) {
    return next(error);
  }
});

router.get("/google/start", googleLimiter, async (_req, res, next) => {
  try {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return res.status(503).json({ error: "Google sign-in is not configured." });
    }

    const state = randomBytes(32).toString("base64url");
    await GoogleOAuthState.create({
      _id: oauthStateDigest(state),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });
    return res.redirect(googleClient.generateAuthUrl({
      access_type: "online",
      response_type: "code",
      scope: ["openid", "email", "profile"],
      state,
      prompt: "select_account"
    }));
  } catch (error) {
    return next(error);
  }
});

router.get("/google/callback", googleLimiter, async (req, res, next) => {
  try {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return redirectGoogleResult(res, "/", { error: "google-not-configured" });
    }

    if (req.query.error) {
      return redirectGoogleResult(res, "/", { error: "google-cancelled" });
    }
    const input = parse(z.object({
      code: z.string().min(1).max(4096),
      state: z.string().regex(/^[A-Za-z0-9_-]{43}$/)
    }), req.query);
    const stateRecord = await GoogleOAuthState.findOneAndDelete({
      _id: oauthStateDigest(input.state),
      expiresAt: { $gt: new Date() }
    });
    if (!stateRecord) {
      return redirectGoogleResult(res, "/", { error: "google-state-invalid" });
    }

    const { tokens } = await googleClient.getToken({
      code: input.code,
      redirect_uri: env.GOOGLE_REDIRECT_URI
    });
    if (!tokens.id_token) {
      return redirectGoogleResult(res, "/", { error: "google-verification-failed" });
    }
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID
    });
    const user = await signInWithGoogleClaims(ticket.getPayload());
    const handoffCode = randomBytes(32).toString("base64url");
    await GoogleLoginExchange.create({
      _id: oauthStateDigest(`exchange:${handoffCode}`),
      userId: user._id,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000)
    });
    const location = new URL("/google/callback", env.FRONTEND_URL);
    location.searchParams.set("code", handoffCode);
    return res.redirect(location.toString());
  } catch (error) {
    if (error.name === "GaxiosError" || error.status === 401 || error.status === 409) {
      return redirectGoogleResult(res, "/", { error: "google-verification-failed" });
    }
    return next(error);
  }
});

router.post("/google/exchange", googleLimiter, async (req, res, next) => {
  try {
    const { code } = parse(z.object({
      code: z.string().regex(/^[A-Za-z0-9_-]{43}$/)
    }), req.body);
    const exchange = await GoogleLoginExchange.findOneAndDelete({
      _id: oauthStateDigest(`exchange:${code}`),
      expiresAt: { $gt: new Date() }
    });
    if (!exchange) {
      return res.status(401).json({ error: "Google sign-in code expired or was already used." });
    }

    const user = await User.findById(exchange.userId).select("+recoveryKeysPending");
    if (!user) {
      return res.status(401).json({ error: "Google account could not be found." });
    }

    let recoveryKeys;
    if (user.recoveryKeysPending) {
      recoveryKeys = makeRecoveryKeys();
      user.recoveryKeyDigests = recoveryKeys.map(recoveryDigest);
      user.recoveryKeysPending = false;
      await user.save();
    }

    return res.json({
      ...await issueSession(user),
      ...(recoveryKeys ? { recoveryKeys } : {})
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/forgot-password", recoveryLimiter, async (req, res, next) => {
  try {
    const input = parse(resetSchema, req.body);
    const identifier = input.identifier.toLowerCase();
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    }).select("+recoveryKeyDigests");

    if (!user || !hasMatchingRecoveryKey(input.recoveryKey, user.recoveryKeyDigests)) {
      return res.status(400).json({ error: "Account details or recovery key are incorrect." });
    }

    user.passwordHash = await hashPassword(input.password);
    await user.save();
    await Session.deleteMany({ userId: user._id });
    return res.json({ message: "Password changed. Sign in again with your new password." });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(401).json({ error: "Account no longer exists." });
    }
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", authenticate, async (req, res, next) => {
  try {
    await Session.deleteOne({ _id: req.auth.sessionId, userId: req.auth.userId });
    return res.json({ message: "Logged out." });
  } catch (error) {
    return next(error);
  }
});

router.signInWithGoogleClaims = signInWithGoogleClaims;

module.exports = router;
