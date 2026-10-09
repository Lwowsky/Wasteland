import { boolToInt } from "../utils/normalize.js";

export function prepareRegistrationInsert(env, periodId, record) {
  return env.DB.prepare(
    `
      INSERT INTO registrations (
        period_id,
        nickname,
        nickname_normalized,
        alliance,
        troop_type,
        tier,
        lair_level,
        march_size,
        rally_size,
        ready_attack,
        captain,
        shift,
        extra_fighter_enabled,
        extra_fighter_tier,
        extra_rider_enabled,
        extra_rider_tier,
        extra_shooter_enabled,
        extra_shooter_tier,
        comment,
        custom_fields_json
      )
      VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?
      )
    `,
  ).bind(
    periodId,
    record.nickname,
    record.nicknameNormalized,
    record.alliance,
    record.troopType,
    record.tier,
    record.lairLevel,
    record.marchSize,
    record.rallySize,
    boolToInt(record.readyAttack),
    boolToInt(record.captain),
    record.shift,
    boolToInt(record.extraSquads.fighter.enabled),
    record.extraSquads.fighter.tier,
    boolToInt(record.extraSquads.rider.enabled),
    record.extraSquads.rider.tier,
    boolToInt(record.extraSquads.shooter.enabled),
    record.extraSquads.shooter.tier,
    record.comment,
    JSON.stringify(record.customFields || {}),
  );
}

export function preparePublicPlayerInsert(
  env,
  registrationId,
  periodId,
  record,
) {
  return env.DB.prepare(
    `
      INSERT INTO public_players (
        registration_id,
        period_id,
        nickname,
        alliance,
        troop_type,
        tier,
        lair_level,
        march_size,
        rally_size,
        ready_attack,
        captain,
        shift,
        extra_fighter_enabled,
        extra_fighter_tier,
        extra_rider_enabled,
        extra_rider_tier,
        extra_shooter_enabled,
        extra_shooter_tier
      )
      VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?
      )
    `,
  ).bind(
    registrationId,
    periodId,
    record.nickname,
    record.alliance,
    record.troopType,
    record.tier,
    record.lairLevel,
    record.marchSize,
    record.rallySize,
    boolToInt(record.readyAttack),
    boolToInt(record.captain),
    record.shift,
    boolToInt(record.extraSquads.fighter.enabled),
    record.extraSquads.fighter.tier,
    boolToInt(record.extraSquads.rider.enabled),
    record.extraSquads.rider.tier,
    boolToInt(record.extraSquads.shooter.enabled),
    record.extraSquads.shooter.tier,
  );
}

export function preparePublicPlayerInsertFromRegistration(
  env,
  periodId,
  nicknameNormalized,
) {
  return env.DB.prepare(
    `
      INSERT INTO public_players (
        registration_id,
        period_id,
        nickname,
        alliance,
        troop_type,
        tier,
        lair_level,
        march_size,
        rally_size,
        ready_attack,
        captain,
        shift,
        extra_fighter_enabled,
        extra_fighter_tier,
        extra_rider_enabled,
        extra_rider_tier,
        extra_shooter_enabled,
        extra_shooter_tier
      )
      SELECT
        id,
        period_id,
        nickname,
        alliance,
        troop_type,
        tier,
        lair_level,
        march_size,
        rally_size,
        ready_attack,
        captain,
        shift,
        extra_fighter_enabled,
        extra_fighter_tier,
        extra_rider_enabled,
        extra_rider_tier,
        extra_shooter_enabled,
        extra_shooter_tier
      FROM registrations
      WHERE period_id = ?
        AND nickname_normalized = ?
      LIMIT 1
    `,
  ).bind(periodId, nicknameNormalized);
}

export function prepareRegistrationUpdate(
  env,
  registrationId,
  record,
) {
  return env.DB.prepare(
    `
      UPDATE registrations
      SET
        nickname = ?,
        nickname_normalized = ?,
        alliance = ?,
        troop_type = ?,
        tier = ?,
        lair_level = ?,
        march_size = ?,
        rally_size = ?,
        ready_attack = ?,
        captain = ?,
        shift = ?,
        extra_fighter_enabled = ?,
        extra_fighter_tier = ?,
        extra_rider_enabled = ?,
        extra_rider_tier = ?,
        extra_shooter_enabled = ?,
        extra_shooter_tier = ?,
        comment = ?,
        custom_fields_json = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
  ).bind(
    record.nickname,
    record.nicknameNormalized,
    record.alliance,
    record.troopType,
    record.tier,
    record.lairLevel,
    record.marchSize,
    record.rallySize,
    boolToInt(record.readyAttack),
    boolToInt(record.captain),
    record.shift,
    boolToInt(record.extraSquads.fighter.enabled),
    record.extraSquads.fighter.tier,
    boolToInt(record.extraSquads.rider.enabled),
    record.extraSquads.rider.tier,
    boolToInt(record.extraSquads.shooter.enabled),
    record.extraSquads.shooter.tier,
    record.comment,
    JSON.stringify(record.customFields || {}),
    registrationId,
  );
}

export function preparePublicPlayerUpdate(env, registrationId, record) {
  return env.DB.prepare(
    `
      UPDATE public_players
      SET
        nickname = ?,
        alliance = ?,
        troop_type = ?,
        tier = ?,
        lair_level = ?,
        march_size = ?,
        rally_size = ?,
        ready_attack = ?,
        captain = ?,
        shift = ?,
        extra_fighter_enabled = ?,
        extra_fighter_tier = ?,
        extra_rider_enabled = ?,
        extra_rider_tier = ?,
        extra_shooter_enabled = ?,
        extra_shooter_tier = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE registration_id = ?
    `,
  ).bind(
    record.nickname,
    record.alliance,
    record.troopType,
    record.tier,
    record.lairLevel,
    record.marchSize,
    record.rallySize,
    boolToInt(record.readyAttack),
    boolToInt(record.captain),
    record.shift,
    boolToInt(record.extraSquads.fighter.enabled),
    record.extraSquads.fighter.tier,
    boolToInt(record.extraSquads.rider.enabled),
    record.extraSquads.rider.tier,
    boolToInt(record.extraSquads.shooter.enabled),
    record.extraSquads.shooter.tier,
    registrationId,
  );
}

export function prepareDeleteRegistrationStatements(env, registrationId) {
  return [
    env.DB.prepare(`DELETE FROM public_players WHERE registration_id = ?`).bind(
      registrationId,
    ),
    env.DB.prepare(`DELETE FROM registrations WHERE id = ?`).bind(
      registrationId,
    ),
  ];
}

export function prepareClearPeriodStatements(env, periodId) {
  return [
    env.DB.prepare(`DELETE FROM public_players WHERE period_id = ?`).bind(
      periodId,
    ),
    env.DB.prepare(`DELETE FROM registrations WHERE period_id = ?`).bind(
      periodId,
    ),
    env.DB.prepare(`DELETE FROM stats WHERE period_id = ?`).bind(periodId),
  ];
}
