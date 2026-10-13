// SQL is a single statement so it can be included in the same D1 batch
// as the registration and its public mirror. No partial statistics updates.
export function prepareStatsRefresh(env, periodId) {
  return env.DB.prepare(`
    INSERT INTO stats (
      period_id, registered, fighters, riders, shooters, captains, updated_at
    )
    SELECT
      ?, COUNT(*),
      COALESCE(SUM(CASE WHEN troop_type = 'fighter' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN troop_type = 'rider' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN troop_type = 'shooter' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN captain = 1 THEN 1 ELSE 0 END), 0),
      CURRENT_TIMESTAMP
    FROM registrations
    WHERE period_id = ?
    ON CONFLICT(period_id) DO UPDATE SET
      registered = excluded.registered,
      fighters = excluded.fighters,
      riders = excluded.riders,
      shooters = excluded.shooters,
      captains = excluded.captains,
      updated_at = CURRENT_TIMESTAMP
  `).bind(periodId, periodId);
}

export async function rebuildStats(env, periodId) {
  await prepareStatsRefresh(env, periodId).run();
}
