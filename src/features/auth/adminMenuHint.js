// A UI-only hint, not proof of authorization. AdminRoute still validates
// access against Firebase/Worker on every actual admin navigation.
const STORAGE_KEY = "wasteland-admin-menu-hint-v1";
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export function hasAdminMenuHint() {
  try {
    const entry = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    const age = Date.now() - entry?.verifiedAt;

    return (
      entry?.allowed === true &&
      Number.isFinite(age) &&
      age >= 0 &&
      age < MAX_AGE_MS
    );
  } catch {
    return false;
  }
}

export function setAdminMenuHint(allowed) {
  try {
    if (allowed === true) {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ allowed: true, verifiedAt: Date.now() }),
      );
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Private browsing or unavailable storage must not prevent login/logout.
  }
}
