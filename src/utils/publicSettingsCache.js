import {
  readSessionCache,
  removeSessionCache,
  writeSessionCache,
} from "./sessionCache.js";

// Public settings only. Never use this cache for content-access sessions,
// authentication, authorization decisions or private/admin API responses.
const STORAGE_PREFIX = "wasteland-public-settings-cache-v1:";
const inflight = new Map();

function storageKey(key) {
  return `${STORAGE_PREFIX}${key}`;
}

function readCrossTabCache(key, ttlMs) {
  try {
    const cached = JSON.parse(localStorage.getItem(storageKey(key)));
    const age = Date.now() - Number(cached?.savedAt);
    if (
      cached &&
      Number.isFinite(cached.savedAt) &&
      age >= 0 &&
      age <= ttlMs &&
      cached.value &&
      typeof cached.value === "object"
    ) {
      return cached.value;
    }
  } catch {
    // Storage can be disabled; use the original per-tab session cache.
  }
  return null;
}

function writeCrossTabCache(key, value) {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify({
      savedAt: Date.now(),
      value,
    }));
  } catch {
    // Browser storage is optional.
  }
}

export function clearPublicSettingsCache(key) {
  removeSessionCache(key);
  try {
    localStorage.removeItem(storageKey(key));
  } catch {
    // Browser storage is optional.
  }
}

export async function loadPublicSettings({ key, ttlMs, force = false, load }) {
  if (!force) {
    const cached = readSessionCache(key, ttlMs) || readCrossTabCache(key, ttlMs);
    if (cached) return cached;
  }

  // Concurrent React effects and multiple callers share one API request.
  if (inflight.has(key)) return inflight.get(key);

  const pending = Promise.resolve()
    .then(load)
    .then((result) => {
      writeSessionCache(key, result);
      writeCrossTabCache(key, result);
      return result;
    })
    .finally(() => {
      if (inflight.get(key) === pending) inflight.delete(key);
    });

  inflight.set(key, pending);
  return pending;
}
