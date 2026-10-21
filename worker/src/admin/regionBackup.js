import { getBearerToken, verifyAdminRequest, adminHasPermission } from "../auth/adminAuth.js";
import { clearPublicCaches } from "../utils/cache.js";
import {
  listFirestoreDocuments,
  restoreFirestoreDocuments,
} from "../utils/firestore.js";
import { json } from "../utils/response.js";
import { isValidRegionBackup, hasRestorableAccessRequests } from "../../../shared/regionBackupValidation.js";

const BACKUP_FORMAT = "wasteland-region-backup";
const BACKUP_VERSION = 1;

const TABLES = [
  "registration_settings",
  "site_settings",
  "registration_periods",
  "turret_plan_drafts",
  "turret_plan_publications",
  "registrations",
  "public_players",
  "stats",
  "alliance_rotation",
  "content_access_settings",
  "content_access_tokens",
];

const DELETE_ORDER = [
  "turret_plan_publications",
  "turret_plan_drafts",
  "content_access_sessions",
  "content_access_tokens",
  "public_players",
  "registrations",
  "stats",
  "registration_periods",
  "alliance_rotation",
  "content_access_settings",
  "registration_settings",
  "site_settings",
];

const INSERT_ORDER = [
  "registration_settings",
  "site_settings",
  "content_access_settings",
  "registration_periods",
  "turret_plan_drafts",
  "turret_plan_publications",
  "registrations",
  "public_players",
  "stats",
  "alliance_rotation",
  "content_access_tokens",
];

async function listTable(env, tableName) {
  const result = await env.DB.prepare(`SELECT * FROM ${tableName}`).all();
  return result.results || [];
}

function backupCounts(d1, accessRequests) {
  return {
    periods: d1.registration_periods?.length || 0,
    registrations: d1.registrations?.length || 0,
    publicPlayers: d1.public_players?.length || 0,
    stats: d1.stats?.length || 0,
    alliances: d1.alliance_rotation?.length || 0,
    accessRequests: accessRequests?.length || 0,
  };
}

export async function createRegionBackupSnapshot(request, env) {
  const token = getBearerToken(request);
  if (!env.FIREBASE_PROJECT_ID || !token) {
    throw new Error("FIRESTORE_BACKUP_AUTH_UNAVAILABLE");
  }
  const d1Entries = await Promise.all(
    TABLES.map(async (tableName) => [tableName, await listTable(env, tableName)]),
  );
  const d1 = Object.fromEntries(d1Entries);

  // Do not produce a deceptively complete backup if Firestore cannot be read.
  // Otherwise a later restore would delete valid access requests using [].
  const accessRequests = await listFirestoreDocuments(env, token, "accessRequests");

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    database: "region",
    d1,
    firestore: {
      accessRequests,
    },
    preserved: {
      firebaseAuthUsers: true,
      adminUsersAndRoles: true,
    },
    counts: backupCounts(d1, accessRequests),
  };
}

export async function handleRegionBackupCreate(request, env) {
  const admin = await verifyAdminRequest(request, env);

  if (!admin.ok || !adminHasPermission(admin, "manage_region_backup")) {
    return json({ success: false, error: admin.ok ? "FORBIDDEN" : admin.error }, admin.ok ? 403 : admin.status);
  }

  const backup = await createRegionBackupSnapshot(request, env);

  return json({
    success: true,
    backup,
  });
}

async function getTableColumns(env, tableName) {
  const result = await env.DB.prepare(`PRAGMA table_info(${tableName})`).all();
  return new Set((result.results || []).map((row) => row.name));
}

async function runStatementsInChunks(env, statements, size = 40) {
  for (let index = 0; index < statements.length; index += size) {
    await env.DB.batch(statements.slice(index, index + size));
  }
}

async function restoreTable(env, tableName, rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }

  const allowedColumns = await getTableColumns(env, tableName);
  const statements = [];

  for (const row of rows) {
    const columns = Object.keys(row).filter((column) => allowedColumns.has(column));

    if (!columns.length) {
      continue;
    }

    const placeholders = columns.map(() => "?").join(", ");
    const sql =
      `INSERT INTO ${tableName} (${columns.join(", ")}) ` +
      `VALUES (${placeholders})`;
    const values = columns.map((column) => row[column] ?? null);
    statements.push(env.DB.prepare(sql).bind(...values));
  }

  await runStatementsInChunks(env, statements);
}

async function restoreD1(env, d1) {
  const hasSiteSettings = Array.isArray(d1?.site_settings);
  const deleteOrder = hasSiteSettings
    ? DELETE_ORDER
    : DELETE_ORDER.filter((tableName) => tableName !== "site_settings");
  const insertOrder = hasSiteSettings
    ? INSERT_ORDER
    : INSERT_ORDER.filter((tableName) => tableName !== "site_settings");

  // Destructive restore must never leave old share links able to open a
  // replacement region. Retain the rows for owner's audit/history view.
  // Revoke BEFORE deleting records (also fails closed if an insert later fails).
  await env.DB.batch([
    env.DB.prepare(`UPDATE static_share_links
      SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
      WHERE revoked_at IS NULL`),
    env.DB.prepare("DELETE FROM content_access_sessions"),
    ...deleteOrder.map((tableName) => env.DB.prepare(`DELETE FROM ${tableName}`)),
  ]);

  for (const tableName of insertOrder) {
    await restoreTable(env, tableName, d1[tableName] || []);
  }
  // Old backups may contain once-valid legacy code tokens. They cannot be
  // reactivated by restoring a historical file.
  await env.DB.batch([
    env.DB.prepare(`UPDATE content_access_tokens
      SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
      WHERE revoked_at IS NULL`),
    env.DB.prepare(`UPDATE content_access_settings
      SET mode = 'private', updated_at = CURRENT_TIMESTAMP
      WHERE mode NOT IN ('public', 'private', 'link')`),
  ]);
}

export async function handleRegionBackupRestore(request, env) {
  const admin = await verifyAdminRequest(request, env);

  if (!admin.ok || !adminHasPermission(admin, "manage_region_backup")) {
    return json({ success: false, error: admin.ok ? "FORBIDDEN" : admin.error }, admin.ok ? 403 : admin.status);
  }

  const body = await request.json().catch(() => ({}));

  if (body.confirmed !== true) {
    return json({ success: false, error: "BACKUP_RESTORE_CONFIRMATION_REQUIRED" }, 400);
  }

  if (!isValidRegionBackup(body.backup)) {
    return json({ success: false, error: "INVALID_REGION_BACKUP" }, 400);
  }

  // Capture the current server state before destructive restore. If that
  // fails, NO deletion is attempted.
  const rollbackBackup = await createRegionBackupSnapshot(request, env);

  try {
    await restoreD1(env, body.backup.d1);
    // Older backup files may omit the Firestore collection: do not interpret
    // "not captured" as "empty" and delete live access requests.
    if (hasRestorableAccessRequests(body.backup)) {
      await restoreFirestoreDocuments(
        env,
        getBearerToken(request),
        "accessRequests",
        body.backup.firestore.accessRequests,
      );
    }
  } finally {
    // D1 batches can partially restore before a subsequent batch/Firestore
    // operation fails. Never leave a static snapshot pointing at old state.
    await clearPublicCaches(request, env);
  }

  return json({
    success: true,
    restored: body.backup.counts || backupCounts(body.backup.d1, body.backup.firestore?.accessRequests),
    rollbackBackup,
    preserved: {
      firebaseAuthUsers: true,
      adminUsersAndRoles: true,
    },
  });
}
