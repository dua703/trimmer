const test = require("node:test");
const assert = require("node:assert/strict");
const { isValidDateOfBirth, nameSchema, optionalNameSchema } = require("../src/utils/validation");

test("person names allow letters and spaces but reject numbers and punctuation", () => {
  assert.equal(nameSchema.safeParse("Amina Noor").success, true);
  assert.equal(nameSchema.safeParse("Zoë").success, true);
  assert.equal(nameSchema.safeParse("Amina2").success, false);
  assert.equal(nameSchema.safeParse("Amina-Khan").success, false);
  assert.equal(optionalNameSchema.safeParse("").success, true);
  assert.equal(optionalNameSchema.safeParse("Noor Ali").success, true);
  assert.equal(optionalNameSchema.safeParse("Noor 2").success, false);
});

test("date of birth must be valid and at least 16 years ago", () => {
  const today = new Date("2026-10-27T12:00:00.000Z");
  assert.equal(isValidDateOfBirth("2010-10-27", today), true);
  assert.equal(isValidDateOfBirth("2010-10-28", today), false);
  assert.equal(isValidDateOfBirth("2025-01-01", today), false);
  assert.equal(isValidDateOfBirth("2000-02-30", today), false);
});
