import { json } from "../utils/response.js";

import { getPublicDisplayPeriod } from "../db/periods.js";
import { getRegistrationSettings } from "../db/registrationSettings.js";

export async function handlePlayers(env, url) {
  const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);

  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit")) || 50, 1),
    500,
  );

  const offset = (page - 1) * limit;

  const settings = await getRegistrationSettings(env);
  const period = await getPublicDisplayPeriod(env, settings);

  if (!period) {
    return json({
      players: [],
      page,
      limit,
      total: 0,
      pages: 0,
    });
  }

  const [playersResult, countResult] = await Promise.all([
    env.DB.prepare(
      `
        SELECT
          id,
          COALESCE(nickname, '') AS nickname,
          COALESCE(alliance, '') AS alliance,

          COALESCE(troop_type, '')
            AS troopType,

          COALESCE(tier, '') AS tier,

          lair_level
            AS lairLevel,

          march_size
            AS marchSize,

          rally_size
            AS rallySize,

          ready_attack
            AS readyAttack,

          captain,
          COALESCE(shift, '') AS shift,

          extra_fighter_enabled
            AS extraFighterEnabled,

          extra_fighter_tier
            AS extraFighterTier,

          extra_rider_enabled
            AS extraRiderEnabled,

          extra_rider_tier
            AS extraRiderTier,

          extra_shooter_enabled
            AS extraShooterEnabled,

          extra_shooter_tier
            AS extraShooterTier,

          created_at
            AS createdAt

        FROM public_players

        WHERE period_id = ?

        ORDER BY id DESC

        LIMIT ?
        OFFSET ?
      `,
    )
      .bind(period.id, limit, offset)
      .all(),

    env.DB.prepare(
      `
        SELECT
          COUNT(*) AS total

        FROM public_players

        WHERE period_id = ?
      `,
    )
      .bind(period.id)
      .first(),
  ]);

  const total = Number(countResult?.total || 0);

  return json({
    players: playersResult.results,

    page,
    limit,
    total,

    pages: Math.ceil(total / limit),
  });
}
