import { verifyAdminRequest } from "../../auth/adminAuth.js";
import { json } from "../../utils/response.js";
import {
  canManagePlayerData,
  IMPORT_MODES,
  normalizeNicknameForRegistration,
  normalizeRegistrationBody,
  validateRegistrationBody,
  toRegistrationRecord,
} from "./data.js";
import { finalizeRegistrationWrite } from "./afterWrite.js";
import { getAdminRegistrationPeriod } from "./period.js";
import { getExistingNicknames } from "../../db/registrationQueries.js";
import {
  preparePublicPlayerInsertFromRegistration,
  prepareRegistrationInsert,
} from "../../db/registrationWrites.js";

export async function handleAdminImportRegistrations(request, env) {
  const admin = await verifyAdminRequest(request, env);

  if (!admin.ok) {
    return json({ success: false, error: admin.error }, admin.status);
  }

  if (!canManagePlayerData(admin)) {
    return json({ success: false, error: "IMPORT_ACCESS_DENIED" }, 403);
  }

  const period = await getAdminRegistrationPeriod(env);

  if (!period) {
    return json({ success: false, error: "NO_CURRENT_PERIOD" }, 400);
  }

  const body = await request.json();
  const sourcePlayers = Array.isArray(body?.players) ? body.players : [];
  const mode = String(body?.mode || "skipExisting");

  if (!IMPORT_MODES.has(mode)) {
    return json({ success: false, error: "INVALID_IMPORT_MODE" }, 400);
  }

  if (sourcePlayers.length === 0 || sourcePlayers.length > 500) {
    return json({ success: false, error: "INVALID_IMPORT_SIZE" }, 400);
  }

  const players = sourcePlayers.map(normalizeRegistrationBody);
  const invalidRows = findInvalidRows(players);

  if (invalidRows.length > 0) {
    return json(
      {
        success: false,
        error: "INVALID_IMPORT_ROWS",
        rows: invalidRows,
      },
      400,
    );
  }

  const existingNicknames = await getExistingNicknames(env, period.id);
  const { importPlayers, skipped } = filterImportPlayers(
    players,
    existingNicknames,
    mode,
  );

  const replacingPeriod =
    mode === "replacePeriod" || mode === "replacePeriodAndClose";

  if (replacingPeriod) {
    await clearPeriodPlayers(env, period.id);
  }

  await insertImportedPlayers(env, period.id, importPlayers);

  let registrationClosed = false;

  if (mode === "replacePeriodAndClose") {
    await closeRegistrationPeriod(env, period.id);
    registrationClosed = true;
  }

  await finalizeRegistrationWrite(request, env, period.id);

  return json({
    success: true,
    imported: importPlayers.length,
    skipped,
    replaced: replacingPeriod,
    registrationClosed,
    periodId: period.id,
  });
}

function findInvalidRows(players) {
  const invalidRows = [];
  const seenNicknames = new Set();

  players.forEach((player, index) => {
    const nicknameNormalized = normalizeNicknameForRegistration(player);

    if (
      !validateRegistrationBody(player) ||
      !nicknameNormalized ||
      seenNicknames.has(nicknameNormalized)
    ) {
      invalidRows.push(index + 1);
      return;
    }

    seenNicknames.add(nicknameNormalized);
  });

  return invalidRows;
}

function filterImportPlayers(players, existingNicknames, mode) {
  if (mode !== "skipExisting") {
    return { importPlayers: players, skipped: 0 };
  }

  let skipped = 0;
  const importPlayers = players.filter((player) => {
    const exists = existingNicknames.has(
      normalizeNicknameForRegistration(player),
    );

    if (exists) {
      skipped += 1;
    }

    return !exists;
  });

  return { importPlayers, skipped };
}

async function clearPeriodPlayers(env, periodId) {
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM public_players WHERE period_id = ?`).bind(
      periodId,
    ),
    env.DB.prepare(`DELETE FROM registrations WHERE period_id = ?`).bind(
      periodId,
    ),
  ]);
}

async function insertImportedPlayers(env, periodId, players) {
  const statements = [];

  for (const player of players) {
    const nicknameNormalized = normalizeNicknameForRegistration(player);

    const record = toRegistrationRecord(player, nicknameNormalized);

    statements.push(
      prepareRegistrationInsert(env, periodId, record),
      preparePublicPlayerInsertFromRegistration(
        env,
        periodId,
        nicknameNormalized,
      ),
    );
  }

  for (let index = 0; index < statements.length; index += 100) {
    await env.DB.batch(statements.slice(index, index + 100));
  }
}

async function closeRegistrationPeriod(env, periodId) {
  const closedAt = new Date().toISOString();

  await env.DB.prepare(
    `
      UPDATE registration_periods
      SET status = 'closed', closes_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
  )
    .bind(closedAt, periodId)
    .run();
}
