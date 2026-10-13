export function normalizeNickname(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function toInt(value) {
  const number = Number(value);

  return Number.isFinite(number) ? Math.trunc(number) : 0;
}

export function boolToInt(value) {
  return value === true ? 1 : 0;
}

export function parseObjectJson(value, fallback = {}) {
  try {
    const parsed = JSON.parse(value || "{}");

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : fallback;
  } catch {
    return fallback;
  }
}

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
