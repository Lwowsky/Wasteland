import { adminRequest } from "./adminApi.js";

export function getAdminTurretPlan() {
  return adminRequest("/api/admin/turret-plan");
}

export function saveAdminTurretDraft(payload) {
  return adminRequest("/api/admin/turret-plan/draft", {
    method: "PUT", body: JSON.stringify(payload),
  });
}

export function publishAdminTurretPlan(payload) {
  return adminRequest("/api/admin/turret-plan/publish", {
    method: "POST", body: JSON.stringify(payload),
  });
}

export function restoreAdminPublishedPlan(payload) {
  return adminRequest("/api/admin/turret-plan/restore", {
    method: "POST", body: JSON.stringify(payload),
  });
}
