const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { env } = require("./config/env");
const authRoutes = require("./routes/auth");
const assessmentRoutes = require("./routes/assessments");
const profileRoutes = require("./routes/profile");

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet());
if (env.CORS_ORIGIN) {
  app.use(cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));
}
app.use(express.json({ limit: "20kb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/auth", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many authentication requests. Try again later." }
}), authRoutes);
app.use("/profile", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many profile requests. Try again later." }
}), profileRoutes);
app.use("/assessments", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many assessment requests. Try again later." }
}), assessmentRoutes);
app.use((req, res) => res.status(404).json({ error: "Route not found." }));

app.use((error, _req, res, _next) => {
  if (error.status && (error.status < 500 || error.expose)) {
    if (error.status >= 500) console.error("Service request failed:", error);
    return res.status(error.status).json({
      error: error.message,
      ...(error.details ? { details: error.details } : {})
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({ error: "Invalid request data." });
  }

  if (error.name === "MulterError") {
    return res.status(400).json({ error: "Image upload was rejected." });
  }

  if (error.code === 11000) {
    return res.status(409).json({ error: "Email or username is already registered." });
  }

  console.error("API request failed:", error);
  return res.status(503).json({ error: "The service is temporarily unavailable." });
});

module.exports = app;
