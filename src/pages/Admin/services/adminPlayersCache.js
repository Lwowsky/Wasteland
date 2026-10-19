// Sensitive admin table cache. Never use localStorage: sessionStorage survives
// F5 but is tab-scoped and is discarded on explicit logout.
// Importantly, the hook can read this ONLY after AdminRoute verifies access.
const PREFIX = "wasteland-admin-players-v1:";
const CHECK_PREFIX = "wasteland-admin-players-checked-v1:";
import { getPublicCycleCloseAtMs } from "../../../../shared/registrationCycle.js";
import { DEFAULT_WASTELAND_DURATION_HOURS } from "../../../../shared/registrationConfig.js";

const MAX_CACHE_AGE_MS = 30 * 60 * 1000;

export function isAdminRosterPastDeadline(period, now = Date.now()) {
  if (!period) return false;
  let endMs = Date.parse(period.wastelandEndAt || "");
  if (!Number.isFinite(endMs)) {
    // Legacy cached period responses may not have an explicit event end.
    // Infer the fixed 24-hour event from its start or automatic cycle key,
    // so F5 cannot briefly resurrect an expired roster from sessionStorage.
    const start = period.wastelandStartAt ||
      (String(period.cycleKey || "").startsWith("auto:")
        ? String(period.cycleKey).slice(5)
        : "");
    const startMs = Date.parse(start);
    if (Number.isFinite(startMs)) {
      endMs = startMs + DEFAULT_WASTELAND_DURATION_HOURS * 60 * 60 * 1000;
    }
  }
  return Number.isFinite(endMs) && now >= getPublicCycleCloseAtMs(endMs);
}

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
      (cached.period && !Number.isSafeInteger(Number(cached.period.id))) ||
      isAdminRosterPastDeadline(cached.period, now) ||
      // Once the next Friday opens, never reuse an idle-cycle snapshot.
      (!cached.period && cached.nextOpensAt && now >= Date.parse(cached.nextOpensAt))
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

// Only the timestamp is persisted, never shared between users. Keeping it in
// sessionStorage makes F5 inexpensive while preserving tab-scoped admin data.
export function readAdminPlayersCheckAt(identity) {
  if (!identity) return 0;
  try {
    const value = Number(storage()?.getItem(`${CHECK_PREFIX}${identity}`));
    return Number.isSafeInteger(value) && value > 0 ? value : 0;
  } catch { return 0; }
}

export function markAdminPlayersCheckAt(identity, at = Date.now()) {
  if (!identity || !Number.isSafeInteger(at) || at <= 0) return;
  try { storage()?.setItem(`${CHECK_PREFIX}${identity}`, String(at)); }
  catch { /* Browser storage may be unavailable or over quota. */ }
}

export function clearAdminPlayersCache() {
  const target = storage();
  if (!target) return;
  try {
    for (let i = target.length - 1; i >= 0; i -= 1) {
      const name = target.key(i);
      if (name?.startsWith(PREFIX) || name?.startsWith(CHECK_PREFIX)) target.removeItem(name);
    }
  } catch { /* Do not block logout if storage is inaccessible. */ }
}

export function mergeAdminRegistrationChanges(previous, { upserts = [], deletes = [] }) {
  const byId = new Map(previous.map((row) => [String(row.id), row]));
  for (const id of deletes) byId.delete(String(id));
  for (const row of upserts) byId.set(String(row.id), row);
  return [...byId.values()].sort((a, b) => Number(b.id) - Number(a.id));
}
