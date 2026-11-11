process.env.NODE_ENV = "test";
process.env.MONGODB_URI ||= "mongodb://127.0.0.1:27017/trimmer_auth_test";
process.env.JWT_SECRET ||= "test-jwt-secret-with-more-than-thirty-two-characters";
process.env.OAUTH_STATE_SECRET ||= "test-oauth-secret-with-more-than-thirty-two-characters";
process.env.RECOVERY_KEY_SECRET ||= "test-recovery-secret-with-more-than-thirty-two-characters";
process.env.FRONTEND_URL = "http://localhost:3001";
// No SMTP credentials: the mailer prints the verification link instead of sending.
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;

const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../src/app");
const authRouter = require("../src/routes/auth");
const Session = require("../src/models/Session");
const User = require("../src/models/User");
const { hashPassword, verificationDigest } = require("../src/utils/auth");
const { verificationEmail } = require("../src/services/mailer");

const originals = {
  exists: User.exists,
  findOne: User.findOne,
  findOneAndUpdate: User.findOneAndUpdate,
  deleteOne: User.deleteOne,
  create: User.create,
  save: User.prototype.save,
  sessionCreate: Session.create,
  warn: console.warn
};

function restore() {
  User.exists = originals.exists;
  User.findOne = originals.findOne;
  User.findOneAndUpdate = originals.findOneAndUpdate;
  User.deleteOne = originals.deleteOne;
  User.create = originals.create;
  User.prototype.save = originals.save;
  Session.create = originals.sessionCreate;
  console.warn = originals.warn;
}

async function withServer(run) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(base);
  } finally {
    restore();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function post(base, path, body) {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

const registration = {
  firstName: "Sheheryar",
  middleName: "",
  lastName: "Ahmad",
  username: "sheheryar",
  email: "Sheheryar@Example.com",
  password: "Strong!Pass123",
  confirmPassword: "Strong!Pass123",
  dateOfBirth: "2000-01-15"
};

test("registering creates an unverified account, emails a link, and issues no session", async () => {
  const saved = [];
  const warnings = [];
  User.exists = async () => null;
  User.prototype.save = async function save() {
    saved.push(this);
    return this;
  };
  console.warn = (message) => warnings.push(String(message));

  await withServer(async (base) => {
    const response = await post(base, "/auth/register", registration);
    const body = await response.json();

    assert.equal(response.status, 201, JSON.stringify(body));
    assert.equal(body.requiresEmailVerification, true);
    assert.equal("accessToken" in body, false);
    assert.equal(body.recoveryKeys.length, 5);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].email, "sheheryar@example.com");
    assert.equal(saved[0].emailVerified, false);

    const link = warnings.join("\n").match(/http:\/\/localhost:3001\/verify-email\?token=([\w-]{43})/);
    assert.ok(link, "verification link is generated");
    // Only a hash of the token is stored, never the token itself.
    assert.equal(saved[0].emailVerification.tokenHash, verificationDigest(link[1]));
    assert.notEqual(saved[0].emailVerification.tokenHash, link[1]);
    assert.ok(saved[0].emailVerification.expiresAt > new Date());
  });
});

test("login is blocked until the email is verified, then succeeds", async () => {
  const passwordHash = await hashPassword(registration.password);
  const baseUser = {
    id: "65c000000000000000000010",
    _id: "65c000000000000000000010",
    firstName: "Sheheryar",
    lastName: "Ahmad",
    username: "sheheryar",
    email: "sheheryar@example.com",
    authProvider: "local",
    passwordHash
  };
  let current = { ...baseUser, emailVerified: false };
  User.findOne = () => ({ select: async () => current });
  Session.create = async () => ({});

  await withServer(async (base) => {
    const blocked = await post(base, "/auth/login", { identifier: "sheheryar", password: registration.password });
    const blockedBody = await blocked.json();
    assert.equal(blocked.status, 403);
    assert.equal(blockedBody.code, "email-not-verified");
    assert.equal("accessToken" in blockedBody, false);

    const wrongPassword = await post(base, "/auth/login", { identifier: "sheheryar", password: "Wrong!Pass123" });
    assert.equal(wrongPassword.status, 401);

    current = { ...baseUser, emailVerified: true };
    const allowed = await post(base, "/auth/login", { identifier: "sheheryar", password: registration.password });
    const allowedBody = await allowed.json();
    assert.equal(allowed.status, 200);
    assert.ok(allowedBody.accessToken);
    assert.equal(allowedBody.user.emailVerified, true);
  });
});

test("verify-email redeems a token once and rejects invalid or expired tokens", async () => {
  const token = "A".repeat(43);
  const calls = [];
  User.findOneAndUpdate = async (filter, update) => {
    calls.push({ filter, update });
    return filter["emailVerification.tokenHash"] === verificationDigest(token)
      ? { email: "sheheryar@example.com" }
      : null;
  };

  await withServer(async (base) => {
    const ok = await post(base, "/auth/verify-email", { token });
    assert.equal(ok.status, 200);
    assert.equal(calls[0].update.$set.emailVerified, true);
    assert.equal(calls[0].update.$set["emailVerification.tokenHash"], null);
    assert.ok(calls[0].filter["emailVerification.expiresAt"].$gt instanceof Date);

    const unknown = await post(base, "/auth/verify-email", { token: "B".repeat(43) });
    assert.equal(unknown.status, 400);
    assert.equal((await unknown.json()).code, "invalid-token");

    const malformed = await post(base, "/auth/verify-email", { token: "short" });
    assert.equal(malformed.status, 400);
  });
});

test("resend-verification hides account existence and enforces a cooldown", async () => {
  let lookup = null;
  User.findOne = () => ({ select: async () => lookup });

  await withServer(async (base) => {
    const unknown = await post(base, "/auth/resend-verification", { email: "nobody@example.com" });
    assert.equal(unknown.status, 200);

    lookup = { emailVerified: true };
    const alreadyVerified = await post(base, "/auth/resend-verification", { email: "done@example.com" });
    assert.equal(alreadyVerified.status, 200);
    assert.deepEqual(await alreadyVerified.json(), await unknown.json());

    lookup = { emailVerified: false, emailVerification: { lastSentAt: new Date() } };
    const cooling = await post(base, "/auth/resend-verification", { email: "wait@example.com" });
    assert.equal(cooling.status, 429);
  });
});

test("Google sign-up creates a verified account", async () => {
  const created = [];
  User.findOne = () => ({ select: async () => null });
  User.exists = async () => null;
  User.create = async (doc) => {
    created.push(doc);
    return doc;
  };

  const user = await authRouter.signInWithGoogleClaims({
    sub: "google-123",
    email: "New.User@Gmail.com",
    email_verified: true,
    name: "New User",
    given_name: "New",
    family_name: "User"
  });
  restore();

  assert.equal(user.emailVerified, true);
  assert.equal(created[0].email, "new.user@gmail.com");
  assert.equal(created[0].authProvider, "google");
  assert.equal(created[0].googleSubject, "google-123");
});

test("Google sign-in discards an unverified password account for the same email", async () => {
  const deleted = [];
  const created = [];
  const squatter = { _id: "65c000000000000000000020", email: "victim@gmail.com", emailVerified: false, googleSubject: null };
  User.findOne = () => ({ select: async () => squatter });
  User.exists = async () => null;
  User.deleteOne = async (filter) => {
    deleted.push(filter);
  };
  User.create = async (doc) => {
    created.push(doc);
    return doc;
  };

  const user = await authRouter.signInWithGoogleClaims({
    sub: "google-victim",
    email: "victim@gmail.com",
    email_verified: true,
    name: "Real Owner"
  });
  restore();

  assert.deepEqual(deleted, [{ _id: squatter._id }]);
  assert.equal(created.length, 1);
  assert.equal("passwordHash" in created[0], false);
  assert.equal(user.emailVerified, true);
});

test("Google sign-in links and verifies an existing verified local account", async () => {
  const saves = [];
  const existing = {
    email: "both@gmail.com",
    emailVerified: true,
    googleSubject: null,
    authProvider: "local",
    async save() {
      saves.push(this);
    }
  };
  User.findOne = () => ({ select: async () => existing });

  await authRouter.signInWithGoogleClaims({ sub: "google-both", email: "both@gmail.com", email_verified: true });
  restore();

  assert.equal(existing.googleSubject, "google-both");
  assert.equal(existing.authProvider, "local+google");
  assert.equal(saves.length, 1);
});

test("verification email contains the link and escapes the name", () => {
  const message = verificationEmail('<b>Eve</b>', "http://localhost:3001/verify-email?token=abc");
  assert.match(message.text, /verify-email\?token=abc/);
  assert.match(message.html, /&lt;b&gt;Eve&lt;\/b&gt;/);
  assert.equal(message.html.includes("<b>Eve</b>"), false);
});
