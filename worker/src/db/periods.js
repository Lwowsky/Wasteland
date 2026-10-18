import {
  getRegistrationCycleKey,
  getRegistrationCycleSchedule,
  isScheduleOpen,
} from "../services/registrationCycle.js";
import { buildRegistrationRulesSnapshot } from "../services/registrationRules.js";
import { getPublicCycleCloseAtMs } from "../../../shared/registrationCycle.js";
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

// Retain at most the former 24-hour grace window; for the ordinary
// Saturday/Sunday Wasteland close exactly at Monday 00:00 UTC.
export const PUBLIC_POST_WASTELAND_HOURS = 24;
const PUBLIC_POST_WASTELAND_MS = PUBLIC_POST_WASTELAND_HOURS * 60 * 60 * 1000;

export function isPublicDisplayPeriodVisible(period, nowMs = Date.now()) {
  if (!period) return false;
  const eventEndMs = Date.parse(period.wasteland_end_at || "");
  const opensMs = Date.parse(period.opens_at || "");
  return Number.isFinite(eventEndMs) &&
    (!Number.isFinite(opensMs) || nowMs >= opensMs) &&
    nowMs < getPublicCycleCloseAtMs(eventEndMs);
}

export async function getPublicDisplayPeriod(env, settings, nowMs = Date.now()) {
  // Creating the next cycle must not prematurely hide the previous cycle.
  const { period } = await ensureCurrentRegistrationPeriod(env, settings, nowMs);
  if (isPublicDisplayPeriodVisible(period, nowMs)) return period;

  // In particular, after the Wasteland starts, the automatic schedule points
  // at the NEXT event. Look up the previous event within the maximum grace window;
  // isPublicDisplayPeriodVisible applies the earlier Monday midnight cutoff.
  const cutoff = new Date(nowMs - PUBLIC_POST_WASTELAND_MS).toISOString();
  const nowIso = new Date(nowMs).toISOString();
  const previous = await env.DB.prepare(`
    SELECT * FROM registration_periods
    WHERE wasteland_end_at > ?
      AND (opens_at IS NULL OR opens_at <= ?)
    ORDER BY wasteland_end_at DESC, id DESC
    LIMIT 1
  `).bind(cutoff, nowIso).first();

  return isPublicDisplayPeriodVisible(previous, nowMs) ? previous : null;
}

// A manual reset creates a fresh period without changing the recurring schedule.
// This mapping is only consulted for the matching schedule key; future weeks
// continue following the configured automatic schedule normally.
async function getEffectiveCycleKey(env, scheduleKey) {
  if (!scheduleKey) return "";
  try {
    const row = await env.DB.prepare(`
      SELECT active_cycle_key AS cycleKey
      FROM registration_cycle_resets WHERE schedule_key = ? LIMIT 1
    `).bind(scheduleKey).first();
    return row?.cycleKey || scheduleKey;
  } catch (error) {
    // Allow normal public traffic during rolling migration deployments.
    if (/no such table: registration_cycle_resets/i.test(String(error))) {
      return scheduleKey;
    }
    throw error;
  }
}

export async function startFreshRegistrationCycle(env, settings, nowMs = Date.now()) {
  const schedule = getRegistrationCycleSchedule(settings, nowMs);
  if (!(schedule.openAtMs <= nowMs && nowMs < schedule.closeAtMs &&
      nowMs < schedule.eventStartAtMs)) {
    throw new Error("CYCLE_WINDOW_CLOSED");
  }
  const scheduleKey = getRegistrationCycleKey(settings, schedule);
  if (!scheduleKey) throw new Error("INVALID_REGISTRATION_PERIOD");
  const cycleNumber = await getNextCycleNumber(env);
  const uniqueKey = `${scheduleKey}:reset:${cycleNumber}`;
  const snapshot = buildRegistrationRulesSnapshot(settings);
  // D1 batch provides transactional all-or-nothing behavior. No old players
  // are deleted; the new period gets a fresh, empty registration namespace.
  await env.DB.batch([
    env.DB.prepare(`UPDATE registration_periods SET status = 'closed',
      updated_at = CURRENT_TIMESTAMP WHERE status = 'open'`),
    env.DB.prepare(`INSERT INTO registration_periods (
      cycle_number, cycle_key, name, status, opens_at, closes_at,
      wasteland_start_at, wasteland_end_at, rules_snapshot_json
    ) VALUES (?, ?, ?, 'open', ?, ?, ?, ?, ?)`)
      .bind(cycleNumber, uniqueKey, `Registration cycle ${cycleNumber}`,
        schedule.opensAt, schedule.closesAt, schedule.eventStartAt,
        schedule.eventEndAt, JSON.stringify(snapshot)),
    env.DB.prepare(`INSERT INTO registration_cycle_resets
      (schedule_key, active_cycle_key, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(schedule_key) DO UPDATE SET
      active_cycle_key = excluded.active_cycle_key,
      updated_at = CURRENT_TIMESTAMP`).bind(scheduleKey, uniqueKey),
  ]);
  return getPeriodByCycleKey(env, uniqueKey);
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

  const cycleKey = await getEffectiveCycleKey(env, getRegistrationCycleKey(settings, schedule));

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
