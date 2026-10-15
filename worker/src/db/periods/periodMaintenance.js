import { REGISTRATION_RETENTION_DAYS } from "../../services/registrationCycle.js";

export async function remapPeriodShifts(
  env,
  periodId,
  shiftMapping = {},
  availableShifts = {},
) {
  if (!periodId) {
    return;
  }

  const rows = await env.DB.prepare(
    `
      SELECT shift, COUNT(*) AS count
      FROM registrations
      WHERE period_id = ?
        AND shift IS NOT NULL
      GROUP BY shift
    `,
  )
    .bind(periodId)
    .all();

  const statements = [];

  for (const row of rows.results || []) {
    const source = String(row.shift || "");

    if (!source || availableShifts?.[source] === true) {
      continue;
    }

    const target = String(shiftMapping?.[source] || "");

    if (!target || availableShifts?.[target] !== true) {
      throw new Error(`SHIFT_MAPPING_REQUIRED:${source}`);
    }

    statements.push(
      env.DB.prepare(
        `UPDATE registrations SET shift = ?, updated_at = CURRENT_TIMESTAMP WHERE period_id = ? AND shift = ?`,
      ).bind(target, periodId, source),
    );
    statements.push(
      env.DB.prepare(
        `UPDATE public_players SET shift = ?, updated_at = CURRENT_TIMESTAMP WHERE period_id = ? AND shift = ?`,
      ).bind(target, periodId, source),
    );
  }

  if (statements.length) {
    await env.DB.batch(statements);
  }
}

export async function cleanupOldRegistrationPeriods(
  env,
  nowMs = Date.now(),
  retentionDays = REGISTRATION_RETENTION_DAYS,
) {
  const cutoffIso = new Date(
    nowMs -
      Math.max(1, Number(retentionDays) || REGISTRATION_RETENTION_DAYS) *
        86_400_000,
  ).toISOString();

  const oldPeriods = await env.DB.prepare(
    `
      SELECT id
      FROM registration_periods
      WHERE closes_at IS NOT NULL
        AND closes_at < ?
    `,
  )
    .bind(cutoffIso)
    .all();

  if (!oldPeriods.results.length) {
    return 0;
  }

  const ids = oldPeriods.results.map((row) => Number(row.id)).filter(Boolean);

  if (!ids.length) {
    return 0;
  }

  const placeholders = ids.map(() => "?").join(", ");

  await env.DB.batch([
    env.DB.prepare(
      `DELETE FROM content_access_sessions WHERE period_id IN (${placeholders})`,
    ).bind(...ids),
    env.DB.prepare(
      `DELETE FROM content_access_tokens WHERE period_id IN (${placeholders})`,
    ).bind(...ids),
    env.DB.prepare(
      `DELETE FROM public_players WHERE period_id IN (${placeholders})`,
    ).bind(...ids),
    env.DB.prepare(
      `DELETE FROM registrations WHERE period_id IN (${placeholders})`,
    ).bind(...ids),
    env.DB.prepare(`DELETE FROM stats WHERE period_id IN (${placeholders})`).bind(
      ...ids,
    ),
    env.DB.prepare(
      `DELETE FROM registration_periods WHERE id IN (${placeholders})`,
    ).bind(...ids),
  ]);

  return ids.length;
}

