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

export const REGISTRATION_RETENTION_DAYS = 30;

export function getRegistrationCycleKey(settings, schedule) {
  if (settings.cycleMode === "manual") {
    return schedule.opensAt ? `manual:${schedule.opensAt}` : "";
  }

  return schedule.eventStartAt ? `auto:${schedule.eventStartAt}` : "";
}

export function isScheduleOpen(schedule, nowMs = Date.now()) {
  return Boolean(
    schedule?.openAtMs &&
      schedule?.closeAtMs &&
      nowMs >= schedule.openAtMs &&
      nowMs <= schedule.closeAtMs,
  );
}
