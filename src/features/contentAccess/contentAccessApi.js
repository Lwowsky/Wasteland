import { requestJson } from "../../utils/apiClient.js";
import { getPublicSnapshot, isPublicSnapshotEnabled } from "../players/publicSnapshot.js";
import { publicStatusFromSnapshot } from "./publicStatusFromSnapshot.js";

const SESSION_PREFIX = "wasteland-content-access-";

function sessionKey(resource) {
  return `${SESSION_PREFIX}${resource}`;
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function clearContentAccessSession(resource) {
  try {
    sessionStorage.removeItem(sessionKey(resource));
  } catch {
    // Ignore unavailable storage.
  }
}

export function getContentAccessSession(resource) {
  try {
    const stored = safeParse(sessionStorage.getItem(sessionKey(resource)));

    if (!stored?.token || !stored?.expiresAt) {
      return "";
    }

    if (Date.parse(stored.expiresAt) <= Date.now()) {
      clearContentAccessSession(resource);
      return "";
    }

    return stored.token;
  } catch {
    return "";
  }
}

function storeContentAccessSession(resource, token, expiresAt) {
  try {
    sessionStorage.setItem(
      sessionKey(resource),
      JSON.stringify({ token, expiresAt }),
    );
  } catch {
    // The current page can still use the returned token until refresh.
  }
}

export function getContentAccessHeaders(resource) {
  const session = getContentAccessSession(resource);

  return session ? { "X-Content-Access": session } : {};
}

export async function getContentAccessStatus(resource) {
  // The players list is already public on GitHub Pages. When the latest
  // network-confirmed public snapshot explicitly says "public", a second
  // Worker request solely for UI access is unnecessary.
  //
  // Do not trust an offline/localStorage fallback for an access decision.
  // Unknown/older metadata, restricted modes and network failures use the
  // original server check. The final_plan route ALWAYS uses the server.
  if ((resource === "players" || resource === "final_plan") && isPublicSnapshotEnabled()) {
    try {
      const snapshot = await getPublicSnapshot(resource === "players" ? "players.json" : "final-plan.json", {
        requireNetwork: true,
      });
      const publicStatus = publicStatusFromSnapshot(resource, snapshot);
      if (publicStatus) return publicStatus;
    } catch {
      // Safe fallback: ask the Worker instead of granting offline access.
    }
  }

  return requestJson(
    `/api/content-access/${resource}`,
    { headers: getContentAccessHeaders(resource) },
    "CONTENT_ACCESS_REQUEST_FAILED",
  );
}

export async function activateContentAccess(resource, token) {
  const data = await requestJson(
    "/api/content-access/activate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource, token }),
    },
    "CONTENT_ACCESS_REQUEST_FAILED",
  );

  storeContentAccessSession(resource, data.session, data.expiresAt);
  return data;
}
