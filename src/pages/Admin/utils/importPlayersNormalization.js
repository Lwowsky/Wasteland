import {
  HEADER_ALIASES,
  NO_VALUES,
  SHIFT_ALIASES,
  TROOP_ALIASES,
  YES_VALUES,
} from "./importPlayersConfig.js";

export function clean(value) {
  return String(value ?? "").trim();
}

export function normalizedKey(value) {
  return clean(value).toLocaleLowerCase().replace(/\s+/g, " ");
}

export function normalizedCompact(value) {
  return normalizedKey(value).replace(/[\s_-]+/g, "");
}

export function makeImportValueKey(value) {
  return normalizedKey(value);
}

export function makeImportNicknameKey(value) {
  return String(value || "").trim().toLocaleLowerCase();
}

export function matchHeader(header) {
  const key = normalizedKey(header);
  const compact = normalizedCompact(header);

  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (
      aliases.some(
        (alias) =>
          normalizedKey(alias) === key || normalizedCompact(alias) === compact,
      )
    ) {
      return field;
    }
  }

  return null;
}

export function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  const parsed = Number(clean(value).replace(/[\s,]+/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

export function normalizeImportBoolean(value) {
  if (typeof value === "boolean") return value ? "true" : "false";

  const normalized = normalizedKey(value);
  if (YES_VALUES.has(normalized)) return "true";
  if (NO_VALUES.has(normalized)) return "false";
  return "";
}

function normalizeAliasedValue(value, aliases) {
  const key = normalizedKey(value);
  const direct = aliases.get(key);
  if (direct) return direct;

  const parts = key
    .split(/[/|;,]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    const matched = aliases.get(part);
    if (matched) return matched;
  }

  return key;
}

export function normalizeImportTroop(value) {
  return normalizeAliasedValue(value, TROOP_ALIASES);
}

export function normalizeImportShift(value) {
  return normalizeAliasedValue(value, SHIFT_ALIASES);
}

export function normalizeImportTier(value) {
  let raw = clean(value).toUpperCase().replace(/[\s_-]+/g, "");
  if (!raw) return "";

  raw = raw
    .replace(/^(?:ТІР|ТИР|TIER)/u, "T")
    .replace(/^Т/u, "T");

  const match = raw.match(/^T?(\d{1,2})$/);
  return match ? `T${Number(match[1])}` : raw;
}

