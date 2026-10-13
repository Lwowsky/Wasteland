import { publicAsset } from "../../utils/publicAsset.js";

// Existing Wasteland artwork shared by registration and saved templates.
export const TEMPLATE_ASSETS = Object.freeze({
  templates: publicAsset("/images/registration-settings/registration-fields-icon.webp"),
  players: publicAsset("/images/admin/icons/actions/players.webp"),
  add: publicAsset("/images/admin/icons/actions/add-player.webp"),
  edit: publicAsset("/images/admin/icons/actions/edit.webp"),
  delete: publicAsset("/images/admin/icons/actions/delete.webp"),
  save: publicAsset("/images/admin/icons/actions/approve.webp"),
  fighter: publicAsset("/images/admin/troops/fighter.webp"),
  rider: publicAsset("/images/admin/troops/rider.webp"),
  shooter: publicAsset("/images/admin/troops/shooter.webp"),
});

// Reuse existing site artwork for the public registration form fields.
export const REGISTRATION_FIELD_ICONS = Object.freeze({
  nickname: publicAsset("/images/admin/region-editor/player.webp"),
  alliance: publicAsset("/images/admin/region-editor/alliances.webp"),
  troopType: publicAsset("/images/registration/field-icons/main-troop-type.webp"),
  tier: publicAsset("/images/admin/region-editor/tier.webp"),
  lairLevel: publicAsset("/images/registration/field-icons/lair-level.webp"),
  marchSize: publicAsset("/images/admin/region-editor/march.webp"),
  rallySize: publicAsset("/images/admin/region-editor/rally.webp"),
  comment: publicAsset("/images/registration/field-icons/comment-note.webp"),
  readiness: publicAsset("/images/registration/field-icons/readiness.webp"),
});

// Used in the required-fields feedback; keep normal asterisks beside labels.
export const REGISTRATION_DECORATION_ICONS = Object.freeze({
  required: publicAsset("/images/registration/field-icons/required-field.webp"),
});
