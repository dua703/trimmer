const Session = require("../models/Session");
const { verifyAccessToken } = require("../utils/auth");

async function authenticate(req, res, next) {
  const authorization = req.get("authorization");
  const match = authorization && authorization.match(/^Bearer ([^\s]+)$/);

  if (!match) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    const payload = verifyAccessToken(match[1]);
    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      typeof payload.sid !== "string"
    ) {
      return res.status(401).json({ error: "Invalid or expired access token." });
    }

    const session = await Session.findOne({
      _id: payload.sid,
      userId: payload.sub,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      return res.status(401).json({ error: "Invalid or expired access token." });
    }

    req.auth = { userId: payload.sub, sessionId: payload.sid };
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Invalid or expired access token." });
    }
    return next(error);
  }
}

module.exports = { authenticate };
