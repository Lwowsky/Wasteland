// Incremental counters: O(1) statements per registration instead of COUNT(*)
// over every registration in the current period. D1 batch ensures atomicity.
function delta(record, type) {
  return record?.troopType === type || record?.troop_type === type ? 1 : 0;
}

function captain(record) {
  return record?.captain === true || record?.captain === 1 ? 1 : 0;
}

export function prepareStatsInsert(env, periodId, record) {
  return env.DB.prepare(`
    INSERT INTO stats (period_id, registered, fighters, riders, shooters, captains, updated_at)
    VALUES (?, 1, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(period_id) DO UPDATE SET
      registered = registered + 1,
      fighters = fighters + excluded.fighters,
      riders = riders + excluded.riders,
      shooters = shooters + excluded.shooters,
      captains = captains + excluded.captains,
      updated_at = CURRENT_TIMESTAMP
  `).bind(periodId, delta(record, "fighter"), delta(record, "rider"), delta(record, "shooter"), captain(record));
}

export function prepareStatsUpdate(env, periodId, existing, next) {
  if (!existing) throw new Error("STATS_UPDATE_REQUIRES_EXISTING_ROW");
  return env.DB.prepare(`
    UPDATE stats SET
      fighters = fighters + ?, riders = riders + ?,
      shooters = shooters + ?, captains = captains + ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE period_id = ?
  `).bind(
    delta(next, "fighter") - delta(existing, "fighter"),
    delta(next, "rider") - delta(existing, "rider"),
    delta(next, "shooter") - delta(existing, "shooter"),
    captain(next) - captain(existing),
    periodId,
  );
}

export function prepareStatsDelete(env, periodId, existing) {
  if (!existing) throw new Error("STATS_DELETE_REQUIRES_EXISTING_ROW");
  return env.DB.prepare(`
    UPDATE stats SET
      registered = registered - 1,
      fighters = fighters - ?, riders = riders - ?,
      shooters = shooters - ?, captains = captains - ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE period_id = ?
  `).bind(delta(existing, "fighter"), delta(existing, "rider"), delta(existing, "shooter"), captain(existing), periodId);
}

// Expensive absolute recount is deliberately retained ONLY for bulk import,
// administrative data repairs and cycle-wide structural operations.
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
    FROM registrations WHERE period_id = ?
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
