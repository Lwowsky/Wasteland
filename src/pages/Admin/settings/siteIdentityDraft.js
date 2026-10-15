import {
  SITE_SETTINGS_LIMITS,
} from "../../../../shared/siteSettingsConfig.js";
import { buildFooterOverrides, createFooterDrafts } from "../../../features/site/footerSettings.js";

/** Keep the editor's initial snapshot and payload independent from the form UI. */
export function createSiteIdentityDraft(settings, translations, languages) {
  return {
    siteName: settings?.siteName || "",
    brandText: settings?.brandText || "",
    regionNumber: String(settings?.regionNumber ?? ""),
    regionName: settings?.regionName || "",
    footerByLanguage: createFooterDrafts(settings, translations, languages),
  };
}

export function canSaveSiteIdentity(draft) {
  return draft.siteName.trim().length > 0 &&
    draft.brandText.trim().length > 0 &&
    draft.regionName.trim().length > 0 &&
    Number.isInteger(Number(draft.regionNumber)) &&
    Number(draft.regionNumber) >= SITE_SETTINGS_LIMITS.regionNumberMin &&
    Number(draft.regionNumber) <= SITE_SETTINGS_LIMITS.regionNumberMax;
}

export function buildSiteIdentityPayload(draft, settings, translations, languages) {
  return {
    ...draft,
    regionNumber: Number(draft.regionNumber),
    footerByLanguage: buildFooterOverrides(draft.footerByLanguage, settings, translations, languages),
  };
}
