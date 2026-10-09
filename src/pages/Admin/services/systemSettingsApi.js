import { adminRequest } from "./adminApi.js";

const CLIENT_LOCAL_KEYS = [
  "wasteland-player-templates",
  "wasteland-final-plan-extra-languages",
  "wasteland-time-mode",
  "wasteland-time-zone",
];

const CLIENT_SESSION_KEYS = [
  "wasteland-public-registration-settings",
  "wasteland-public-stats",
  "wasteland-public-recent",
];

export function getFactoryResetPreview() {
  return adminRequest("/api/admin/factory-reset-preview", {}, "SYSTEM_SETTINGS_REQUEST_FAILED");
}

export function factoryResetRegion(payload) {
  return adminRequest("/api/admin/factory-reset", {
    method: "POST",
    body: JSON.stringify(payload),
  }, "SYSTEM_SETTINGS_REQUEST_FAILED");
}

export function clearWastelandClientData() {
  CLIENT_LOCAL_KEYS.forEach((key) => localStorage.removeItem(key));
  CLIENT_SESSION_KEYS.forEach((key) => sessionStorage.removeItem(key));

  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);

    if (key?.startsWith("wasteland-")) {
      sessionStorage.removeItem(key);
    }
  }
}

export function collectWastelandClientData() {
  const localStorageData = {};

  CLIENT_LOCAL_KEYS.forEach((key) => {
    const value = localStorage.getItem(key);

    if (value !== null) {
      localStorageData[key] = value;
    }
  });

  return { localStorage: localStorageData };
}

export function restoreWastelandClientData(clientData) {
  const localStorageData = clientData?.localStorage;

  if (!localStorageData || typeof localStorageData !== "object") {
    return;
  }

  CLIENT_LOCAL_KEYS.forEach((key) => localStorage.removeItem(key));

  Object.entries(localStorageData).forEach(([key, value]) => {
    if (CLIENT_LOCAL_KEYS.includes(key) && typeof value === "string") {
      localStorage.setItem(key, value);
    }
  });
}

export async function createRegionBackup() {
  const result = await adminRequest("/api/admin/region-backup", {}, "SYSTEM_SETTINGS_REQUEST_FAILED");

  if (result?.backup) {
    result.backup.clientData = collectWastelandClientData();
  }

  return result;
}

export function restoreRegionBackup(payload) {
  return adminRequest("/api/admin/region-backup/restore", {
    method: "POST",
    body: JSON.stringify(payload),
  }, "SYSTEM_SETTINGS_REQUEST_FAILED");
}

function safeFileTimestamp(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const valid = Number.isNaN(date.getTime()) ? new Date() : date;

  return valid.toISOString().replace(/[:.]/g, "-").replace("T", "_").replace("Z", "");
}

export function downloadRegionBackup(backup, suffix = "backup") {
  const payload = {
    ...backup,
    clientData: backup?.clientData || collectWastelandClientData(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `wasteland-region-${suffix}-${safeFileTimestamp(payload.createdAt)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function getAdminSiteSettings() {
  return adminRequest(
    "/api/admin/site-settings",
    {},
    "SITE_SETTINGS_REQUEST_FAILED",
  );
}

export function saveAdminSiteSettings(payload) {
  return adminRequest(
    "/api/admin/site-settings",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    "SITE_SETTINGS_REQUEST_FAILED",
  );
}
