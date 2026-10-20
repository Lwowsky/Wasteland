import {
  DEFAULT_REGISTRATION_CLOSE_BEFORE_HOURS,
  DEFAULT_REGISTRATION_CLOSE_MODE,
  DEFAULT_REGISTRATION_OPEN_TIME_UTC,
  DEFAULT_REGISTRATION_OPEN_WEEKDAY_UTC,
  DEFAULT_WASTELAND_ANCHOR_ISO,
  DEFAULT_WASTELAND_DURATION_HOURS,
  DEFAULT_WASTELAND_INTERVAL_DAYS,
} from "./registrationConfig.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function normalizePositiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function parseUtcTime(value) {
  const match = String(value || "").match(/^(\d{2}):(\d{2})$/);
  if (!match) return { hours: 0, minutes: 0 };
  return {
    hours: Math.min(23, Math.max(0, Number(match[1]))),
    minutes: Math.min(59, Math.max(0, Number(match[2]))),
  };
}

function parseIsoMs(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function getNextWastelandStart(
  fromMs = Date.now(),
  anchorIso = DEFAULT_WASTELAND_ANCHOR_ISO,
  intervalDays = DEFAULT_WASTELAND_INTERVAL_DAYS,
) {
  const anchorMs = new Date(anchorIso).getTime();
  const safeAnchorMs = Number.isFinite(anchorMs)
    ? anchorMs
    : new Date(DEFAULT_WASTELAND_ANCHOR_ISO).getTime();
  const intervalMs =
    normalizePositiveNumber(intervalDays, DEFAULT_WASTELAND_INTERVAL_DAYS) * DAY_MS;
  const nowMs = Number(fromMs) || Date.now();
  if (nowMs <= safeAnchorMs) return safeAnchorMs;
  return safeAnchorMs + Math.ceil((nowMs - safeAnchorMs) / intervalMs) * intervalMs;
}

export function computeGameDayResetCloseAt(eventStartAtMs) {
  const date = new Date(Number(eventStartAtMs));
  if (Number.isNaN(date.getTime())) return 0;
  const daysSinceFriday = (date.getUTCDay() - 5 + 7) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceFriday);
  date.setUTCHours(0, 0, 0, 0);
  if (date.getTime() >= Number(eventStartAtMs)) date.setUTCDate(date.getUTCDate() - 7);
  return date.getTime();
}

export function computeRegistrationCloseAt({
  eventStartAtMs,
  closeMode = DEFAULT_REGISTRATION_CLOSE_MODE,
  closeBeforeHours = DEFAULT_REGISTRATION_CLOSE_BEFORE_HOURS,
}) {
  if (closeMode === "hoursBeforeStart") {
    return Number(eventStartAtMs) -
      normalizePositiveNumber(closeBeforeHours, DEFAULT_REGISTRATION_CLOSE_BEFORE_HOURS) * HOUR_MS;
  }
  return computeGameDayResetCloseAt(eventStartAtMs);
}

export function computeRegistrationOpenAt({
  closeAtMs,
  weekdayUtc = DEFAULT_REGISTRATION_OPEN_WEEKDAY_UTC,
  timeUtc = DEFAULT_REGISTRATION_OPEN_TIME_UTC,
}) {
  const closeDate = new Date(Number(closeAtMs));
  if (Number.isNaN(closeDate.getTime())) return 0;
  const targetWeekday = Math.min(6, Math.max(0, Number(weekdayUtc) || 0));
  const { hours, minutes } = parseUtcTime(timeUtc);
  const candidate = new Date(closeDate);
  const daysBack = (candidate.getUTCDay() - targetWeekday + 7) % 7;
  candidate.setUTCDate(candidate.getUTCDate() - daysBack);
  candidate.setUTCHours(hours, minutes, 0, 0);
  if (candidate.getTime() >= Number(closeAtMs)) candidate.setUTCDate(candidate.getUTCDate() - 7);
  return candidate.getTime();
}

export function getAutomaticRegistrationCycleSchedule(settings = {}, fromMs = Date.now()) {
  const eventStartAtMs = getNextWastelandStart(
    fromMs,
    settings.wastelandAnchorAt || DEFAULT_WASTELAND_ANCHOR_ISO,
    settings.wastelandIntervalDays || DEFAULT_WASTELAND_INTERVAL_DAYS,
  );
  const closeAtMs = computeRegistrationCloseAt({
    eventStartAtMs,
    closeMode: settings.registrationCloseMode || DEFAULT_REGISTRATION_CLOSE_MODE,
    closeBeforeHours: settings.registrationCloseBeforeHours || DEFAULT_REGISTRATION_CLOSE_BEFORE_HOURS,
  });
  const openAtMs = computeRegistrationOpenAt({
    closeAtMs,
    weekdayUtc: settings.registrationOpenWeekdayUtc ?? DEFAULT_REGISTRATION_OPEN_WEEKDAY_UTC,
    timeUtc: settings.registrationOpenTimeUtc || DEFAULT_REGISTRATION_OPEN_TIME_UTC,
  });

  // Wasteland is ALWAYS 24 hours. Ignore legacy/custom duration values.
  // Keep all cycle dates in UTC; the user-facing formatter handles local time zones.
  const eventEndAtMs = eventStartAtMs + DEFAULT_WASTELAND_DURATION_HOURS * HOUR_MS;
  return {
    eventStartAtMs,
    eventEndAtMs,
    openAtMs,
    closeAtMs,
    eventStartAt: new Date(eventStartAtMs).toISOString(),
    eventEndAt: new Date(eventEndAtMs).toISOString(),
    opensAt: new Date(openAtMs).toISOString(),
    closesAt: new Date(closeAtMs).toISOString(),
  };
}

export function getRegistrationCycleSchedule(settings = {}, fromMs = Date.now()) {
  const automatic = getAutomaticRegistrationCycleSchedule(settings, fromMs);
  if (settings.cycleMode !== "manual") return automatic;

  const manualOpenMs = parseIsoMs(settings.manualOpensAt || settings.opensAt);
  const manualCloseMs = parseIsoMs(settings.manualClosesAt || settings.closesAt);
  const openAtMs = manualOpenMs ?? (settings.autoOpenRegistration !== false ? automatic.openAtMs : 0);
  const closeAtMs = manualCloseMs ?? (settings.autoCloseRegistration !== false ? automatic.closeAtMs : 0);
  return {
    ...automatic,
    openAtMs,
    closeAtMs,
    opensAt: openAtMs ? new Date(openAtMs).toISOString() : "",
    closesAt: closeAtMs ? new Date(closeAtMs).toISOString() : "",
  };
}

// A fixed anchor is kept for cycle arithmetic. The displayed "last completed"
// value is derived from the browser/server clock, not persisted every fortnight.
export function getLastCompletedWastelandStart(settings = {}, fromMs = Date.now()) {
  const anchorMs = new Date(settings.wastelandAnchorAt || DEFAULT_WASTELAND_ANCHOR_ISO).getTime();
  if (!Number.isFinite(anchorMs) || !Number.isFinite(Number(fromMs))) return null;
  const intervalMs = normalizePositiveNumber(settings.wastelandIntervalDays, DEFAULT_WASTELAND_INTERVAL_DAYS) * DAY_MS;
  const firstCompletion = anchorMs + DEFAULT_WASTELAND_DURATION_HOURS * HOUR_MS;
  if (fromMs < firstCompletion) return null;
  const completedIndex = Math.floor((fromMs - firstCompletion) / intervalMs);
  return new Date(anchorMs + completedIndex * intervalMs).toISOString();
}

// Published roster and final plan close together at Monday 00:00 UTC after
// the 24-hour event. A non-Saturday manual/custom schedule never extends
// public retention beyond the pre-existing 24-hour grace window.
export function getPublicCycleCloseAtMs(eventEndAtMs) {
  if (!Number.isFinite(Number(eventEndAtMs))) return NaN;
  const date = new Date(Number(eventEndAtMs));
  const daysUntilMonday = (8 - date.getUTCDay()) % 7;
  const monday = new Date(date);
  monday.setUTCDate(monday.getUTCDate() + daysUntilMonday);
  monday.setUTCHours(0, 0, 0, 0);
  if (monday.getTime() <= date.getTime()) monday.setUTCDate(monday.getUTCDate() + 7);
  return Math.min(monday.getTime(), date.getTime() + DAY_MS);
}

// Pure display guard for static Pages. It prevents a stale cached encrypted
// JSON from remaining visible after the deadline, without Worker/D1 requests.
// Manual schedule dates are managed explicitly and cannot be inferred from
// a recurring calendar; the server still filters those by period.
export function getPublicCycleViewState(settings = {}, fromMs = Date.now()) {
  if (settings.cycleMode === "manual") return { state: "manual", visible: true, closesAt: null };
  const intervalMs = normalizePositiveNumber(settings.wastelandIntervalDays, DEFAULT_WASTELAND_INTERVAL_DAYS) * DAY_MS;
  const upcoming = getAutomaticRegistrationCycleSchedule(settings, fromMs);
  const previous = getAutomaticRegistrationCycleSchedule(settings, upcoming.eventStartAtMs - intervalMs);
  const anchorMs = new Date(settings.wastelandAnchorAt || DEFAULT_WASTELAND_ANCHOR_ISO).getTime();
  const visible = [upcoming, previous].find((schedule) =>
    schedule.eventStartAtMs >= anchorMs &&
    fromMs >= schedule.openAtMs &&
    fromMs < getPublicCycleCloseAtMs(schedule.eventEndAtMs));
  return visible
    ? { state: "open", visible: true, eventStartAt: visible.eventStartAt,
        closesAt: new Date(getPublicCycleCloseAtMs(visible.eventEndAtMs)).toISOString() }
    : { state: "closed", visible: false, eventStartAt: null, closesAt: null };
}

// Reject an old Friday's static snapshot instead of displaying last cycle's
// private data while GitHub Pages/CDN are still publishing the new cycle.
export function isSnapshotForCycle(snapshot, expectedEventStartAt) {
  return !expectedEventStartAt || snapshot?.cycleEventStartAt === expectedEventStartAt;
}

// A public JSON can remain cached at GitHub Pages/CDN after the old event
// expires. Never resurrect its players/plan, including in MANUAL calendar mode.
// This guard does not fetch Worker, Firebase, or D1.
export function isSnapshotForActivePeriod(snapshot, expectedPeriodId, nowMs = Date.now()) {
  if (!snapshot || typeof snapshot !== "object") return false;
  if (expectedPeriodId !== undefined) {
    const snapshotPeriod = snapshot.periodId == null ? null : Number(snapshot.periodId);
    const expectedPeriod = expectedPeriodId == null ? null : Number(expectedPeriodId);
    if (snapshotPeriod !== expectedPeriod) return false;
  }
  if (snapshot.cycleEventStartAt != null) {
    const startMs = Date.parse(snapshot.cycleEventStartAt);
    if (!Number.isFinite(startMs) || !Number.isFinite(Number(nowMs))) return false;
    if (nowMs >= getPublicCycleCloseAtMs(startMs + DEFAULT_WASTELAND_DURATION_HOURS * HOUR_MS)) return false;
  }
  return true;
}
