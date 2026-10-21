import { ownerDenied } from "./ownerAccess.js";
import { getBearerToken, verifyAdminRequest } from "../auth/adminAuth.js";
import {
  createDefaultRegistrationSettings,
  getRegistrationSettings,
  saveRegistrationSettings,
} from "../db/registrationSettings.js";
import { clearPublicCaches } from "../utils/cache.js";
import {
  deleteFirestoreCollection,
  listFirestoreDocuments,
} from "../utils/firestore.js";
import { json } from "../utils/response.js";

const RESET_KEYS = [
  "players",
  "cycles",
  "alliances",
  "registrationSettings",
  "accessRequests",
];

const DEFAULT_RESET_SELECTION = Object.fromEntries(
  RESET_KEYS.map((key) => [key, true]),
);

function normalizeSelection(body = {}) {
  if (body.deleteAll === true) {
    return { ...DEFAULT_RESET_SELECTION };
  }

  const source = body.selection || {};

  const result = Object.fromEntries(
    RESET_KEYS.map((key) => [key, source[key] === true]),
  );

  // Deleting cycle history necessarily removes registrations that reference it.
  if (result.cycles) {
    result.players = true;
  }

  return result;
}

function selectedCount(selection) {
  return RESET_KEYS.filter((key) => selection[key]).length;
}

async function countTable(env, tableName) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM ${tableName}`,
  ).first();

  return Number(row?.count || 0);
}

async function deleteFirestoreAccessRequests(env, token) {
  return deleteFirestoreCollection(env, token, "accessRequests");
}

async function getPreview(env, token) {
  const [periods, registrations, publicPlayers, stats, alliances] =
    await Promise.all([
      countTable(env, "registration_periods"),
      countTable(env, "registrations"),
      countTable(env, "public_players"),
      countTable(env, "stats"),
      countTable(env, "alliance_rotation"),
    ]);

  let accessRequests = null;

  try {
    accessRequests = (
      await listFirestoreDocuments(env, token, "accessRequests")
    ).length;
  } catch (error) {
    console.error("Factory reset access request preview:", error);
  }

  return {
    periods,
    registrations,
    publicPlayers,
    stats,
    alliances,
    accessRequests,
  };
}

async function resetSqliteSequence(env, tableNames) {
  if (!tableNames.length) {
    return;
  }

  try {
    const placeholders = tableNames.map(() => "?").join(", ");

    await env.DB.prepare(
      `DELETE FROM sqlite_sequence WHERE name IN (${placeholders})`,
    )
      .bind(...tableNames)
      .run();
  } catch (error) {
    // sqlite_sequence is an internal helper only. Reset must still succeed if
    // the current D1 database does not expose it.
    console.warn("Could not reset sqlite_sequence:", error);
  }
}

async function resetD1(env, selection) {
  const previousSettings = await getRegistrationSettings(env);
  const statements = [];
  const resetSequences = new Set();

  if (selection.players || selection.cycles || selection.registrationSettings) {
    // Existing link-only shares must not open another roster after reset.
    // History remains visible as revoked in the owner's link manager.
    statements.push(env.DB.prepare(`UPDATE static_share_links
      SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
      WHERE revoked_at IS NULL`));
    // Published plans cannot survive destructive changes to their source data.
    statements.push(env.DB.prepare("DELETE FROM turret_plan_publications"));
    statements.push(env.DB.prepare("DELETE FROM turret_plan_drafts"));
  }

  if (selection.players || selection.cycles) {
    statements.push(env.DB.prepare("DELETE FROM public_players"));
    statements.push(env.DB.prepare("DELETE FROM registrations"));
    statements.push(env.DB.prepare("DELETE FROM stats"));
    resetSequences.add("public_players");
    resetSequences.add("registrations");
  }

  if (selection.cycles) {
    statements.push(env.DB.prepare("DELETE FROM content_access_sessions"));
    statements.push(env.DB.prepare("DELETE FROM content_access_tokens"));
    statements.push(env.DB.prepare("DELETE FROM registration_periods"));
    resetSequences.add("content_access_sessions");
    resetSequences.add("content_access_tokens");
    resetSequences.add("registration_periods");
  }

  if (selection.alliances) {
    statements.push(env.DB.prepare("DELETE FROM alliance_rotation"));
    resetSequences.add("alliance_rotation");
  }

  if (statements.length) {
    await env.DB.batch(statements);
  }

  if (selection.registrationSettings) {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM content_access_sessions"),
      env.DB.prepare("DELETE FROM content_access_tokens"),
      env.DB.prepare("DELETE FROM content_access_settings"),
      env.DB.prepare(
        `INSERT INTO content_access_settings (resource, mode, use_limit, session_minutes, token_ttl_minutes) VALUES ('players', 'public', 1, 30, 0)`,
      ),
      env.DB.prepare(
        `INSERT INTO content_access_settings (resource, mode, use_limit, session_minutes, token_ttl_minutes) VALUES ('final_plan', 'public', 1, 30, 0)`,
      ),
    ]);

    await env.DB.prepare("DELETE FROM registration_settings").run();

    const defaults = createDefaultRegistrationSettings();
    const cleanSettings = {
      ...defaults,
      hostAlliance: selection.alliances ? "" : previousSettings.hostAlliance,
      governor: selection.alliances ? "" : previousSettings.governor,
      alliances: selection.alliances ? [] : previousSettings.alliances,
      allianceRotation: selection.alliances
        ? []
        : previousSettings.allianceRotation,
    };

    await saveRegistrationSettings(env, cleanSettings);
  } else if (selection.alliances) {
    await saveRegistrationSettings(env, {
      ...previousSettings,
      hostAlliance: "",
      governor: "",
      alliances: [],
      allianceRotation: [],
    });
  }

  await resetSqliteSequence(env, [...resetSequences]);
}

export async function handleFactoryResetPreview(request, env) {
  const admin = await verifyAdminRequest(request, env);

  if (!admin.ok || admin.role !== "owner") {
    return ownerDenied(admin);
  }

  const counts = await getPreview(env, getBearerToken(request));

  return json({
    success: true,
    counts,
  });
}

export async function handleFactoryReset(request, env) {
  const admin = await verifyAdminRequest(request, env);

  if (!admin.ok || admin.role !== "owner") {
    return ownerDenied(admin);
  }

  const body = await request.json().catch(() => ({}));
  const selection = normalizeSelection(body);

  if (body.confirmed !== true) {
    return json(
      {
        success: false,
        error: "FACTORY_RESET_CONFIRMATION_REQUIRED",
      },
      400,
    );
  }

  if (!selectedCount(selection)) {
    return json(
      {
        success: false,
        error: "FACTORY_RESET_NOTHING_SELECTED",
      },
      400,
    );
  }

  const before = await getPreview(env, getBearerToken(request));

  let deletedAccessRequests = 0;

  if (selection.accessRequests) {
    deletedAccessRequests = await deleteFirestoreAccessRequests(
      env,
      getBearerToken(request),
    );
  }

  await resetD1(env, selection);
  await clearPublicCaches(request, env);

  return json({
    success: true,
    selection,
    before,
    deletedAccessRequests,
    preserved: {
      firebaseAuthUsers: true,
      adminUsersAndRoles: true,
    },
  });
}
