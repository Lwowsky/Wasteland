import {
  getRegistrationCycleKey,
  getRegistrationCycleSchedule,
  isScheduleOpen,
} from "../services/registrationCycle.js";
import { buildRegistrationRulesSnapshot } from "../services/registrationRules.js";
import { cleanupOldRegistrationPeriods } from "./periods/periodMaintenance.js";

// Keep existing public imports stable while grouping related D1 operations.
export {
  cleanupOldRegistrationPeriods,
  remapPeriodShifts,
} from "./periods/periodMaintenance.js";
export {
  getEffectiveRegistrationSettings,
  getPeriodRules,
  updatePeriodRulesSnapshot,
} from "./periods/periodRules.js";

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
