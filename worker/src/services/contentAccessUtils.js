export const CONTENT_ACCESS_RESOURCES = ["players", "final_plan"];
export const CONTENT_ACCESS_MODES = ["public", "private", "link"];

const DEFAULT_ACCESS = { mode: "private", tokenTtlMinutes: 0 };


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

// 12 cryptographically random bytes -> 16 URL-safe characters (96-bit entropy).
// This code is a public-view capability only, NEVER an admin credential.
export function generateStaticShareCode() {
  return base64Url(randomBytes(12));
}

/** Token TTL: 0 means no expiry; a positive value is measured in minutes. */
export function getTokenExpiryIso(minutes, nowMs = Date.now()) {
  return minutes ? new Date(nowMs + minutes * 60_000).toISOString() : null;
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
    tokenTtlMinutes: Math.max(
      0,
      Number(row?.token_ttl_minutes ?? DEFAULT_ACCESS.tokenTtlMinutes),
    ),
    updatedAt: row?.updated_at || null,
  };
}

