// Stage 8: a durable, coalesced D1 outbox for a SECOND GitHub Pages repository.
// Requests for public JSON never use this service; only writes and scheduled jobs do.
const DISPATCH_COOLDOWN_MS = 2 * 60_000;
const RETRY_AFTER_MS = 4 * 60_000;
const GITHUB_API_VERSION = "2022-11-28";

export function hasPublicSnapshotAccess(request, env) {
  const configured = String(env.PUBLIC_SNAPSHOT_EXPORT_TOKEN || "");
  const supplied = request.headers.get("Authorization") || "";
  const expected = `Bearer ${configured}`;
  if (!configured || supplied.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  }
  return diff === 0;
}

export async function markPublicSnapshotDirty(env) {
  await env.DB.prepare(`
    UPDATE public_snapshot_sync
    SET revision = revision + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run();
}

export async function getPublicSnapshotRevision(env) {
  const row = await env.DB.prepare(
    "SELECT revision FROM public_snapshot_sync WHERE id = 1",
  ).first();
  if (!row) throw new Error("PUBLIC_SNAPSHOT_MIGRATION_MISSING");
  return Number(row.revision);
}

export async function acknowledgePublicSnapshot(env, revision) {
  if (!Number.isSafeInteger(revision) || revision < 1) return false;
  // Never acknowledge a newer revision than the one known by this D1 instance.
  // Stale deploys cannot move the published pointer backwards.
  await env.DB.prepare(`
    UPDATE public_snapshot_sync
    SET published_revision = MAX(published_revision, MIN(revision, ?))
    WHERE id = 1
  `).bind(revision).run();
  return true;
}

function safeRepository(raw) {
  const repository = String(raw || "").trim();
  return /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository)
    ? repository
    : null;
}

export async function dispatchPendingPublicSnapshot(env, options = {}) {
  const token = String(env.GITHUB_SNAPSHOT_DISPATCH_TOKEN || "").trim();
  const repository = safeRepository(env.GITHUB_SNAPSHOT_REPOSITORY);
  if (!token || !repository) return "unconfigured";

  const row = await env.DB.prepare(`
    SELECT revision, dispatched_revision, published_revision, last_dispatch_ms
    FROM public_snapshot_sync WHERE id = 1
  `).first();
  if (!row) throw new Error("PUBLIC_SNAPSHOT_MIGRATION_MISSING");
  const revision = Number(row.revision);
  if (Number(row.published_revision) >= revision) return "up-to-date";

  const now = options.now ?? Date.now();
  const last = Number(row.last_dispatch_ms || 0);
  const sameVersionAwaitingAck = Number(row.dispatched_revision) >= revision;
  const cooldown = sameVersionAwaitingAck ? RETRY_AFTER_MS : DISPATCH_COOLDOWN_MS;
  if (last && now - last < cooldown) return "waiting";

  const fetcher = options.fetcher || fetch;
  const response = await fetcher(`https://api.github.com/repos/${repository}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
      "User-Agent": "wasteland-public-snapshot-worker",
    },
    body: JSON.stringify({
      event_type: "public_snapshot_changed",
      client_payload: { revision },
    }),
  });
  if (response.status !== 204) {
    const details = (await response.text().catch(() => "")).slice(0, 180);
    throw new Error(`GITHUB_DISPATCH_FAILED_${response.status}: ${details}`);
  }

  // Mark a dispatch ONLY after GitHub accepts the event. A failure is retried.
  await env.DB.prepare(`
    UPDATE public_snapshot_sync
    SET dispatched_revision = MAX(dispatched_revision, ?), last_dispatch_ms = ?
    WHERE id = 1
  `).bind(revision, now).run();
  return "dispatched";
}
