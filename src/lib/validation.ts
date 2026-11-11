export function sanitizeNameInput(value: string) {
  return value.replace(/[^\p{L} ]/gu, "").replace(/ {2,}/g, " ");
}

export function getSixteenYearsAgoDate() {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(date.getUTCFullYear() - 16);
  return date.toISOString().slice(0, 10);
}
