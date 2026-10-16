import { requestJson } from "../../utils/apiClient.js";
import { clearPublicSettingsCache, loadPublicSettings } from "../../utils/publicSettingsCache.js";

const SETTINGS_CACHE_KEY = "wasteland-public-registration-settings";
const SETTINGS_CACHE_TTL_MS = 60_000;

export function getRegistrationSettings({ force = false } = {}) {
  return loadPublicSettings({
    key: SETTINGS_CACHE_KEY,
    ttlMs: SETTINGS_CACHE_TTL_MS,
    force,
    load: () => requestJson(
      "/api/registration-settings",
      { method: "GET", headers: { Accept: "application/json" } },
      "REGISTRATION_FAILED",
    ),
  });
}

export async function submitRegistration(data) {
  const result = await requestJson(
    "/api/registration",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
    "REGISTRATION_FAILED",
  );

  clearPublicSettingsCache(SETTINGS_CACHE_KEY);

  return result;
}
