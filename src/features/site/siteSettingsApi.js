import { requestJson } from "../../utils/apiClient.js";
import { clearPublicSettingsCache, loadPublicSettings } from "../../utils/publicSettingsCache.js";

const SITE_SETTINGS_CACHE_KEY = "wasteland-public-site-settings";
const SITE_SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;

export function getSiteSettings({ force = false } = {}) {
  return loadPublicSettings({
    key: SITE_SETTINGS_CACHE_KEY,
    ttlMs: SITE_SETTINGS_CACHE_TTL_MS,
    force,
    load: () => requestJson(
      "/api/site-settings",
      { method: "GET", headers: { Accept: "application/json" } },
      "SITE_SETTINGS_REQUEST_FAILED",
    ),
  });
}

export function clearSiteSettingsCache() {
  clearPublicSettingsCache(SITE_SETTINGS_CACHE_KEY);
}
