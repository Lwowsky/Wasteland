import { requestJson } from "../../utils/apiClient.js";

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
  // Live D1 state is authoritative. A GitHub Pages snapshot can be stale for
  // up to ten minutes, so it must not grant access after an admin closes it.
  return requestJson(
    `/api/content-access/${resource}`,
    { headers: getContentAccessHeaders(resource), cache: "no-store" },
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
