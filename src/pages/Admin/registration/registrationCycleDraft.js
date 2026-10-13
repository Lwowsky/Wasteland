import { DEFAULT_REGISTRATION_SETTINGS } from "../../../features/registration/registrationSettings.js";

export function getUtcTime(value) {
  const date = new Date(value || "");

  if (Number.isNaN(date.getTime())) {
    return "00:00";
  }

  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(
    date.getUTCMinutes(),
  ).padStart(2, "0")}`;
}

export function getDefaultRegistrationCycleDraft() {
  return {
    cycleMode: DEFAULT_REGISTRATION_SETTINGS.cycleMode,
    wastelandAnchorAt: DEFAULT_REGISTRATION_SETTINGS.wastelandAnchorAt,
    wastelandIntervalDays:
      DEFAULT_REGISTRATION_SETTINGS.wastelandIntervalDays,
    wastelandDurationHours:
      DEFAULT_REGISTRATION_SETTINGS.wastelandDurationHours,
    registrationCloseMode:
      DEFAULT_REGISTRATION_SETTINGS.registrationCloseMode,
    registrationCloseBeforeHours:
      DEFAULT_REGISTRATION_SETTINGS.registrationCloseBeforeHours,
    registrationOpenWeekdayUtc:
      DEFAULT_REGISTRATION_SETTINGS.registrationOpenWeekdayUtc,
    registrationOpenTimeUtc:
      DEFAULT_REGISTRATION_SETTINGS.registrationOpenTimeUtc,
    manualOpensAt: "",
    manualClosesAt: "",
    autoOpenRegistration: DEFAULT_REGISTRATION_SETTINGS.autoOpenRegistration,
    autoCloseRegistration: DEFAULT_REGISTRATION_SETTINGS.autoCloseRegistration,
    opensAt: DEFAULT_REGISTRATION_SETTINGS.opensAt,
    closesAt: DEFAULT_REGISTRATION_SETTINGS.closesAt,
  };
}

export function createRegistrationCycleDraft(settings) {
  return {
    ...getDefaultRegistrationCycleDraft(),
    cycleMode: settings.cycleMode === "manual" ? "manual" : "automatic",
    wastelandAnchorAt:
      settings.wastelandAnchorAt ||
      DEFAULT_REGISTRATION_SETTINGS.wastelandAnchorAt,
    wastelandIntervalDays:
      Number(settings.wastelandIntervalDays) ||
      DEFAULT_REGISTRATION_SETTINGS.wastelandIntervalDays,
    wastelandDurationHours:
      Number(settings.wastelandDurationHours) ||
      DEFAULT_REGISTRATION_SETTINGS.wastelandDurationHours,
    registrationCloseMode:
      settings.registrationCloseMode ||
      DEFAULT_REGISTRATION_SETTINGS.registrationCloseMode,
    registrationCloseBeforeHours:
      Number(settings.registrationCloseBeforeHours) ||
      DEFAULT_REGISTRATION_SETTINGS.registrationCloseBeforeHours,
    registrationOpenWeekdayUtc: Number.isFinite(
      Number(settings.registrationOpenWeekdayUtc),
    )
      ? Number(settings.registrationOpenWeekdayUtc)
      : DEFAULT_REGISTRATION_SETTINGS.registrationOpenWeekdayUtc,
    registrationOpenTimeUtc:
      settings.registrationOpenTimeUtc ||
      DEFAULT_REGISTRATION_SETTINGS.registrationOpenTimeUtc,
    manualOpensAt: settings.manualOpensAt || "",
    manualClosesAt: settings.manualClosesAt || "",
    autoOpenRegistration: settings.autoOpenRegistration !== false,
    autoCloseRegistration: settings.autoCloseRegistration !== false,
    opensAt: settings.opensAt || "",
    closesAt: settings.closesAt || "",
  };
}

export function createRegistrationCycleSavePatch(draft, schedule) {
  return {
    ...draft,
    opensAt: schedule.opensAt,
    closesAt: schedule.closesAt,
    nextWastelandAt: schedule.eventStartAt,
    nextWastelandEndsAt: schedule.eventEndAt,
    manualOpensAt: draft.cycleMode === "manual" ? draft.manualOpensAt : "",
    manualClosesAt: draft.cycleMode === "manual" ? draft.manualClosesAt : "",
    autoOpenRegistration:
      draft.cycleMode === "automatic" ? true : draft.autoOpenRegistration,
    autoCloseRegistration:
      draft.cycleMode === "automatic" ? true : draft.autoCloseRegistration,
    publicRegistration: true,
  };
}
