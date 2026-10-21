import { getPublicSnapshot, isPublicSnapshotEnabled } from "../players/publicSnapshot.js";
import { requestJson } from "../../utils/apiClient.js";
import { openSnapshotFromLink } from "../../../shared/sealedSnapshot.js";
import { isSnapshotForCycle, isSnapshotForActivePeriod } from "../../../shared/registrationCycle.js";

export async function getContentAccessStatus(resource) {
  // Only used when static snapshots are explicitly disabled. Protected modes
  // remain closed: the Worker never grants a public-view session.
  return requestJson(
    `/api/content-access/${resource}`,
    { cache: "no-store" },
    "CONTENT_ACCESS_REQUEST_FAILED",
  );
}

// Share capability lives only in this tab; removing it from the URL after
// verification limits its exposure to history, screenshots and referrer headers.
const SHARE_PREFIX = "wasteland-static-share-v1:";
const isShortCode = (code) => /^[a-zA-Z0-9_-]{16}$/.test(code);
function shareKey(resource) { return `${SHARE_PREFIX}${resource}`; }
export function getStaticShareCode(resource) {
  try {
    const code = sessionStorage.getItem(shareKey(resource)) || "";
    return isShortCode(code) ? code : "";
  } catch { return ""; }
}
export function clearStaticShareCode(resource) {
  try { sessionStorage.removeItem(shareKey(resource)); } catch { /* ignore */ }
}
function saveStaticShareCode(resource, code) {
  try { sessionStorage.setItem(shareKey(resource), code); } catch { /* no persistent fallback */ }
}
async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Static link-only files are public ciphertext, not public records.
// The AES key is never published. A successful ciphertext unwrap authenticates
// the 96-bit share capability without consuming a Worker request.
export async function unlockStaticShareSnapshot(resource, snapshot) {
  const code = getStaticShareCode(resource);
  const hash = code && await sha256Hex(code);
  const entry = (snapshot?.shareLinks || []).find((item) => item.hash === hash);
  if (!entry?.wrappedKey || !snapshot?.sealed) throw new Error("CONTENT_ACCESS_REQUIRED");
  return openSnapshotFromLink(resource, snapshot.sealed, entry, code);
}

export async function getPublicContentAccessHint(resource, shortCode = "", expectedCycleStartAt = "", expectedPeriodId = undefined) {
  if (!isPublicSnapshotEnabled()) return null;
  const file = resource === "players" ? "players.json" : resource === "final_plan" ? "final-plan.json" : null;
  if (!file) return null;
  try {
    const data = await getPublicSnapshot(file, { requireNetwork: true });
    // Do not accidentally reopen the prior cycle when a CDN serves yesterday's
    // encrypted JSON after the next Friday. Metadata is public, players are not.
    if (!isSnapshotForCycle(data, expectedCycleStartAt) ||
        !isSnapshotForActivePeriod(data, expectedPeriodId)) {
      return { resource, mode: "private", allowed: false, reason: "SNAPSHOT_CYCLE_MISMATCH" };
    }
    const mode = data?.accessMode;
    if (!["public", "private", "link"].includes(mode)) {
      clearStaticShareCode(resource);
      return { resource, mode: "private", allowed: false, reason: "CONTENT_PRIVATE" };
    }
    if (mode === "link") {
      const candidate = shortCode || getStaticShareCode(resource);
      if (isShortCode(candidate) && data?.sealed?.version === 1) {
        const hash = await sha256Hex(candidate);
        const entry = (data.shareLinks || []).find((item) => item.hash === hash);
        if (entry?.wrappedKey && (!entry.expiresAt || Date.parse(entry.expiresAt) > Date.now())) {
          // Verify the AEAD now; a matching hash alone does not authorize content.
          await openSnapshotFromLink(resource, data.sealed, entry, candidate);
          saveStaticShareCode(resource, candidate);
          return { resource, mode, allowed: true, staticLink: true, reason: null, periodId: data.periodId ?? null };
        }
      }
      if (!shortCode) clearStaticShareCode(resource);
      return { resource, mode, allowed: false, reason: "CONTENT_ACCESS_REQUIRED" };
    }
    clearStaticShareCode(resource);
    return { resource, mode, allowed: mode === "public", periodId: data.periodId ?? null,
      reason: mode === "private" ? "CONTENT_PRIVATE" : "CONTENT_ACCESS_REQUIRED" };
  } catch {
    // An offline or malformed snapshot must never grant protected access.
    return { resource, mode: "private", allowed: false, reason: "SNAPSHOT_UNAVAILABLE" };
  }
}
