import { getEnabledRegistrationShifts } from "../registration/registrationShifts.js";
import { DEFAULT_AVAILABLE_SHIFTS } from "../../../shared/registrationConfig.js";
import { PLANNER_SHIFTS } from "./plannerConstants.js";

/** The same enabled-shift configuration that powers the registration table. */
export function getActivePlannerShifts(availableShifts) {
  const enabled = getEnabledRegistrationShifts(availableShifts || DEFAULT_AVAILABLE_SHIFTS)
    .filter((shift) => PLANNER_SHIFTS.includes(shift));
  return enabled.length ? enabled : ["shift1", "shift2"];
}
