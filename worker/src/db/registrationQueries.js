import { parseObjectJson } from "../utils/normalize.js";

export async function getRegistrationRows(env, periodId) {
  const result = await env.DB.prepare(
    `
      SELECT
        id,
        period_id AS periodId,
        COALESCE(nickname, '') AS nickname,
        COALESCE(alliance, '') AS alliance,
        COALESCE(troop_type, '') AS troopType,
        COALESCE(tier, '') AS tier,
        lair_level AS lairLevel,
        march_size AS marchSize,
        rally_size AS rallySize,
        ready_attack AS readyAttack,
        captain,
        COALESCE(shift, '') AS shift,
        extra_fighter_enabled AS extraFighterEnabled,
        extra_fighter_tier AS extraFighterTier,
        extra_rider_enabled AS extraRiderEnabled,
        extra_rider_tier AS extraRiderTier,
        extra_shooter_enabled AS extraShooterEnabled,
        extra_shooter_tier AS extraShooterTier,
        comment,
        custom_fields_json AS customFieldsJson,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM registrations
      WHERE period_id = ?
      ORDER BY id DESC
    `,
  )
    .bind(periodId)
    .all();

  return (result.results || []).map(mapRegistrationRow);
}

function mapRegistrationRow(row) {
  return {
    id: row.id,
    periodId: row.periodId,
    nickname: row.nickname,
    alliance: row.alliance,
    troopType: row.troopType,
    tier: row.tier,
    lairLevel: row.lairLevel,
    marchSize: row.marchSize,
    rallySize: row.rallySize,
    readyAttack: row.readyAttack === 1,
    captain: row.captain === 1,
    readiness: {
      attack: row.readyAttack === 1,
      captain: row.captain === 1,
    },
    shift: row.shift,
    extraSquads: {
      fighter: {
        enabled: row.extraFighterEnabled === 1,
        tier: row.extraFighterTier,
      },
      rider: {
        enabled: row.extraRiderEnabled === 1,
        tier: row.extraRiderTier,
      },
      shooter: {
        enabled: row.extraShooterEnabled === 1,
        tier: row.extraShooterTier,
      },
    },
    comment: row.comment,
    customFields: parseObjectJson(row.customFieldsJson),
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function findRegistrationById(env, registrationId) {
  return env.DB.prepare(
    `
      SELECT *
      FROM registrations
      WHERE id = ?
      LIMIT 1
    `,
  )
    .bind(registrationId)
    .first();
}

export async function findRegistrationPeriod(env, registrationId) {
  return env.DB.prepare(
    `
      SELECT id, period_id AS periodId
      FROM registrations
      WHERE id = ?
      LIMIT 1
    `,
  )
    .bind(registrationId)
    .first();
}

export async function findDuplicateRegistration(
  env,
  periodId,
  nicknameNormalized,
  excludeRegistrationId = null,
) {
  if (excludeRegistrationId == null) {
    return env.DB.prepare(
      `
        SELECT id
        FROM registrations
        WHERE period_id = ?
          AND nickname_normalized = ?
        LIMIT 1
      `,
    )
      .bind(periodId, nicknameNormalized)
      .first();
  }

  return env.DB.prepare(
    `
      SELECT id
      FROM registrations
      WHERE period_id = ?
        AND nickname_normalized = ?
        AND id != ?
      LIMIT 1
    `,
  )
    .bind(periodId, nicknameNormalized, excludeRegistrationId)
    .first();
}

export async function getExistingNicknames(env, periodId) {
  const result = await env.DB.prepare(
    `
      SELECT nickname_normalized AS nicknameNormalized
      FROM registrations
      WHERE period_id = ?
    `,
  )
    .bind(periodId)
    .all();

  return new Set(
    (result.results || [])
      .map((row) => row.nicknameNormalized)
      .filter(Boolean),
  );
}

export async function getRegistrationCount(env, periodId) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM registrations WHERE period_id = ?`,
  )
    .bind(periodId)
    .first();

  return Number(row?.total || 0);
}
