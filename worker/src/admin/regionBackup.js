import { ownerDenied } from "./ownerAccess.js";
import { getBearerToken, verifyAdminRequest } from "../auth/adminAuth.js";
import { clearPublicCaches } from "../utils/cache.js";
import {
  listFirestoreDocuments,
  restoreFirestoreDocuments,
} from "../utils/firestore.js";
import { json } from "../utils/response.js";

const BACKUP_FORMAT = "wasteland-region-backup";
const BACKUP_VERSION = 1;

const TABLES = [
  "registration_settings",
  "site_settings",
  "registration_periods",
  "registrations",
  "public_players",
  "stats",
  "alliance_rotation",
  "content_access_settings",
  "content_access_tokens",
];

const DELETE_ORDER = [
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
  const d1Entries = await Promise.all(
    TABLES.map(async (tableName) => [tableName, await listTable(env, tableName)]),
  );
  const d1 = Object.fromEntries(d1Entries);

  let accessRequests = [];
  try {
    accessRequests = await listFirestoreDocuments(env, token, "accessRequests");
  } catch (error) {
    console.error("Backup accessRequests:", error);
  }

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

  if (!admin.ok || admin.role !== "owner") {
    return ownerDenied(admin);
  }

  const backup = await createRegionBackupSnapshot(request, env);

  return json({
    success: true,
    backup,
  });
}

function isValidBackup(backup) {
  return (
    backup &&
    backup.format === BACKUP_FORMAT &&
    Number(backup.version) === BACKUP_VERSION &&
    backup.d1 &&
    typeof backup.d1 === "object"
  );
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

  await env.DB.batch(
    deleteOrder.map((tableName) => env.DB.prepare(`DELETE FROM ${tableName}`)),
  );

  for (const tableName of insertOrder) {
    await restoreTable(env, tableName, d1?.[tableName] || []);
  }
}

export async function handleRegionBackupRestore(request, env) {
  const admin = await verifyAdminRequest(request, env);

  if (!admin.ok || admin.role !== "owner") {
    return ownerDenied(admin);
  }

  const body = await request.json().catch(() => ({}));

  if (body.confirmed !== true) {
    return json({ success: false, error: "BACKUP_RESTORE_CONFIRMATION_REQUIRED" }, 400);
  }

  if (!isValidBackup(body.backup)) {
    return json({ success: false, error: "INVALID_REGION_BACKUP" }, 400);
  }

  // Capture the current server state before destructive restore. It is returned
  // to the caller so the UI can download it as an emergency rollback file.
  const rollbackBackup = await createRegionBackupSnapshot(request, env);

  await restoreD1(env, body.backup.d1);
  await restoreFirestoreDocuments(
    env,
    getBearerToken(request),
    "accessRequests",
    body.backup.firestore?.accessRequests || [],
  );
  await clearPublicCaches(request);

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
