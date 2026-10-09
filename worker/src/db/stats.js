export async function rebuildStats(env, periodId) {
  const result = await env.DB.prepare(
    `
      SELECT
        COUNT(*) AS registered,

        SUM(
          CASE
            WHEN troop_type = 'fighter'
            THEN 1
            ELSE 0
          END
        ) AS fighters,

        SUM(
          CASE
            WHEN troop_type = 'rider'
            THEN 1
            ELSE 0
          END
        ) AS riders,

        SUM(
          CASE
            WHEN troop_type = 'shooter'
            THEN 1
            ELSE 0
          END
        ) AS shooters,

        SUM(
          CASE
            WHEN captain = 1
            THEN 1
            ELSE 0
          END
        ) AS captains

      FROM registrations

      WHERE period_id = ?
    `,
  )
    .bind(periodId)
    .first();

  await env.DB.prepare(
    `
    INSERT INTO stats (
      period_id,
      registered,
      fighters,
      riders,
      shooters,
      captains,
      updated_at
    )

    VALUES (
      ?, ?, ?, ?, ?, ?,
      CURRENT_TIMESTAMP
    )

    ON CONFLICT(period_id)

    DO UPDATE SET
      registered =
        excluded.registered,

      fighters =
        excluded.fighters,

      riders =
        excluded.riders,

      shooters =
        excluded.shooters,

      captains =
        excluded.captains,

      updated_at =
        CURRENT_TIMESTAMP
  `,
  )
    .bind(
      periodId,

      Number(result?.registered || 0),

      Number(result?.fighters || 0),

      Number(result?.riders || 0),

      Number(result?.shooters || 0),

      Number(result?.captains || 0),
    )
    .run();
}
