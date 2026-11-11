const { z } = require("zod");

const namePattern = /^[\p{L}]+(?: [\p{L}]+)*$/u;
const nameError = "Use letters and spaces only.";

const nameSchema = z.string().trim().min(1).max(60).regex(namePattern, nameError);
const optionalNameSchema = z.string().trim().max(60)
  .regex(/^(?:[\p{L}]+(?: [\p{L}]+)*)?$/u, nameError)
  .default("");

function isValidDateOfBirth(value, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;

  const latestEligibleDate = new Date(Date.UTC(
    now.getUTCFullYear() - 16,
    now.getUTCMonth(),
    now.getUTCDate()
  ));
  return date <= latestEligibleDate;
}

module.exports = { isValidDateOfBirth, nameSchema, optionalNameSchema };
