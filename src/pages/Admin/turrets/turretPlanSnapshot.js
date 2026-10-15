import { createEmptyAssignments, completeAssignmentShifts } from "../../../features/turrets/turretAssignments.js";
import { normalizePlannerSettings } from "../../../features/turrets/plannerSettings.js";
import { defaultPlanLanguagesForLocale } from "../../../features/turrets/planLanguages.js";

/** Pure snapshot construction: no network, React state or browser storage mutations. */
export function initialTurretPlanSettings(locale) {
  return normalizePlannerSettings({
    planLanguages: defaultPlanLanguagesForLocale(locale),
  });
}

export function emptyTurretPlanSnapshot(locale) {
  return {
    settings: initialTurretPlanSettings(locale),
    assignments: createEmptyAssignments(),
  };
}

export function serverTurretPlanSnapshot(serverDraft, locale) {
  if (!serverDraft) return emptyTurretPlanSnapshot(locale);
  return {
    settings: normalizePlannerSettings(serverDraft.settings?.planLanguages ? serverDraft.settings : {
      ...serverDraft.settings,
      planLanguages: defaultPlanLanguagesForLocale(locale),
    }),
    assignments: completeAssignmentShifts(serverDraft.assignments),
  };
}
