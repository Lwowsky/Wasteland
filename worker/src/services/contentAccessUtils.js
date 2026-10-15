export const CONTENT_ACCESS_RESOURCES = ["players", "final_plan"];
export const CONTENT_ACCESS_MODES = ["public", "private", "code", "link"];

const DEFAULT_ACCESS = {
  mode: "public",
  useLimit: 1,
  sessionMinutes: 30,
  tokenTtlMinutes: 0,
};

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function clampInteger(value, fallback, minimum, maximum) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, parsed));
}

function bytesToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value || ""));
  return bytesToHex(await crypto.subtle.digest("SHA-256", bytes));
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function base64Url(bytes) {
  let binary = "";

  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function generateAccessCode() {
  const bytes = randomBytes(10);
  const chars = Array.from(
    bytes,
    (value) => CODE_ALPHABET[value % CODE_ALPHABET.length],
  );

  return `${chars.slice(0, 5).join("")}-${chars.slice(5).join("")}`;
}

export function generateLinkToken() {
  return base64Url(randomBytes(32));
}

export function generateSessionToken() {
  return base64Url(randomBytes(32));
}

/** Token TTL: 0 means no expiry; a positive value is measured in minutes. */
export function getTokenExpiryIso(minutes, nowMs = Date.now()) {
  return minutes ? new Date(nowMs + minutes * 60_000).toISOString() : null;
}

export function normalizeCodeCandidate(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function normalizeResource(resource) {
  return CONTENT_ACCESS_RESOURCES.includes(resource) ? resource : "";
}

export function normalizeMode(mode, fallback = DEFAULT_ACCESS.mode) {
  return CONTENT_ACCESS_MODES.includes(mode) ? mode : fallback;
}

export function mapContentAccessSetting(row) {
  return {
    resource: row?.resource || "",
    mode: normalizeMode(row?.mode),
    useLimit: Math.max(0, Number(row?.use_limit ?? DEFAULT_ACCESS.useLimit)),
    sessionMinutes: Math.max(
      5,
      Number(row?.session_minutes ?? DEFAULT_ACCESS.sessionMinutes),
    ),
    tokenTtlMinutes: Math.max(
      0,
      Number(row?.token_ttl_minutes ?? DEFAULT_ACCESS.tokenTtlMinutes),
    ),
    updatedAt: row?.updated_at || null,
  };
}

function isTokenActive(row, nowMs = Date.now()) {
  if (!row || row.revoked_at) {
    return false;
  }

  if (row.expires_at) {
    const expiresAt = Date.parse(row.expires_at);

    if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) {
      return false;
    }
  }

  const useLimit = Number(row.use_limit || 0);
  const usedCount = Number(row.used_count || 0);

  return useLimit === 0 || usedCount < useLimit;
}

export function mapContentAccessToken(row) {
  if (!row) {
    return null;
  }

  const useLimit = Number(row.use_limit || 0);
  const usedCount = Number(row.used_count || 0);

  return {
    id: Number(row.id),
    kind: row.token_kind,
    hint: row.token_hint || "",
    useLimit,
    usedCount,
    remainingUses: useLimit === 0 ? null : Math.max(0, useLimit - usedCount),
    expiresAt: row.expires_at || null,
    createdAt: row.created_at || null,
    active: isTokenActive(row),
  };
}

export function getContentAccessSessionHeader(request) {
  return String(request.headers.get("X-Content-Access") || "").trim();
}
