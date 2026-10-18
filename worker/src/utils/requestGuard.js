import { json } from "./response.js";

// Cloudflare's per-colo rate-limit binding counts BEFORE any D1 query.
// A rejected call still counts as a Worker invocation, but costs no D1 rows.
// Per-IP buckets protect unauthenticated endpoints against trivial UA rotation.
// Legitimate users behind shared NATs are limited together; edge limits are
// approximate per location rather than globally consistent.
const ROUTES = Object.freeze({
  registration: { binding: "REGISTRATION_RATE_LIMIT", maxBytes: 24_576 },
  sharedLogin: { binding: "SHARED_LOGIN_RATE_LIMIT", maxBytes: 1_024 },
  accessActivation: { binding: "ACCESS_ACTIVATION_RATE_LIMIT", maxBytes: 1_024 },
});

export async function guardSensitiveRequest(request, env, kind) {
  const config = ROUTES[kind];
  if (!config) throw new Error("UNKNOWN_RATE_LIMIT_ROUTE");
  const limiter = env[config.binding];
  if (!limiter || typeof limiter.limit !== "function") {
    // Misconfigured deploy must never quietly make public auth endpoints unlimited.
    return json({ success: false, error: "RATE_LIMIT_NOT_CONFIGURED" }, 503,
      { "Cache-Control": "no-store" });
  }
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > config.maxBytes) {
    return json({ success: false, error: "REQUEST_TOO_LARGE" }, 413,
      { "Cache-Control": "no-store" });
  }
  const address = request.headers.get("CF-Connecting-IP") || "unknown";
  const identity = new TextEncoder().encode(address);
  const digest = await crypto.subtle.digest("SHA-256", identity);
  const hex = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
  try {
    const outcome = await limiter.limit({ key: `${kind}:${hex}` });
    if (!outcome.success) {
      return json({ success: false, error: "RATE_LIMITED" }, 429,
        { "Retry-After": "60", "Cache-Control": "no-store" });
    }
  } catch {
    return json({ success: false, error: "RATE_LIMIT_UNAVAILABLE" }, 503,
      { "Cache-Control": "no-store" });
  }
  return null;
}


// Read small public POST bodies once and refuse oversized chunked payloads
// without ever buffering an unbounded request. Handlers receive a fresh Request
// with identical credentials/method and the validated body.
export async function readBoundedSensitiveRequest(request, kind) {
  const config = ROUTES[kind];
  if (!config) throw new Error("UNKNOWN_RATE_LIMIT_ROUTE");
  const reader = request.body?.getReader();
  if (!reader) return request;
  const parts = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > config.maxBytes) {
        // Stop reading immediately, including for chunked or forged lengths.
        reader.cancel().catch(() => {});
        return json({ success: false, error: "REQUEST_TOO_LARGE" }, 413,
          { "Cache-Control": "no-store" });
      }
      parts.push(value);
    }
  } catch {
    return json({ success: false, error: "INVALID_REQUEST_BODY" }, 400,
      { "Cache-Control": "no-store" });
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  return new Request(request, { headers, body: bytes });
}
