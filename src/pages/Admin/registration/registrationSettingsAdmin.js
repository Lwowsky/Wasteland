import {
  REGISTRATION_TIERS,
  getRequiredFieldCount,
  getStandardRegistrationSettings,
  getVisibleFieldCount,
  normalizeRegistrationSettings,
} from "../../../features/registration/registrationSettings.js";
import { getEnabledRegistrationShifts } from "../../../features/registration/registrationShifts.js";

export function getDisabledShiftConflicts(players, availableShifts) {
  const counts = new Map();

  for (const player of players || []) {
    const shift = player?.shift;

    if (!shift || availableShifts?.[shift] === true) {
      continue;
    }

    counts.set(shift, (counts.get(shift) || 0) + 1);
  }

  return [...counts.entries()].map(([shift, count]) => ({ shift, count }));
}

export function getRegistrationSettingsSummary(settings) {
  return {
    enabledShifts: getEnabledRegistrationShifts(settings.availableShifts),
    enabledTiers: REGISTRATION_TIERS.filter(
      (tier) => settings.availableTiers?.[tier] === true,
    ),
    requiredCount: getRequiredFieldCount(settings),
    visibleCount: getVisibleFieldCount(settings),
    allianceCount: Array.isArray(settings.alliances)
      ? settings.alliances.length
      : 0,
    rotation: Array.isArray(settings.allianceRotation)
      ? settings.allianceRotation
      : [],
  };
}

export function buildRegistrationCandidate(settings, patch) {
  return normalizeRegistrationSettings({
    ...settings,
    ...patch,
  });
}

export function getRegistrationValidationError(section, candidate) {
  if (section === "cycle") {
    const opensAt = new Date(candidate.opensAt || "").getTime();
    const closesAt = new Date(candidate.closesAt || "").getTime();

    if (!Number.isFinite(opensAt) || !Number.isFinite(closesAt)) {
      return "periodMissing";
    }

    if (closesAt <= opensAt) {
      return "period";
    }
  }

  if (
    section === "shifts" &&
    !Object.values(candidate.availableShifts || {}).some(Boolean)
  ) {
    return "shiftRequired";
  }

  if (
    section === "tiers" &&
    !Object.values(candidate.availableTiers || {}).some(Boolean)
  ) {
    return "tierRequired";
  }

  return "";
}

export function createRegistrationConfirmState({
  section,
  candidate,
  currentCycleOpen,
}) {
  if (section === "cycle") {
    return {
      kind: "cycle",
      section,
      candidate,
      startsImmediately:
        new Date(candidate.opensAt || "").getTime() <= Date.now(),
    };
  }

  if (
    currentCycleOpen &&
    ["shifts", "tiers", "formFields"].includes(section)
  ) {
    return {
      kind: "rules",
      section,
      candidate,
    };
  }

  return null;
}

export function getRegistrationConfirmContent(confirmState, r) {
  if (!confirmState) {
    return null;
  }

  if (confirmState.kind === "status") {
    return confirmState.closing
      ? {
          title: r.confirm.closeRegistrationTitle,
          description: r.confirm.closeRegistrationDescription,
          details: [r.confirm.closeRegistrationDetail],
          primaryLabel: r.sections.cycle.closeRegistration,
          secondaryLabel: "",
        }
      : {
          title: r.confirm.openRegistrationTitle,
          description: r.confirm.openRegistrationDescription,
          details: [r.confirm.openRegistrationDetail],
          primaryLabel: r.sections.cycle.openRegistration,
          secondaryLabel: "",
        };
  }

  if (confirmState.kind === "cycle") {
    return {
      title: confirmState.startsImmediately
        ? r.confirm.cycleImmediateTitle
        : r.confirm.cycleTitle,
      description: confirmState.startsImmediately
        ? r.confirm.cycleImmediateDescription
        : r.confirm.cycleDescription,
      details: [r.confirm.cycleDetailPlayers, r.confirm.cycleDetailHistory],
      primaryLabel: r.confirm.saveCycle,
      secondaryLabel: "",
    };
  }

  if (confirmState.kind === "rules") {
    const detail =
      confirmState.section === "tiers"
        ? r.confirm.tierExistingPlayers
        : confirmState.section === "shifts"
          ? r.confirm.shiftExistingPlayers
          : r.confirm.formExistingPlayers;

    return {
      title: r.confirm.activeCycleTitle,
      description: r.confirm.activeCycleDescription,
      details: [detail],
      primaryLabel: r.confirm.applyCurrent,
      secondaryLabel: r.confirm.nextCycleOnly,
    };
  }

  return {
    title: r.confirm.defaultsTitle,
    description: r.confirm.defaultsDescription,
    details: [
      r.confirm.defaultsDetailRules,
      r.confirm.defaultsDetailAlliances,
    ],
    primaryLabel: r.confirm.restoreDefaults,
    secondaryLabel: "",
  };
}

export function createDefaultsConfirmState(settings) {
  return {
    kind: "defaults",
    section: "defaults",
    candidate: getStandardRegistrationSettings(settings),
  };
}
