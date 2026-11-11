const test = require("node:test");
const assert = require("node:assert/strict");
const { usernameBase } = require("../src/utils/username");
const { passwordSchema } = require("../src/utils/password");

test("Google name suggestions are normalized to allowed username characters", () => {
  assert.equal(usernameBase("Zoë Example"), "zoe.example");
});

test("empty or punctuation-only name suggestions have a valid fallback", () => {
  assert.equal(usernameBase("..."), "user");
});

test("password policy requires a letter, number, special character, and 8 characters", () => {
  assert.equal(passwordSchema.safeParse("Strong!Pass123").success, true);
  assert.equal(passwordSchema.safeParse("short!1").success, false);
  assert.equal(passwordSchema.safeParse("NoNumber!").success, false);
  assert.equal(passwordSchema.safeParse("NoSpecial123").success, false);
});
