const { z } = require("zod");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1),
  CORS_ORIGIN: z.string().url().optional().or(z.literal("")),
  AI_SERVICE_URL: z.string().url().default("http://127.0.0.1:8000"),
  AI_SERVICE_API_KEY: z.string().optional().default(""),
  JWT_SECRET: z.string().min(32),
  OAUTH_STATE_SECRET: z.string().min(32),
  RECOVERY_KEY_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_REDIRECT_URI: z.string().url().default("http://localhost:3000/auth/google/callback"),
  FRONTEND_URL: z.string().url().default("http://localhost:3001"),
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  MAIL_FROM: z.string().optional().default(""),
  GMAIL_SCRIPT_URL: z.string().url().optional().or(z.literal("")).default(""),
  EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().positive().default(24)
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const details = result.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${details}`);
}

if (Boolean(result.data.GOOGLE_CLIENT_ID) !== Boolean(result.data.GOOGLE_CLIENT_SECRET)) {
  throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must either both be set or both be empty.");
}

if (Boolean(result.data.SMTP_USER) !== Boolean(result.data.SMTP_PASS)) {
  throw new Error("SMTP_USER and SMTP_PASS must either both be set or both be empty.");
}

function normalizeProductionFrontendUrl(url) {
  if (!url) return url;
  return url
    .replace(/\/+$/, "")
    .replace(
      /^https:\/\/trimmer1-[a-z0-9-]+-dua-rizwan-s-projects\.vercel\.app$/i,
      "https://trimmer1-three.vercel.app"
    );
}

result.data.FRONTEND_URL = normalizeProductionFrontendUrl(result.data.FRONTEND_URL);
if (result.data.CORS_ORIGIN) {
  result.data.CORS_ORIGIN = normalizeProductionFrontendUrl(result.data.CORS_ORIGIN);
}

module.exports = { env: result.data };
