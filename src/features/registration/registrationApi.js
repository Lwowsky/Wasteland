import { requestJson } from "../../utils/apiClient.js";
import {
  readSessionCache,
  removeSessionCache,
  writeSessionCache,
} from "../../utils/sessionCache.js";

const SETTINGS_CACHE_KEY = "wasteland-public-registration-settings";
const SETTINGS_CACHE_TTL_MS = 60_000;

export async function getRegistrationSettings({ force = false } = {}) {
  if (!force) {
    const cached = readSessionCache(
      SETTINGS_CACHE_KEY,
      SETTINGS_CACHE_TTL_MS,
    );

    if (cached) {
      return cached;
    }
  }

  const result = await requestJson(
    "/api/registration-settings",
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
    "REGISTRATION_FAILED",
  );

  writeSessionCache(SETTINGS_CACHE_KEY, result);
  return result;
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

  removeSessionCache(SETTINGS_CACHE_KEY);

  return result;
}
