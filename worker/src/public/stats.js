import { EMPTY_PUBLIC_STATS } from "../../../shared/publicStatsConfig.js";
import { json } from "../utils/response.js";

import { getPublicDisplayPeriod } from "../db/periods.js";
import { getRegistrationSettings } from "../db/registrationSettings.js";

export async function handleStats(env) {
  const settings = await getRegistrationSettings(env);
  const period = await getPublicDisplayPeriod(env, settings);

  if (!period) {
    return json(EMPTY_PUBLIC_STATS);
  }

  const [stats, alliancesResult] = await Promise.all([
    env.DB.prepare(
      `
        SELECT
          COUNT(*) AS registered,
          SUM(CASE WHEN troop_type = 'fighter' THEN 1 ELSE 0 END) AS fighters,
          SUM(CASE WHEN troop_type = 'rider' THEN 1 ELSE 0 END) AS riders,
          SUM(CASE WHEN troop_type = 'shooter' THEN 1 ELSE 0 END) AS shooters,
          SUM(CASE WHEN captain = 1 THEN 1 ELSE 0 END) AS captains,
          MAX(updated_at) AS updatedAt
        FROM public_players
        WHERE period_id = ?
      `,
    )
      .bind(period.id)
      .first(),

    env.DB.prepare(
      `
        SELECT
          alliance AS name,
          COUNT(*) AS players
        FROM public_players
        WHERE period_id = ?
        GROUP BY alliance
        ORDER BY players DESC, alliance ASC
      `,
    )
      .bind(period.id)
      .all(),
  ]);

  const allianceStats = alliancesResult.results.map((alliance) => ({
    name: alliance.name,
    players: Number(alliance.players),
  }));

  return json({
    registered: Number(stats?.registered || 0),
    fighters: Number(stats?.fighters || 0),
    riders: Number(stats?.riders || 0),
    shooters: Number(stats?.shooters || 0),
    captains: Number(stats?.captains || 0),
    alliances: allianceStats.length,
    finalPlayers: 0,
    allianceStats,
    updatedAt: stats?.updatedAt || null,
  });
}
