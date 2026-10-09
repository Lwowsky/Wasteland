import { json } from "../utils/response.js";
import { getPublicDisplayPeriod } from "../db/periods.js";
import { getRegistrationSettings } from "../db/registrationSettings.js";

export async function handleRecent(env, url) {
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit")) || 5, 1),
    20,
  );

  const settings = await getRegistrationSettings(env);
  const period = await getPublicDisplayPeriod(env, settings);

  if (!period) {
    return json([]);
  }

  const result = await env.DB.prepare(
    `
      SELECT
        id,
        COALESCE(nickname, '') AS nickname,
        COALESCE(alliance, '') AS alliance,
        COALESCE(troop_type, '') AS troopType,
        COALESCE(tier, '') AS tier,
        captain,
        COALESCE(shift, '') AS shift,
        created_at AS createdAt
      FROM public_players
      WHERE period_id = ?
      ORDER BY id DESC
      LIMIT ?
    `,
  )
    .bind(period.id, limit)
    .all();

  return json(result.results);
}
