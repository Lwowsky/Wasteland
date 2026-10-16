import { publicAsset } from "../../utils/publicAsset.js";

const CACHE_PREFIX = "wasteland-public-snapshot-v3:";
// Cached snapshots are an outage fallback, not a permanent replacement for live data.
const OFFLINE_FALLBACK_TTL_MS = 30 * 60 * 1000;
const memory = new Map();
const inflight = new Map();
// A freshly network-verified response can be reused immediately by the table
// after ContentAccessGate reads its public access hint (no second HTTP hit).
const networkVerified = new Map();
const ACCESS_TO_TABLE_REUSE_MS = 10_000;

function snapshotUrl(file) {
  // For Cloudflare-hosted frontend, set VITE_PUBLIC_SNAPSHOT_BASE_URL to the
  // full https://OWNER.github.io/REPO/data URL at build time.
  const configured = String(import.meta.env?.VITE_PUBLIC_SNAPSHOT_BASE_URL || "").trim();
  const base = configured || publicAsset("/data");
  return `${base.replace(/\/$/, "")}/${file}`;
}

function readCached(file) {
  const inMemory = memory.get(file);
  if (inMemory && Date.now() - inMemory.savedAt <= OFFLINE_FALLBACK_TTL_MS) {
    return inMemory.data;
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_PREFIX + file));
    if (parsed && typeof parsed === "object" &&
        Number.isFinite(parsed.savedAt) &&
        Date.now() - parsed.savedAt >= 0 &&
        Date.now() - parsed.savedAt <= OFFLINE_FALLBACK_TTL_MS) {
      return parsed.data;
    }
  } catch { /* storage may be unavailable */ }
  return null;
}

function cacheData(file, data) {
  const entry = { savedAt: Date.now(), data };
  memory.set(file, entry);
  try { localStorage.setItem(CACHE_PREFIX + file, JSON.stringify(entry)); }
  catch { /* Ignore browser storage quota/private-mode errors. */ }
}

export async function getPublicSnapshot(
  file,
  { requireNetwork = false, reuseRecentlyVerified = false } = {},
) {
  if (reuseRecentlyVerified) {
    const entry = networkVerified.get(file);
    const age = Date.now() - Number(entry?.checkedAt);
    if (entry && age >= 0 && age < ACCESS_TO_TABLE_REUSE_MS) {
      return entry.data;
    }
  }

  if (!inflight.has(file)) {
    const pending = fetchPublicSnapshotFromNetwork(file).finally(() => {
      if (inflight.get(file) === pending) inflight.delete(file);
    });
    inflight.set(file, pending);
  }

  try {
    return await inflight.get(file);
  } catch (error) {
    if (!requireNetwork) {
      const cached = readCached(file);
      if (cached) return cached;
    }
    throw error;
  }
}

async function fetchPublicSnapshotFromNetwork(file) {
  // Even when the CDN replies from its own cache, this request must succeed
  // over the network before its access-mode hint can skip the Worker.
  const response = await fetch(snapshotUrl(file), { cache: "no-cache" });
  if (!response.ok) throw new Error(`SNAPSHOT_HTTP_${response.status}`);
  const result = await response.json();
  if (!result || typeof result !== "object") throw new Error("INVALID_SNAPSHOT");
  cacheData(file, result);
  networkVerified.set(file, { data: result, checkedAt: Date.now() });
  return result;
}

export function isPublicSnapshotEnabled() {
  return import.meta.env?.VITE_PUBLIC_SNAPSHOT_ENABLED === "true";
}
