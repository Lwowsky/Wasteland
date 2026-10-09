import { ownerDenied } from "./ownerAccess.js";
import { verifyAdminRequest } from "../auth/adminAuth.js";
import { getSiteSettings, saveSiteSettings } from "../db/siteSettings.js";
import { clearPublicCaches } from "../utils/cache.js";
import { json } from "../utils/response.js";

export async function handleAdminSiteSettingsGet(request, env) {
  const admin = await verifyAdminRequest(request, env);

  if (!admin.ok || admin.role !== "owner") {
    return ownerDenied(admin);
  }

  return json({
    success: true,
    settings: await getSiteSettings(env),
  });
}

export async function handleAdminSiteSettingsPut(request, env) {
  const admin = await verifyAdminRequest(request, env);

  if (!admin.ok || admin.role !== "owner") {
    return ownerDenied(admin);
  }

  const body = await request.json().catch(() => ({}));
  const settings = await saveSiteSettings(env, body);

  await clearPublicCaches(request);

  return json({
    success: true,
    settings,
  });
}
