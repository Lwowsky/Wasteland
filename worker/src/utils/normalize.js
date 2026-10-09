export function normalizeText(value) {
  return String(value ?? "").trim();
}

export function normalizeIso(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
