export function readSessionCache(key, ttlMs) {
  try {
    const raw = sessionStorage.getItem(key);

    if (!raw) {
      return null;
    }

    const cached = JSON.parse(raw);

    if (!cached?.savedAt || Date.now() - cached.savedAt > ttlMs) {
      sessionStorage.removeItem(key);
      return null;
    }

    return cached.value ?? null;
  } catch {
    return null;
  }
}

export function writeSessionCache(key, value) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        savedAt: Date.now(),
        value,
      }),
    );
  } catch {
    // Storage is optional; the network response remains usable.
  }
}

export function removeSessionCache(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore unavailable storage.
  }
}
