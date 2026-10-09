import {
  DEFAULT_SITE_SETTINGS,
  SITE_FOOTER_FIELDS,
  SITE_FOOTER_LIMITS,
  SITE_SETTINGS_LIMITS,
} from "../../../shared/siteSettingsConfig.js";

function cleanText(value, maxLength, fallback = "") {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, maxLength) : fallback;
}

function parseFooter(value) {
  if (!value) return {};

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

export function sanitizeFooterByLanguage(value = {}) {
  const source = parseFooter(value);
  const result = {};

  Object.entries(source).forEach(([language, copy]) => {
    const languageCode = String(language || "").trim().toLowerCase();

    if (!/^[a-z0-9-]{2,12}$/.test(languageCode)) return;
    if (!copy || typeof copy !== "object" || Array.isArray(copy)) return;

    result[languageCode] = Object.fromEntries(
      SITE_FOOTER_FIELDS.map((field) => [
        field,
        String(copy[field] ?? "").trim().slice(0, SITE_FOOTER_LIMITS[field]),
      ]),
    );
  });

  return result;
}

export function sanitizeSiteSettings(value = {}, current = DEFAULT_SITE_SETTINGS) {
  const regionNumber = Number(value.regionNumber ?? current.regionNumber);

  return {
    siteName: cleanText(value.siteName, SITE_SETTINGS_LIMITS.siteName, current.siteName || DEFAULT_SITE_SETTINGS.siteName),
    brandText: cleanText(
      value.brandText,
      SITE_SETTINGS_LIMITS.brandText,
      current.brandText || current.siteName || DEFAULT_SITE_SETTINGS.brandText,
    ),
    regionNumber:
      Number.isInteger(regionNumber) && regionNumber >= SITE_SETTINGS_LIMITS.regionNumberMin &&
        regionNumber <= SITE_SETTINGS_LIMITS.regionNumberMax
        ? regionNumber
        : Number(current.regionNumber || DEFAULT_SITE_SETTINGS.regionNumber),
    regionName: cleanText(
      value.regionName,
      SITE_SETTINGS_LIMITS.regionName,
      current.regionName || DEFAULT_SITE_SETTINGS.regionName,
    ),
    footerByLanguage: sanitizeFooterByLanguage(
      value.footerByLanguage ?? current.footerByLanguage,
    ),
  };
}

export async function getSiteSettings(env) {
  const row = await env.DB.prepare(
    `
      SELECT
        site_name AS siteName,
        brand_text AS brandText,
        region_number AS regionNumber,
        region_name AS regionName,
        footer_json AS footerJson,
        updated_at AS updatedAt
      FROM site_settings
      WHERE id = 1
      LIMIT 1
    `,
  ).first();

  if (!row) {
    return { ...DEFAULT_SITE_SETTINGS, updatedAt: null };
  }

  return {
    ...sanitizeSiteSettings({
      siteName: row.siteName,
      brandText: row.brandText,
      regionNumber: row.regionNumber,
      regionName: row.regionName,
      footerByLanguage: row.footerJson,
    }),
    updatedAt: row.updatedAt || null,
  };
}

export async function saveSiteSettings(env, value) {
  const current = await getSiteSettings(env);
  const settings = sanitizeSiteSettings(value, current);

  await env.DB.prepare(
    `
      INSERT INTO site_settings (
        id,
        site_name,
        brand_text,
        region_number,
        region_name,
        footer_json,
        updated_at
      )
      VALUES (1, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        site_name = excluded.site_name,
        brand_text = excluded.brand_text,
        region_number = excluded.region_number,
        region_name = excluded.region_name,
        footer_json = excluded.footer_json,
        updated_at = CURRENT_TIMESTAMP
    `,
  )
    .bind(
      settings.siteName,
      settings.brandText,
      settings.regionNumber,
      settings.regionName,
      JSON.stringify(settings.footerByLanguage),
    )
    .run();

  return getSiteSettings(env);
}

export { DEFAULT_SITE_SETTINGS };
