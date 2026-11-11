const { z } = require("zod");

const passwordSchema = z.string()
  .min(8, "Password must contain at least 8 characters.")
  .max(128, "Password must contain at most 128 characters.")
  .regex(/[A-Za-z]/, "Password must contain a letter.")
  .regex(/[0-9]/, "Password must contain a number.")
  .regex(/[^A-Za-z0-9\s]/, "Password must contain a special character.");

module.exports = { passwordSchema };
