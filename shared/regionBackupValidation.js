// Pure preflight validation, performed BEFORE any destructive D1 statements.
// "site_settings" was absent from the oldest supported v1 backups.
const REQUIRED_TABLES = Object.freeze([
  "registration_settings",
  "registration_periods",
  "turret_plan_drafts",
  "turret_plan_publications",
  "registrations",
  "public_players",
  "stats",
  "alliance_rotation",
  "content_access_settings",
  "content_access_tokens",
]);

export function hasRestorableAccessRequests(backup) {
  return Array.isArray(backup?.firestore?.accessRequests);
}

export function isValidRegionBackup(backup) {
  if (!backup || Array.isArray(backup) || typeof backup !== "object" ||
      backup.format !== "wasteland-region-backup" || backup.version !== 1 ||
      backup.database !== "region") return false;

  const d1 = backup.d1;
  if (!d1 || Array.isArray(d1) || typeof d1 !== "object") return false;
  if (!REQUIRED_TABLES.every((table) => Array.isArray(d1[table]) &&
      d1[table].every((row) => row && !Array.isArray(row) && typeof row === "object"))) {
    return false;
  }
  if (d1.site_settings !== undefined && !Array.isArray(d1.site_settings)) return false;
  if (backup.firestore !== undefined &&
      (!backup.firestore || Array.isArray(backup.firestore) ||
        typeof backup.firestore !== "object" ||
        (backup.firestore.accessRequests !== undefined &&
          !Array.isArray(backup.firestore.accessRequests)))) return false;
  return true;
}
