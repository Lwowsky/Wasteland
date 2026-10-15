import { publicAsset } from "../../utils/publicAsset.js";

const CACHE_PREFIX = "wasteland-public-snapshot-v1:";
const memory = new Map();
const inflight = new Map();

function snapshotUrl(file) {
  // For Cloudflare-hosted frontend, set VITE_PUBLIC_SNAPSHOT_BASE_URL to the
  // full https://OWNER.github.io/REPO/data URL at build time.
  const configured = String(import.meta.env?.VITE_PUBLIC_SNAPSHOT_BASE_URL || "").trim();
  const base = configured || publicAsset("/data");
  return `${base.replace(/\/$/, "")}/${file}`;
}

function readCached(file) {
  if (memory.has(file)) return memory.get(file);
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_PREFIX + file));
    if (parsed && typeof parsed === "object") return parsed;
  } catch { /* storage may be unavailable */ }
  return null;
}

function cacheData(file, data) {
  memory.set(file, data);
  try { localStorage.setItem(CACHE_PREFIX + file, JSON.stringify(data)); }
  catch { /* Ignore browser storage quota/private-mode errors. */ }
}

export async function getPublicSnapshot(file) {
  if (inflight.has(file)) return inflight.get(file);
  const pending = fetchPublicSnapshot(file).finally(() => inflight.delete(file));
  inflight.set(file, pending);
  return pending;
}

async function fetchPublicSnapshot(file) {
  const cached = readCached(file);
  try {
    // HTTP cache is handled by the CDN; don't add a changing querystring.
    // 'no-cache' revalidates instead of accepting stale local browser cache.
    const response = await fetch(snapshotUrl(file), { cache: "no-cache" });
    if (!response.ok) throw new Error(`SNAPSHOT_HTTP_${response.status}`);
    const result = await response.json();
    if (!result || typeof result !== "object") throw new Error("INVALID_SNAPSHOT");
    cacheData(file, result);
    return result;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

export function isPublicSnapshotEnabled() {
  return import.meta.env?.VITE_PUBLIC_SNAPSHOT_ENABLED === "true";
}
