import { getSiteSettings } from "../db/siteSettings.js";
import { json } from "../utils/response.js";

export async function handlePublicSiteSettings(env) {
  return json({
    success: true,
    settings: await getSiteSettings(env),
  });
}
