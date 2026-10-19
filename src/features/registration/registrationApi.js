import { requestJson } from "../../utils/apiClient.js";
import { clearPublicSettingsCache, loadPublicSettings } from "../../utils/publicSettingsCache.js";
import { getStaticPublicSettings, isPublicRegistrationSettings } from "../../utils/publicSettingsSnapshot.js";
import { isPublicSnapshotEnabled } from "../players/publicSnapshot.js";

const SETTINGS_CACHE_KEY = "wasteland-public-registration-settings";
const SETTINGS_CACHE_TTL_MS = 60_000;

export function getRegistrationSettings({ force = false, serverOnly = false, staticOnly = false } = {}) {
  // Read static public settings for display. POST revalidates the live D1 state.
  // Registration POST independently revalidates all rules on the server.
  if (serverOnly) return fetchRegistrationSettings();

  return loadPublicSettings({
    key: SETTINGS_CACHE_KEY,
    ttlMs: SETTINGS_CACHE_TTL_MS,
    force,
    load: async () => {
      // An explicit admin update must read the authoritative value rather
      // than a not-yet-republished JSON snapshot.
      const staticSettings = !force && await getStaticPublicSettings(
        "registration-settings.json",
        isPublicRegistrationSettings,
      );
      // Public layout/calendar can fail closed during a CDN outage rather than
      // repeatedly falling back to metered Worker/D1 calls on every F5.
      // Registration POST and explicit admin reads remain server-authoritative.
      if (staticOnly && isPublicSnapshotEnabled() && !staticSettings) {
        throw new Error("PUBLIC_CALENDAR_UNAVAILABLE");
      }
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

export async function submitRegistration(data, turnstileToken = "") {
  const result = await requestJson(
    "/api/registration",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...data, turnstileToken }),
    },
    "REGISTRATION_FAILED",
  );

  clearPublicSettingsCache(SETTINGS_CACHE_KEY);

  return result;
}
