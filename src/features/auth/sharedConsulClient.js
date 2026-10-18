import { requestJson } from "../../utils/apiClient.js";
import { setAdminMenuHint } from "./adminMenuHint.js";
import { clearAdminPlayersCache } from "../../pages/Admin/services/adminPlayersCache.js";

const STORAGE = "wasteland_shared_consul_session";

export function getSharedSession() {
  try {
    const data = JSON.parse(sessionStorage.getItem(STORAGE) || "null");
    if (data?.token?.startsWith("shared_") && data.expiresAt > Date.now() / 1000) {
      return data;
    }
  } catch {
    // Invalid or inaccessible storage is treated as no session.
  }
  return null;
}

export function forgetSharedSession() {
  clearAdminPlayersCache();
  try {
    sessionStorage.removeItem(STORAGE);
  } catch {
    // Storage can be unavailable in a private browser context.
  }
  setAdminMenuHint(false);
  window.dispatchEvent(new Event("wasteland-shared-auth"));
}

export async function signInSharedConsul(password, turnstileToken = "") {
  clearAdminPlayersCache();
  const existing = getSharedSession();
  const data = await requestJson("/api/shared-consul/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(existing ? { Authorization: `Bearer ${existing.token}` } : {}),
    },
    body: JSON.stringify({ password, turnstileToken }),
  });
  sessionStorage.setItem(
    STORAGE,
    JSON.stringify({ token: data.token, expiresAt: data.expiresAt }),
  );
  // A successful login is not itself an authorization check: AdminRoute
  // will confirm it before setting the local menu hint.
  setAdminMenuHint(false);
  window.dispatchEvent(new Event("wasteland-shared-auth"));
  return data;
}

export async function checkSharedConsul() {
  const session = getSharedSession();
  if (!session) return null;
  try {
    const data = await requestJson("/api/shared-consul/status", {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    return data.admin;
  } catch {
    forgetSharedSession();
    return null;
  }
}
