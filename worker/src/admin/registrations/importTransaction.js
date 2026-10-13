import { boolToInt } from "../../utils/normalize.js";
import { prepareStatsRefresh } from "../../db/stats.js";
import { normalizeNicknameForRegistration, toRegistrationRecord } from "./data.js";

// Normalization and serialization are completed BEFORE any database mutation.
function serializeImportRecord(player) {
  const record = toRegistrationRecord(player, normalizeNicknameForRegistration(player));
  return {
    nickname: record.nickname,
    nicknameNormalized: record.nicknameNormalized,
    alliance: record.alliance,
    troopType: record.troopType,
    tier: record.tier,
    lairLevel: record.lairLevel,
    marchSize: record.marchSize,
    rallySize: record.rallySize,
    readyAttack: boolToInt(record.readyAttack),
    captain: boolToInt(record.captain),
    shift: record.shift,
    fighterEnabled: boolToInt(record.extraSquads.fighter.enabled),
    fighterTier: record.extraSquads.fighter.tier,
    riderEnabled: boolToInt(record.extraSquads.rider.enabled),
    riderTier: record.extraSquads.rider.tier,
    shooterEnabled: boolToInt(record.extraSquads.shooter.enabled),
    shooterTier: record.extraSquads.shooter.tier,
    comment: record.comment,
    customFieldsJson: JSON.stringify(record.customFields || {}),
  };
}

export function prepareImportTransaction(env, periodId, players, mode, now = new Date()) {
  const replacing = mode === "replacePeriod" || mode === "replacePeriodAndClose";
  const data = JSON.stringify(players.map(serializeImportRecord));
  const statements = [];

  if (replacing) {
    // Saved turret rosters refer to old player IDs and cannot survive replacement.
    // ALL deletions share the same transaction with the new data insert.
    statements.push(
      env.DB.prepare("DELETE FROM turret_plan_publications WHERE period_id = ?").bind(periodId),
      env.DB.prepare("DELETE FROM turret_plan_drafts WHERE period_id = ?").bind(periodId),
      env.DB.prepare("DELETE FROM public_players WHERE period_id = ?").bind(periodId),
      env.DB.prepare("DELETE FROM registrations WHERE period_id = ?").bind(periodId),
    );
  }

  // SQLite JSON1 converts a 500-player file into one set-based statement.
  // `WHERE 1` disambiguates ON CONFLICT from a JOIN on SQLite's INSERT...SELECT.
  const insert = env.DB.prepare(`
    INSERT INTO registrations (
      period_id, nickname, nickname_normalized, alliance, troop_type, tier,
      lair_level, march_size, rally_size, ready_attack, captain, shift,
      extra_fighter_enabled, extra_fighter_tier, extra_rider_enabled,
      extra_rider_tier, extra_shooter_enabled, extra_shooter_tier,
      comment, custom_fields_json
    )
    SELECT ?,
      json_extract(j.value, '$.nickname'),
      json_extract(j.value, '$.nicknameNormalized'),
      json_extract(j.value, '$.alliance'),
      json_extract(j.value, '$.troopType'),
      json_extract(j.value, '$.tier'),
      json_extract(j.value, '$.lairLevel'),
      json_extract(j.value, '$.marchSize'),
      json_extract(j.value, '$.rallySize'),
      json_extract(j.value, '$.readyAttack'),
      json_extract(j.value, '$.captain'),
      json_extract(j.value, '$.shift'),
      json_extract(j.value, '$.fighterEnabled'),
      json_extract(j.value, '$.fighterTier'),
      json_extract(j.value, '$.riderEnabled'),
      json_extract(j.value, '$.riderTier'),
      json_extract(j.value, '$.shooterEnabled'),
      json_extract(j.value, '$.shooterTier'),
      json_extract(j.value, '$.comment'),
      json_extract(j.value, '$.customFieldsJson')
    FROM json_each(?) AS j
    WHERE 1
    ${mode === "skipExisting" ? "ON CONFLICT(period_id, nickname_normalized) DO NOTHING" : ""}
  `).bind(periodId, data);
  const importIndex = statements.length;
  statements.push(insert);

  // Mirror all missing registrations in one query. For replace, old mirror rows
  // were deleted above. For add-missing, existing rows remain unchanged.
  statements.push(env.DB.prepare(`
    INSERT INTO public_players (
      registration_id, period_id, nickname, alliance, troop_type, tier,
      lair_level, march_size, rally_size, ready_attack, captain, shift,
      extra_fighter_enabled, extra_fighter_tier, extra_rider_enabled,
      extra_rider_tier, extra_shooter_enabled, extra_shooter_tier
    )
    SELECT
      r.id, r.period_id, r.nickname, r.alliance, r.troop_type, r.tier,
      r.lair_level, r.march_size, r.rally_size, r.ready_attack, r.captain,
      r.shift, r.extra_fighter_enabled, r.extra_fighter_tier,
      r.extra_rider_enabled, r.extra_rider_tier,
      r.extra_shooter_enabled, r.extra_shooter_tier
    FROM registrations AS r
    WHERE r.period_id = ?
      AND NOT EXISTS (
        SELECT 1 FROM public_players AS p WHERE p.registration_id = r.id
      )
  `).bind(periodId));

  statements.push(prepareStatsRefresh(env, periodId));
  if (mode === "replacePeriodAndClose") {
    const closedAt = now.toISOString();
    statements.push(env.DB.prepare(`
      UPDATE registration_periods
      SET status = 'closed', closes_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(closedAt, periodId));
  }
  return { statements, importIndex };
}

export async function executeImportTransaction(env, periodId, players, mode, now) {
  const { statements, importIndex } = prepareImportTransaction(env, periodId, players, mode, now);
  // Cloudflare D1's batch() executes statements inside ONE transaction and
  // automatically rolls back every statement if ANY one fails.
  const results = await env.DB.batch(statements);
  const imported = Number(results[importIndex]?.meta?.changes);
  if (!Number.isFinite(imported)) {
    // Do not tell the user a wrong count when an adapter omits the changes meta.
    return { imported: null, skipped: null };
  }
  return { imported, skipped: Math.max(0, players.length - imported) };
}
