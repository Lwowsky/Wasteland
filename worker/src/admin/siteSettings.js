import { verifyAdminRequest, adminHasPermission } from "../auth/adminAuth.js";
import { getSiteSettings, saveSiteSettings } from "../db/siteSettings.js";
import { clearPublicCaches } from "../utils/cache.js";
import { json } from "../utils/response.js";

export async function handleAdminSiteSettingsGet(request, env) {
  const admin = await verifyAdminRequest(request, env);

  if (!admin.ok || !adminHasPermission(admin, "manage_site_appearance")) {
    return json({ success: false, error: admin.ok ? "FORBIDDEN" : admin.error }, admin.ok ? 403 : admin.status);
  }

  return json({
    success: true,
    settings: await getSiteSettings(env),
  });
}

export async function handleAdminSiteSettingsPut(request, env) {
  const admin = await verifyAdminRequest(request, env);

  if (!admin.ok || !adminHasPermission(admin, "manage_site_appearance")) {
    return json({ success: false, error: admin.ok ? "FORBIDDEN" : admin.error }, admin.ok ? 403 : admin.status);
  }

  const body = await request.json().catch(() => ({}));
  const settings = await saveSiteSettings(env, body);

  await clearPublicCaches(request, env);

  return json({
    success: true,
    settings,
  });
}
