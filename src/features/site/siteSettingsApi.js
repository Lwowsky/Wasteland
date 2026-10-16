import { requestJson } from "../../utils/apiClient.js";
import { clearPublicSettingsCache, loadPublicSettings } from "../../utils/publicSettingsCache.js";
import { getStaticPublicSettings, isPublicSiteSettings } from "../../utils/publicSettingsSnapshot.js";

const SITE_SETTINGS_CACHE_KEY = "wasteland-public-site-settings";
const SITE_SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;

export function getSiteSettings({ force = false } = {}) {
  return loadPublicSettings({
    key: SITE_SETTINGS_CACHE_KEY,
    ttlMs: SITE_SETTINGS_CACHE_TTL_MS,
    force,
    load: async () => {
      // An admin's explicit update needs the live value, before the async
      // GitHub Pages publication catches up. Ordinary page views use JSON.
      const staticSettings = !force && await getStaticPublicSettings(
        "site-settings.json",
        isPublicSiteSettings,
      );
      return staticSettings || requestJson(
        "/api/site-settings",
        { method: "GET", headers: { Accept: "application/json" } },
        "SITE_SETTINGS_REQUEST_FAILED",
      );
    },
  });
}

export function clearSiteSettingsCache() {
  clearPublicSettingsCache(SITE_SETTINGS_CACHE_KEY);
}
