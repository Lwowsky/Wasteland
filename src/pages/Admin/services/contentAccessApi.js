import { adminRequest } from "./adminApi.js";

export function getAdminContentAccess() {
  return adminRequest(
    "/api/admin/content-access",
    {},
    "CONTENT_ACCESS_LOAD_FAILED",
  );
}

export function saveAdminContentAccess(resource, settings) {
  return adminRequest(
    `/api/admin/content-access/${resource}`,
    {
      method: "PUT",
      body: JSON.stringify(settings),
    },
    "CONTENT_ACCESS_SAVE_FAILED",
  );
}

export function generateAdminContentAccessToken(resource) {
  return adminRequest(
    `/api/admin/content-access/${resource}/token`,
    { method: "POST" },
    "CONTENT_ACCESS_GENERATE_FAILED",
  );
}

export function revokeAdminSingleStaticLink(resource, id) {
  return adminRequest(
    `/api/admin/content-access/${resource}/token?id=${encodeURIComponent(id)}`,
    { method: "DELETE" },
    "CONTENT_ACCESS_REVOKE_FAILED",
  );
}


export function deleteAdminInactiveStaticLink(resource, id) {
  return adminRequest(
    `/api/admin/content-access/${resource}/token?id=${encodeURIComponent(id)}&action=delete`,
    { method: "DELETE" },
    "CONTENT_ACCESS_DELETE_FAILED",
  );
}
