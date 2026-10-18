import { json } from "../utils/response.js";
import { verifyAdminRequest } from "./adminAuth.js";
import { getRegistrationSettings } from "../db/registrationSettings.js";
import { getPublicDisplayPeriod } from "../db/periods.js";
import { PERMISSIONS } from "../../../src/features/auth/permissions.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (value) => new Uint8Array(value.match(/.{2}/g).map((pair) => parseInt(pair, 16)));
const now = () => Math.floor(Date.now() / 1000);
async function digest(value) { return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)))); }
function secret() { return hex(crypto.getRandomValues(new Uint8Array(32))); }
function keyMaterial(env) {
  const raw = env.SHARED_CONSUL_ENCRYPTION_KEY;
  if (typeof raw !== "string" || !/^[a-f0-9]{64}$/i.test(raw)) throw new Error("ENCRYPTION_KEY_NOT_CONFIGURED");
  return crypto.subtle.importKey("raw", fromHex(raw), "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encrypt(value, env) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyMaterial(env);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(value));
  return { encrypted: hex(new Uint8Array(cipher)), iv: hex(iv) };
}
async function decrypt(record, env) {
  const key = await keyMaterial(env);
  return decoder.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromHex(record.iv) }, key, fromHex(record.encrypted_secret)));
}
const noStore = { "Cache-Control": "no-store" };
const success = (payload) => json({ success: true, ...payload }, 200, noStore);
const failure = (error, status = 400) => json({ success: false, error }, status, noStore);

export const SHARED_ALLOWED = new Set([
  PERMISSIONS.VIEW_PLAYERS, PERMISSIONS.EDIT_PLAYERS, PERMISSIONS.DELETE_PLAYERS,
  PERMISSIONS.IMPORT_PLAYERS, PERMISSIONS.VIEW_DISTRIBUTION, PERMISSIONS.EDIT_DISTRIBUTION,
  PERMISSIONS.VIEW_SETTINGS,
]);
export const sharedPermissions = () => Object.fromEntries(Object.values(PERMISSIONS).map((permission) => [permission, SHARED_ALLOWED.has(permission)]));
const principal = () => ({ ok: true, uid: "shared-consul", role: "consul", displayName: "Shared consul", email: "", permissions: sharedPermissions(), canEditDistribution: true, shared: true });

export async function sharedConsulAuth(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer shared_")) return null;
  const token = authorization.slice(7);
  if (token.length > 256) return { ok: false, status: 401, error: "INVALID_SESSION" };
  const hash = await digest(token);
  const fresh = await env.DB.prepare(`SELECT s.expires_at, c.expires_at AS key_expiry, c.revoked_at
    FROM shared_consul_sessions_v2 s JOIN shared_consul_credentials c ON c.id = s.credential_id
    WHERE s.token_hash = ?`).bind(hash).first();
  const timestamp = now();
  if (fresh) {
    if (fresh.expires_at > timestamp && !fresh.revoked_at && (fresh.key_expiry == null || fresh.key_expiry > timestamp)) return principal();
    return { ok: false, status: 401, error: "INVALID_SESSION" };
  }
  // Compatibility: previous Stage 042 password sessions remain valid until their own expiry.
  const legacy = await env.DB.prepare(`SELECT s.expires_at, s.generation, k.expires_at AS key_expiry, k.generation AS current_generation
    FROM shared_consul_sessions s JOIN shared_consul_keys k ON k.id = 1 WHERE s.token_hash = ?`).bind(hash).first();
  if (legacy?.expires_at > timestamp && (legacy.key_expiry == null || legacy.key_expiry > timestamp) && legacy.generation === legacy.current_generation) return principal();
  return { ok: false, status: 401, error: "INVALID_SESSION" };
}

export async function handleSharedLogin(request, env) {
  const { password } = await request.json().catch(() => ({}));
  if (typeof password !== "string" || password.length < 32 || password.length > 150) return failure("INVALID_PASSWORD", 401);
  const hash = await digest(password);
  const timestamp = now();
  // Correct repeated login in the SAME browser reuses the active credential
  // session. It still checks the supplied password hash and revocation in D1;
  // it never treats a session alone as proof of a newly typed password.
  const authorization = request.headers.get("Authorization") || "";
  if (authorization.startsWith("Bearer shared_") && authorization.length <= 263) {
    const existingToken = authorization.slice(7);
    const existing = await env.DB.prepare(`SELECT s.expires_at AS session_expiry, c.expires_at AS credential_expiry
      FROM shared_consul_sessions_v2 s JOIN shared_consul_credentials c ON c.id = s.credential_id
      WHERE s.token_hash = ? AND c.secret_hash = ? AND c.revoked_at IS NULL`)
      .bind(await digest(existingToken), hash).first();
    if (existing && existing.session_expiry > timestamp &&
        (existing.credential_expiry == null || existing.credential_expiry > timestamp)) {
      return success({ token: existingToken, expiresAt: existing.session_expiry,
        credentialExpiresAt: existing.credential_expiry, role: "consul",
        permissions: sharedPermissions() });
    }
  }
  const credential = await env.DB.prepare(`SELECT id, expires_at, revoked_at FROM shared_consul_credentials WHERE secret_hash = ?`).bind(hash).first();
  if (credential && !credential.revoked_at && (credential.expires_at == null || credential.expires_at > timestamp)) {
    const token = `shared_${secret()}`;
    const expiresAt = Math.min(timestamp + 12 * 3600, credential.expires_at ?? Infinity);
    await env.DB.prepare(`INSERT INTO shared_consul_sessions_v2(token_hash,credential_id,expires_at,created_at) VALUES (?,?,?,?)`)
      .bind(await digest(token), credential.id, expiresAt, timestamp).run();
    return success({ token, expiresAt, credentialExpiresAt: credential.expires_at, role: "consul", permissions: sharedPermissions() });
  }
  if (credential) return failure("INVALID_PASSWORD", 401);
  // Legacy Stage 042 password remains usable even before an owner migrates to new keys.
  const old = await env.DB.prepare("SELECT secret_hash, generation, expires_at FROM shared_consul_keys WHERE id = 1").first();
  if (!old || old.secret_hash !== hash || (old.expires_at != null && old.expires_at <= timestamp)) return failure("INVALID_PASSWORD", 401);
  const token = `shared_${secret()}`;
  const expiresAt = Math.min(timestamp + 12 * 3600, old.expires_at ?? Infinity);
  await env.DB.prepare("INSERT INTO shared_consul_sessions(token_hash,generation,expires_at,created_at) VALUES (?,?,?,?)")
    .bind(await digest(token), old.generation, expiresAt, timestamp).run();
  return success({ token, expiresAt, credentialExpiresAt: old.expires_at, role: "consul", permissions: sharedPermissions() });
}
export async function handleSharedStatus(request, env) {
  const auth = await sharedConsulAuth(request, env);
  return auth?.ok ? success({ admin: auth }) : failure("INVALID_SESSION", 401);
}

async function validExpiry(duration, env, timestamp) {
  if (duration === "forever") return null;
  if (duration === "day") return timestamp + 86400;
  if (duration !== "wasteland") throw new Error("INVALID_DURATION");
  const settings = await getRegistrationSettings(env);
  const period = await getPublicDisplayPeriod(env, settings);
  const date = period?.wasteland_end_at;
  const expiry = date ? Math.floor(new Date(date).getTime() / 1000) : NaN;
  if (!Number.isFinite(expiry) || expiry <= timestamp) throw new Error("NO_WASTELAND_END");
  return expiry;
}
async function ownerOnly(request, env) {
  const admin = await verifyAdminRequest(request, env);
  return admin.ok && admin.role === "owner" ? null : failure(admin.ok ? "FORBIDDEN" : admin.error, admin.ok ? 403 : admin.status);
}
const summary = (row) => ({ id: row.id, label: row.label, createdAt: row.created_at, expiresAt: row.expires_at, revokedAt: row.revoked_at });
export async function handleSharedManage(request, env) {
  const denied = await ownerOnly(request, env);
  if (denied) return denied;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const timestamp = now();
  if (request.method === "GET") {
    const { results } = await env.DB.prepare("SELECT id,label,created_at,expires_at,revoked_at FROM shared_consul_credentials ORDER BY created_at DESC").all();
    const legacy = await env.DB.prepare("SELECT created_at,expires_at FROM shared_consul_keys WHERE id=1").first();
    return success({ credentials: results.map(summary), legacy: legacy ? { createdAt: legacy.created_at, expiresAt: legacy.expires_at, recoverable: false } : null });
  }
  if (request.method === "DELETE") {
    if (id === "legacy") {
      await env.DB.batch([env.DB.prepare("DELETE FROM shared_consul_sessions"), env.DB.prepare("DELETE FROM shared_consul_keys")]);
      return success({});
    }
    if (!id) return failure("INVALID_ID");
    if (url.searchParams.get("purge") === "1") {
      // History-only deletion. Active credentials must be revoked first, which also ends their sessions.
      const eligible = await env.DB.prepare(`SELECT id FROM shared_consul_credentials
        WHERE id=? AND (revoked_at IS NOT NULL OR (expires_at IS NOT NULL AND expires_at<=?))`)
        .bind(id, timestamp).first();
      if (!eligible) return failure("ACTIVE_KEY_CANNOT_BE_DELETED", 409);
      await env.DB.batch([
        env.DB.prepare("DELETE FROM shared_consul_sessions_v2 WHERE credential_id=?").bind(id),
        env.DB.prepare(`DELETE FROM shared_consul_credentials
          WHERE id=? AND (revoked_at IS NOT NULL OR (expires_at IS NOT NULL AND expires_at<=?))`).bind(id, timestamp),
      ]);
      return success({});
    }
    const row = await env.DB.prepare("SELECT id FROM shared_consul_credentials WHERE id=? AND revoked_at IS NULL").bind(id).first();
    if (!row) return failure("NOT_FOUND", 404);
    await env.DB.batch([
      env.DB.prepare("UPDATE shared_consul_credentials SET revoked_at=? WHERE id=?").bind(timestamp, id),
      env.DB.prepare("DELETE FROM shared_consul_sessions_v2 WHERE credential_id=?").bind(id),
    ]);
    return success({});
  }
  if (request.method !== "POST") return failure("METHOD_NOT_ALLOWED", 405);
  const body = await request.json().catch(() => ({}));
  if (body.action === "reveal") {
    const row = await env.DB.prepare("SELECT * FROM shared_consul_credentials WHERE id=? AND revoked_at IS NULL").bind(body.id).first();
    if (!row) return failure("NOT_FOUND", 404);
    try { return success({ password: await decrypt(row, env) }); } catch { return failure("DECRYPTION_FAILED", 503); }
  }
  if (body.action === "extend") {
    const row = await env.DB.prepare("SELECT id FROM shared_consul_credentials WHERE id=? AND revoked_at IS NULL").bind(body.id).first();
    if (!row) return failure("NOT_FOUND", 404);
    let expiry;
    try { expiry = await validExpiry(body.duration, env, timestamp); } catch (error) { return failure(error.message, 409); }
    const updated = await env.DB.prepare(`UPDATE shared_consul_credentials SET expires_at=? WHERE id=? AND revoked_at IS NULL
      AND (SELECT COUNT(*) FROM shared_consul_credentials WHERE id<>? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>?))
        + (SELECT COUNT(*) FROM shared_consul_keys WHERE id=1 AND (expires_at IS NULL OR expires_at>?)) < 5`)
      .bind(expiry, body.id, body.id, timestamp, timestamp).run();
    if (!updated.meta?.changes) return failure("MAX_ACTIVE_KEYS", 409);
    return success({ expiresAt: expiry });
  }
  if (body.action !== "create" || typeof body.label !== "string" || !body.label.trim() || body.label.trim().length > 60) return failure("INVALID_REQUEST");
  let expiry;
  try { expiry = await validExpiry(body.duration, env, timestamp); } catch (error) { return failure(error.message, 409); }
  // Serial writes are eventually consistent across requests: enforce limit also with D1 atomic conditional INSERT.
  const password = secret();
  let encrypted;
  try { encrypted = await encrypt(password, env); } catch { return failure("ENCRYPTION_KEY_NOT_CONFIGURED", 503); }
  const idNew = crypto.randomUUID();
  const inserted = await env.DB.prepare(`INSERT INTO shared_consul_credentials (id,label,secret_hash,encrypted_secret,iv,expires_at,created_at)
    SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM shared_consul_credentials WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?)) + (SELECT COUNT(*) FROM shared_consul_keys WHERE id=1 AND (expires_at IS NULL OR expires_at > ?)) < 5`)
    .bind(idNew, body.label.trim(), await digest(password), encrypted.encrypted, encrypted.iv, expiry, timestamp, timestamp, timestamp).run();
  if (!inserted.meta?.changes) return failure("MAX_ACTIVE_KEYS", 409);
  return success({ password, credential: { id: idNew, label: body.label.trim(), createdAt: timestamp, expiresAt: expiry, revokedAt: null } });
}


// Existing daily cron. No scans of registered players. Indexes on token_hash
// continue to make authentication targeted; this only reclaims expired sessions.
export async function cleanupSharedConsulSessions(env, timestamp = now()) {
  if (!env.DB) return;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM shared_consul_sessions_v2 WHERE expires_at <= ?").bind(timestamp),
    env.DB.prepare("DELETE FROM shared_consul_sessions WHERE expires_at <= ?").bind(timestamp),
  ]);
}
