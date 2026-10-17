import { encryptShareCode, decryptShareCode } from "./shareLinkEncryption.js";
import { markPublicSnapshotDirty } from "./publicSnapshotSync.js";
import { generateStaticShareCode, getTokenExpiryIso, sha256 } from "./contentAccessUtils.js";

export async function listStaticShareLinks(env, resource) {
  const rows = await env.DB.prepare(`
    SELECT id, token_hint, encrypted_token, expires_at, revoked_at FROM static_share_links
    WHERE resource = ? ORDER BY id DESC LIMIT 100
  `).bind(resource).all();
  return Promise.all((rows.results || []).map(async (row) => ({
    token: row.encrypted_token ? await decryptShareCode(env, row.encrypted_token, resource) : null,
    id: Number(row.id),
    hint: row.token_hint,
    expiresAt: row.expires_at,
    active: !row.revoked_at && (!row.expires_at || Date.parse(row.expires_at) > Date.now()),
  })));
}

export async function createStaticShareLink(env, resource, ttlMinutes) {
  const token = generateStaticShareCode();
  const hash = await sha256(token);
  const hint = `S:${token.slice(0, 4)}…${token.slice(-4)}`;
  const expiresAt = getTokenExpiryIso(ttlMinutes);
  const encryptedToken = await encryptShareCode(env, token, resource);
  const result = await env.DB.prepare(`
    INSERT INTO static_share_links (resource, token_hash, token_hint, expires_at, encrypted_token)
    VALUES (?, ?, ?, ?, ?)
  `).bind(resource, hash, hint, expiresAt, encryptedToken).run();
  await markPublicSnapshotDirty(env);
  return { token, tokenId: Number(result.meta.last_row_id) };
}

export async function revokeStaticShareLink(env, resource, id) {
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId < 1) {
    throw new Error("INVALID_CONTENT_TOKEN");
  }
  await env.DB.prepare(`
    UPDATE static_share_links SET revoked_at = COALESCE(revoked_at, ?)
    WHERE id = ? AND resource = ?
  `).bind(new Date().toISOString(), numericId, resource).run();
  await markPublicSnapshotDirty(env);
}
