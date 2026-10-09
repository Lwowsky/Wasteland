import {
  REGISTRATION_RETENTION_DAYS,
  getRegistrationCycleKey,
  getRegistrationCycleSchedule,
  isScheduleOpen,
} from "../services/registrationCycle.js";
import {
  applyRegistrationRulesSnapshot,
  buildRegistrationRulesSnapshot,
  parseRegistrationRulesSnapshot,
} from "../services/registrationRules.js";

export async function getLatestPeriod(env) {
  return env.DB.prepare(
    `
      SELECT *
      FROM registration_periods
      ORDER BY id DESC
      LIMIT 1
    `,
  ).first();
}

export async function getAdminWorkingPeriod(env, settings, nowMs = Date.now()) {
  const current = await ensureCurrentRegistrationPeriod(env, settings, nowMs);

  if (current.period) {
    return current.period;
  }

  const latestPeriod = await getLatestPeriod(env);

  if (!latestPeriod) {
    return null;
  }

  const cycleEndMs = Date.parse(
    latestPeriod.wasteland_end_at || latestPeriod.closes_at || "",
  );

  if (!Number.isFinite(cycleEndMs) || cycleEndMs < nowMs) {
    return null;
  }

  return latestPeriod;
}

export async function getPublicDisplayPeriod(env, settings, nowMs = Date.now()) {
  return getAdminWorkingPeriod(env, settings, nowMs);
}

export async function getPeriodByCycleKey(env, cycleKey) {
  if (!cycleKey) {
    return null;
  }

  return env.DB.prepare(
    `
      SELECT *
      FROM registration_periods
      WHERE cycle_key = ?
      LIMIT 1
    `,
  )
    .bind(cycleKey)
    .first();
}


export function isPeriodOpen(period, now = new Date()) {
  if (!period?.opens_at || !period?.closes_at) {
    return false;
  }

  const opensAt = new Date(period.opens_at);
  const closesAt = new Date(period.closes_at);

  if (Number.isNaN(opensAt.getTime()) || Number.isNaN(closesAt.getTime())) {
    return false;
  }

  return now >= opensAt && now <= closesAt;
}

export function getPeriodRules(period, fallbackSettings = {}) {
  return parseRegistrationRulesSnapshot(
    period?.rules_snapshot_json,
    fallbackSettings,
  );
}

export function getEffectiveRegistrationSettings(settings, period) {
  if (!period) {
    return settings;
  }

  return applyRegistrationRulesSnapshot(settings, getPeriodRules(period, settings));
}

export async function updatePeriodRulesSnapshot(
  env,
  periodId,
  settings,
  section = "all",
) {
  if (!periodId) {
    return null;
  }

  const period = await env.DB.prepare(
    `SELECT * FROM registration_periods WHERE id = ? LIMIT 1`,
  )
    .bind(periodId)
    .first();

  if (!period) {
    return null;
  }

  const currentRules = getPeriodRules(period, settings);
  const nextRules = buildRegistrationRulesSnapshot(currentRules);
  const candidateRules = buildRegistrationRulesSnapshot(settings);

  if (section === "shifts") {
    nextRules.availableShifts = candidateRules.availableShifts;
  } else if (section === "tiers") {
    nextRules.availableTiers = candidateRules.availableTiers;
  } else if (section === "formFields") {
    nextRules.visibleFields = candidateRules.visibleFields;
    nextRules.requiredFields = candidateRules.requiredFields;
    nextRules.customFields = candidateRules.customFields;
  } else {
    Object.assign(nextRules, candidateRules);
  }

  await env.DB.prepare(
    `
      UPDATE registration_periods
      SET rules_snapshot_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
  )
    .bind(JSON.stringify(nextRules), periodId)
    .run();

  return nextRules;
}

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

async function getNextCycleNumber(env) {
  const row = await env.DB.prepare(
    `
      SELECT COALESCE(MAX(cycle_number), 0) + 1 AS nextCycleNumber
      FROM registration_periods
    `,
  ).first();

  return Math.max(1, Number(row?.nextCycleNumber || 1));
}

async function updatePeriodFromSchedule(env, periodId, schedule, nowMs) {
  const status = isScheduleOpen(schedule, nowMs) ? "open" : "closed";

  await env.DB.prepare(
    `
      UPDATE registration_periods
      SET
        status = ?,
        opens_at = ?,
        closes_at = ?,
        wasteland_start_at = ?,
        wasteland_end_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
  )
    .bind(
      status,
      schedule.opensAt,
      schedule.closesAt,
      schedule.eventStartAt,
      schedule.eventEndAt,
      periodId,
    )
    .run();
}

async function ensurePeriodSnapshot(env, period, settings) {
  if (!period) {
    return period;
  }

  const parsed = (() => {
    try {
      return JSON.parse(period.rules_snapshot_json || "{}");
    } catch {
      return {};
    }
  })();

  if (parsed && Object.keys(parsed).length > 0) {
    return period;
  }

  const snapshot = buildRegistrationRulesSnapshot(settings);

  await env.DB.prepare(
    `
      UPDATE registration_periods
      SET rules_snapshot_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
  )
    .bind(JSON.stringify(snapshot), period.id)
    .run();

  return {
    ...period,
    rules_snapshot_json: JSON.stringify(snapshot),
  };
}

export async function ensureCurrentRegistrationPeriod(
  env,
  settings,
  nowMs = Date.now(),
) {
  const schedule = getRegistrationCycleSchedule(settings, nowMs);

  if (!schedule.opensAt || !schedule.closesAt) {
    return {
      period: null,
      schedule,
      created: false,
    };
  }

  if (nowMs < schedule.openAtMs) {
    return {
      period: null,
      schedule,
      created: false,
    };
  }

  const cycleKey = getRegistrationCycleKey(settings, schedule);

  if (!cycleKey) {
    return {
      period: null,
      schedule,
      created: false,
    };
  }

  let period = await getPeriodByCycleKey(env, cycleKey);

  if (period) {
    const expectedStatus = isScheduleOpen(schedule, nowMs) ? "open" : "closed";
    const periodCloseMs = Date.parse(period.closes_at || "");
    const manuallyClosedEarly =
      period.status === "closed" &&
      expectedStatus === "open" &&
      Number.isFinite(periodCloseMs) &&
      periodCloseMs <= nowMs &&
      period.closes_at !== schedule.closesAt;

    const needsUpdate =
      !manuallyClosedEarly &&
      (period.status !== expectedStatus ||
        period.opens_at !== schedule.opensAt ||
        period.closes_at !== schedule.closesAt ||
        period.wasteland_start_at !== schedule.eventStartAt ||
        period.wasteland_end_at !== schedule.eventEndAt);

    if (needsUpdate) {
      await updatePeriodFromSchedule(env, period.id, schedule, nowMs);
      period = await getPeriodByCycleKey(env, cycleKey);
    }

    period = await ensurePeriodSnapshot(env, period, settings);

    return {
      period,
      schedule,
      created: false,
    };
  }

  const cycleNumber = await getNextCycleNumber(env);
  const status = isScheduleOpen(schedule, nowMs) ? "open" : "closed";
  const name = `Registration cycle ${cycleNumber}`;
  const snapshot = buildRegistrationRulesSnapshot(settings);

  await env.DB.prepare(
    `
      UPDATE registration_periods
      SET status = 'closed', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'open'
    `,
  ).run();

  await env.DB.prepare(
    `
      INSERT OR IGNORE INTO registration_periods (
        cycle_number,
        cycle_key,
        name,
        status,
        opens_at,
        closes_at,
        wasteland_start_at,
        wasteland_end_at,
        rules_snapshot_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  )
    .bind(
      cycleNumber,
      cycleKey,
      name,
      status,
      schedule.opensAt,
      schedule.closesAt,
      schedule.eventStartAt,
      schedule.eventEndAt,
      JSON.stringify(snapshot),
    )
    .run();

  period = await getPeriodByCycleKey(env, cycleKey);

  await cleanupOldRegistrationPeriods(env, nowMs);

  return {
    period,
    schedule,
    created: true,
  };
}
