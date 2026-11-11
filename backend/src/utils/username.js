function usernameBase(value) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, ".");

  const compact = normalized.replace(/[._]{2,}/g, ".");
  const valid = compact.replace(/^[._]+|[._]+$/g, "");
  return (valid || "user").slice(0, 25);
}

async function createUniqueUsername(User, name) {
  const base = usernameBase(name);
  let candidate = base;
  let suffix = 2;

  while (await User.exists({ username: candidate })) {
    const suffixText = String(suffix++);
    candidate = `${base.slice(0, 30 - suffixText.length)}${suffixText}`;
  }

  return candidate;
}

module.exports = { createUniqueUsername, usernameBase };
