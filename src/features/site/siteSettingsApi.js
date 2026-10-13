import { requestJson } from "../../utils/apiClient.js";
import {
  readSessionCache,
  removeSessionCache,
  writeSessionCache,
} from "../../utils/sessionCache.js";

const SITE_SETTINGS_CACHE_KEY = "wasteland-public-site-settings";
const SITE_SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;

export async function getSiteSettings({ force = false } = {}) {
  if (!force) {
    const cached = readSessionCache(
      SITE_SETTINGS_CACHE_KEY,
      SITE_SETTINGS_CACHE_TTL_MS,
    );

    if (cached) return cached;
  }

  const result = await requestJson(
    "/api/site-settings",
    {
      method: "GET",
      headers: { Accept: "application/json" },
    },
    "SITE_SETTINGS_REQUEST_FAILED",
  );

  writeSessionCache(SITE_SETTINGS_CACHE_KEY, result);
  return result;
}

export function clearSiteSettingsCache() {
  removeSessionCache(SITE_SETTINGS_CACHE_KEY);
}
