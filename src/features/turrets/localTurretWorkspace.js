/** Browser-only working copy. Never changes registration rows or the published plan. */
const SCHEMA = 1;
export const TURRET_WORKSPACE_PREFIX = "wasteland:turret-workspace:v1:";

export function getTurretWorkspaceKey(periodId, userId) {
  const id = Number(periodId);
  if (!Number.isSafeInteger(id) || id <= 0 || !String(userId || "").trim()) return null;
  return `${TURRET_WORKSPACE_PREFIX}${encodeURIComponent(String(userId))}:${id}`;
}

export function isTurretPlanDirty(settings, assignments, serverSnapshot) {
  return JSON.stringify({ settings, assignments }) !==
    JSON.stringify({ settings: serverSnapshot.settings, assignments: serverSnapshot.assignments });
}

// Only fields that can alter planner eligibility or capacity, not cosmetic table columns.
// A replacement/import in the same period must trigger a fresh review of local assignments.
export function getTurretRosterFingerprint(rows) {
  const players = (Array.isArray(rows) ? rows : []).map((p) => [
    String(p?.id ?? ""), String(p?.nickname ?? ""), String(p?.shift ?? ""), p?.captain === true,
    String(p?.troopType ?? ""), String(p?.tier ?? ""),
    Number(p?.marchSize || 0), Number(p?.rallySize || 0), String(p?.alliance ?? ""),
  ]).sort((a, b) => a[0].localeCompare(b[0]));
  const source = JSON.stringify(players);
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${players.length}:${(hash >>> 0).toString(36)}`;
}

function resolveStorage(storage) {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

/** Invalid old/corrupt entries are ignored, never loaded into the editor. */
export function readTurretWorkspace(periodId, userId, storage) {
  const key = getTurretWorkspaceKey(periodId, userId);
  if (!key) return null;
  try {
    const entry = resolveStorage(storage)?.getItem(key);
    if (!entry) return null;
    const record = JSON.parse(entry);
    if (record?.schema !== SCHEMA || Number(record.periodId) !== Number(periodId) ||
      !Number.isSafeInteger(record.baseRevision) || record.baseRevision < 0 ||
      !record.settings || typeof record.settings !== "object" ||
      !record.assignments || !record.assignments.shifts || typeof record.assignments.shifts !== "object" ||
      typeof record.dirty !== "boolean") return null;
    return record;
  } catch { return null; }
}

export function writeTurretWorkspace(periodId, userId, value, storage) {
  const key = getTurretWorkspaceKey(periodId, userId);
  if (!key) return false;
  try {
    const target = resolveStorage(storage);
    if (!target) return false;
    target.setItem(key, JSON.stringify({ ...value, schema: SCHEMA, periodId: Number(periodId),
      updatedAt: Date.now() }));
    return true;
  } catch { return false; } // quota exceeded, private browsing, unavailable storage
}

export function removeTurretWorkspace(periodId, userId, storage) {
  const key = getTurretWorkspaceKey(periodId, userId);
  if (!key) return false;
  try { resolveStorage(storage)?.removeItem(key); return true; }
  catch { return false; }
}

/** Keep unsynced local edits; a changed remote revision requires explicit resolution. */
export function resolveTurretWorkspace(serverSnapshot, remoteRevision, localRecord) {
  if (!localRecord?.dirty) return { snapshot: serverSnapshot, conflict: false, restored: false };
  const snapshot = { settings: localRecord.settings, assignments: localRecord.assignments };
  if (JSON.stringify(snapshot) === JSON.stringify(serverSnapshot)) {
    return { snapshot: serverSnapshot, conflict: false, restored: false };
  }
  return {
    snapshot,
    conflict: localRecord.baseRevision !== remoteRevision,
    restored: true,
  };
}
