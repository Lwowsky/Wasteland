// Sensitive admin table cache. Never use localStorage: sessionStorage survives
// F5 but is tab-scoped and is discarded on explicit logout.
// Importantly, the hook can read this ONLY after AdminRoute verifies access.
const PREFIX = "wasteland-admin-players-v1:";
const MAX_CACHE_AGE_MS = 30 * 60 * 1000;

function storage() {
  try { return window.sessionStorage; } catch { return null; }
}

function key(identity) {
  return `${PREFIX}${identity}`;
}

export function readAdminPlayersCache(identity, now = Date.now()) {
  if (!identity) return null;
  try {
    const cached = JSON.parse(storage()?.getItem(key(identity)) || "null");
    if (
      !cached || !Array.isArray(cached.players) ||
      !Number.isSafeInteger(cached.cursor) || cached.cursor < 0 ||
      !Number.isFinite(cached.savedAt) ||
      now - cached.savedAt < 0 || now - cached.savedAt > MAX_CACHE_AGE_MS ||
      (cached.period && !Number.isSafeInteger(Number(cached.period.id)))
    ) return null;
    return cached;
  } catch { return null; }
}

export function writeAdminPlayersCache(identity, data, now = Date.now()) {
  if (!identity) return;
  try {
    storage()?.setItem(key(identity), JSON.stringify({ ...data, savedAt: now }));
  } catch { /* Browser storage may be disabled or over quota. */ }
}

export function clearAdminPlayersCache() {
  const target = storage();
  if (!target) return;
  try {
    for (let i = target.length - 1; i >= 0; i -= 1) {
      const name = target.key(i);
      if (name?.startsWith(PREFIX)) target.removeItem(name);
    }
  } catch { /* Do not block logout if storage is inaccessible. */ }
}

export function mergeAdminRegistrationChanges(previous, { upserts = [], deletes = [] }) {
  const byId = new Map(previous.map((row) => [String(row.id), row]));
  for (const id of deletes) byId.delete(String(id));
  for (const row of upserts) byId.set(String(row.id), row);
  return [...byId.values()].sort((a, b) => Number(b.id) - Number(a.id));
}
