import { REGISTRATION_SHIFT_KEYS } from "../../../shared/registrationConfig.js";

export const REGISTRATION_SHIFTS = REGISTRATION_SHIFT_KEYS;

export function getEnabledRegistrationShifts(availableShifts) {
  return REGISTRATION_SHIFTS.filter(
    (shift) => availableShifts?.[shift] === true,
  );
}
