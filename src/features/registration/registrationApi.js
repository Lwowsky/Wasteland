import { requestJson } from "../../utils/apiClient.js";
import { clearPublicSettingsCache, loadPublicSettings } from "../../utils/publicSettingsCache.js";
import { getStaticPublicSettings, isPublicRegistrationSettings } from "../../utils/publicSettingsSnapshot.js";

const SETTINGS_CACHE_KEY = "wasteland-public-registration-settings";
const SETTINGS_CACHE_TTL_MS = 60_000;

export function getRegistrationSettings({ force = false, serverOnly = false } = {}) {
  // /registration always checks the live Worker before showing the form.
  // Registration POST independently revalidates all rules on the server.
  if (serverOnly) return fetchRegistrationSettings();

  return loadPublicSettings({
    key: SETTINGS_CACHE_KEY,
    ttlMs: SETTINGS_CACHE_TTL_MS,
    force,
    load: async () => {
      const staticSettings = !force && await getStaticPublicSettings(
        "registration-settings.json",
        isPublicRegistrationSettings,
      );
      return staticSettings || fetchRegistrationSettings();
    },
  });
}

function fetchRegistrationSettings() {
  return requestJson(
    "/api/registration-settings",
    { method: "GET", headers: { Accept: "application/json" } },
    "REGISTRATION_FAILED",
  );
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
