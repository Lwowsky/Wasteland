import { adminRequest } from "./adminApi.js";

export async function getAdminRegistrationSettings() {
  return adminRequest("/api/admin/registration-settings", {}, "REGISTRATION_SETTINGS_REQUEST_FAILED");
}

export async function saveAdminRegistrationSettings(settings, options = {}) {
  const result = await adminRequest("/api/admin/registration-settings", {
    method: "PUT",
    body: JSON.stringify({
      ...settings,
      _applyToCurrentCycle: options.applyToCurrentCycle === true,
      _applySection: options.applySection || "",
      _shiftMapping: options.shiftMapping || {},
    }),
  }, "REGISTRATION_SETTINGS_REQUEST_FAILED");

  try {
    sessionStorage.removeItem("wasteland-public-registration-settings");
  } catch {
    // Ignore unavailable storage.
  }

  window.dispatchEvent(new CustomEvent("registration-settings-updated"));

  return result;
}
