import { publicAsset } from "../../utils/publicAsset.js";

// Reuse existing Wasteland assets and keep settings icon paths in one place.
export const SETTINGS_ICONS = Object.freeze({
  settings: publicAsset("/images/admin/icons/settings.webp"),
  templates: publicAsset("/images/registration-settings/registration-fields-icon.webp"),
  language: publicAsset("/images/admin/icons/settings/interface-language.webp"),
  timeMode: publicAsset("/images/admin/icons/settings/time-display-mode.webp"),
  timeZone: publicAsset("/images/admin/icons/settings/timezone-location.webp"),
  reset: publicAsset("/images/admin/icons/settings/data-reset.webp"),
});
