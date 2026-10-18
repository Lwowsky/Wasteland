import { json } from "./response.js";

const noStore = { "Cache-Control": "no-store" };
const endpoint = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Challenge is enforced only when the Worker secret is configured. Configure
// BOTH the private Worker secret and the public site key before publishing.
export async function verifySensitiveTurnstile(request, env, expectedAction = "") {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) return null;
  if (typeof secret !== "string" || !secret.trim()) {
    return json({ success: false, error: "CHALLENGE_CONFIGURATION_ERROR" }, 503, noStore);
  }
  let body;
  try { body = await request.clone().json(); }
  catch { return json({ success: false, error: "INVALID_REQUEST_BODY" }, 400, noStore); }
  const token = body?.turnstileToken;
  if (typeof token !== "string" || token.length < 10 || token.length > 2048) {
    return json({ success: false, error: "CHALLENGE_REQUIRED" }, 403, noStore);
  }
  let result;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        remoteip: request.headers.get("CF-Connecting-IP") || "",
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("CHALLENGE_SERVICE_ERROR");
    result = await response.json();
  } catch {
    // Avoid spending D1 rows when Cloudflare challenge verification is down.
    return json({ success: false, error: "CHALLENGE_UNAVAILABLE" }, 503, noStore);
  }
  const allowHosts = String(env.TURNSTILE_ALLOWED_HOSTNAMES || "")
    .split(",").map((host) => host.trim()).filter(Boolean);
  if (result?.success !== true ||
      (expectedAction && result.action !== expectedAction) ||
      (allowHosts.length > 0 && !allowHosts.includes(result.hostname))) {
    return json({ success: false, error: "CHALLENGE_FAILED" }, 403, noStore);
  }
  return null;
}
