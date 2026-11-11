const { createHmac, randomBytes, randomUUID, timingSafeEqual } = require("node:crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

const PASSWORD_COST = 12;
const ACCESS_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

function digest(secret, value) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function oauthStateDigest(state) {
  return digest(env.OAUTH_STATE_SECRET, `google-oauth:${state}`);
}

function recoveryDigest(key) {
  return digest(env.RECOVERY_KEY_SECRET, key.replaceAll("-", "").toLowerCase());
}

function makeRecoveryKeys() {
  return Array.from({ length: 5 }, () => {
    const hex = randomBytes(16).toString("hex");
    return hex.match(/.{1,8}/g).join("-");
  });
}

function hasMatchingRecoveryKey(key, digests) {
  const candidate = Buffer.from(recoveryDigest(key));
  return digests.reduce((matched, stored) => {
    const storedBuffer = Buffer.from(stored);
    return timingSafeEqual(candidate, storedBuffer) || matched;
  }, false);
}

function createAccessToken(userId, sessionId) {
  return jwt.sign(
    { sid: sessionId },
    env.JWT_SECRET,
    {
      algorithm: "HS256",
      subject: userId.toString(),
      issuer: "trimmer-auth",
      audience: "trimmer-api",
      expiresIn: ACCESS_TOKEN_TTL_SECONDS
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET, {
    algorithms: ["HS256"],
    issuer: "trimmer-auth",
    audience: "trimmer-api"
  });
}

function newSessionId() {
  return randomUUID();
}

async function hashPassword(password) {
  return bcrypt.hash(password, PASSWORD_COST);
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

function newVerificationToken() {
  return randomBytes(32).toString("base64url");
}

function verificationDigest(token) {
  return digest(env.OAUTH_STATE_SECRET, `email-verification:${token}`);
}

module.exports = {
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
  verifyAccessToken,
  verifyPassword
};

