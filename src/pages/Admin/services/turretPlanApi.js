import { adminRequest } from "./adminApi.js";

function regionUrl(path, region = "home") {
  if (!["home", "region2", "region3"].includes(region)) throw new Error("INVALID_CAPTURE_REGION");
  return `${path}?region=${encodeURIComponent(region)}`;
}

export function getAdminTurretPlan(region = "home") {
  return adminRequest(regionUrl("/api/admin/turret-plan", region));
}

export function saveAdminTurretDraft(payload, region = "home") {
  return adminRequest(regionUrl("/api/admin/turret-plan/draft", region), {
    method: "PUT", body: JSON.stringify(payload),
  });
}

export function publishAdminTurretPlan(payload, region = "home") {
  return adminRequest(regionUrl("/api/admin/turret-plan/publish", region), {
    method: "POST", body: JSON.stringify(payload),
  });
}

export function restoreAdminPublishedPlan(payload, region = "home") {
  return adminRequest(regionUrl("/api/admin/turret-plan/restore", region), {
    method: "POST", body: JSON.stringify(payload),
  });
}
