export {
  computeGameDayResetCloseAt,
  computeRegistrationCloseAt,
  computeRegistrationOpenAt,
  getAutomaticRegistrationCycleSchedule,
  getNextWastelandStart,
  getRegistrationCycleSchedule,
} from "../../../shared/registrationCycle.js";

export {
  DEFAULT_REGISTRATION_CLOSE_BEFORE_HOURS,
  DEFAULT_REGISTRATION_CLOSE_MODE,
  DEFAULT_REGISTRATION_OPEN_TIME_UTC,
  DEFAULT_REGISTRATION_OPEN_WEEKDAY_UTC,
  DEFAULT_WASTELAND_ANCHOR_ISO,
  DEFAULT_WASTELAND_DURATION_HOURS,
  DEFAULT_WASTELAND_INTERVAL_DAYS,
} from "../../../shared/registrationConfig.js";

import { getRegistrationCycleSchedule } from "../../../shared/registrationCycle.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export function applyRegistrationCycle(settings = {}, fromMs = Date.now()) {
  const schedule = getRegistrationCycleSchedule(settings, fromMs);

  return {
    ...settings,
    opensAt: schedule.opensAt,
    closesAt: schedule.closesAt,
    manualOpensAt:
      settings.cycleMode === "manual" ? settings.manualOpensAt || "" : "",
    manualClosesAt:
      settings.cycleMode === "manual" ? settings.manualClosesAt || "" : "",
    nextWastelandAt: schedule.eventStartAt,
    nextWastelandEndsAt: schedule.eventEndAt,
  };
}

export function formatRemainingTime(targetValue, nowMs = Date.now()) {
  const targetMs = new Date(targetValue || "").getTime();

  if (!Number.isFinite(targetMs)) {
    return null;
  }

  const diff = targetMs - nowMs;

  if (diff <= 0) {
    return { totalMs: diff, days: 0, hours: 0, minutes: 0, passed: true };
  }

  const days = Math.floor(diff / DAY_MS);
  const hours = Math.floor((diff % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((diff % HOUR_MS) / MINUTE_MS);

  return { totalMs: diff, days, hours, minutes, passed: false };
}

export function toUtcDateTimeLocalValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 16);
}

export function fromUtcDateTimeLocalValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}Z`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
