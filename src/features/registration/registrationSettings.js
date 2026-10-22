import {
  DEFAULT_AVAILABLE_SHIFTS,
  DEFAULT_AVAILABLE_TIERS,
  DEFAULT_REGISTRATION_CYCLE_SETTINGS,
  DEFAULT_REQUIRED_FIELDS,
  DEFAULT_VISIBLE_FIELDS,
  REGISTRATION_FORM_FIELDS,
  REGISTRATION_TIERS,
} from "../../../shared/registrationConfig.js";
import { applyRegistrationCycle } from "./registrationCycle.js";

export { REGISTRATION_FORM_FIELDS, REGISTRATION_TIERS };

export const DEFAULT_REGISTRATION_SETTINGS = {
  periodId: null,

  ...DEFAULT_REGISTRATION_CYCLE_SETTINGS,

  opensAt: "",
  closesAt: "",
  nextWastelandAt: "",
  nextWastelandEndsAt: "",

  publicRegistration: true,

  hostAlliance: "",
  governor: "",
  captureRegion1: false,
  captureRegion2: false,
  captureRegion1Shifts: 2,
  captureRegion2Shifts: 2,
  alliances: [],
  allianceRotation: [],

  availableShifts: { ...DEFAULT_AVAILABLE_SHIFTS },
  availableTiers: { ...DEFAULT_AVAILABLE_TIERS },
  visibleFields: { ...DEFAULT_VISIBLE_FIELDS },
  requiredFields: { ...DEFAULT_REQUIRED_FIELDS },

  customFields: [],
};

function normalizeAlliances(settings) {
  if (Array.isArray(settings.alliances)) {
    return settings.alliances
      .map((item) => ({
        tag: String(item?.tag ?? "").trim().toUpperCase().slice(0, 3),
        name: String(item?.name ?? "").trim(),
      }))
      .filter((item) => item.tag && item.name);
  }

  if (Array.isArray(settings.allianceRotation)) {
    return settings.allianceRotation
      .map((item) => {
        const legacyName = String(item?.allianceName ?? "").trim();
        return {
          tag: legacyName.toUpperCase().slice(0, 3),
          name: legacyName,
        };
      })
      .filter((item) => item.tag && item.name);
  }

  return [];
}


export function normalizeAllianceRotation(value, alliances = []) {
  const availableAllianceTags = new Set(
    alliances.map((alliance) => alliance.tag),
  );
  const rotation = [];

  for (const item of value || []) {
    const tag = String(
      typeof item === "string"
        ? item
        : item?.tag ?? item?.allianceTag ?? item?.allianceName ?? "",
    )
      .trim()
      .toUpperCase();

    if (availableAllianceTags.has(tag) && !rotation.includes(tag)) {
      rotation.push(tag);
    }
  }

  for (const alliance of alliances) {
    if (!rotation.includes(alliance.tag)) {
      rotation.push(alliance.tag);
    }
  }

  return rotation;
}

function normalizeCustomFields(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((field) => ({
      id: String(field?.id ?? "").trim(),
      label: String(field?.label ?? "").trim(),
      visible: field?.visible !== false,
      required: field?.visible !== false && field?.required === true,
    }))
    .filter((field) => field.id && field.label);
}

export function normalizeRegistrationSettings(settings = {}) {
  const visibleFields = {
    ...DEFAULT_REGISTRATION_SETTINGS.visibleFields,
    ...(settings.visibleFields || {}),
  };

  const requiredFields = {
    ...DEFAULT_REGISTRATION_SETTINGS.requiredFields,
    ...(settings.requiredFields || {}),
  };

  for (const field of REGISTRATION_FORM_FIELDS) {
    if (visibleFields[field] !== true) {
      requiredFields[field] = false;
    }
  }

  // Old GitHub snapshots and browser caches may still contain maxPlayers: 300.
  // It is a removed setting, not a limit on the current registration cycle.
  const { maxPlayers: _legacyMaxPlayers, ...activeSettings } = settings;
  void _legacyMaxPlayers;
  const normalized = {
    ...DEFAULT_REGISTRATION_SETTINGS,
    ...activeSettings,

    cycleMode: settings.cycleMode === "manual" ? "manual" : "automatic",
    hostAlliance: String(settings.hostAlliance ?? "").trim().toUpperCase(),
    governor: String(settings.governor ?? ""),
    captureRegion1Shifts: Math.max(1, Math.min(4, Number(settings.captureRegion1Shifts) || 2)),
    captureRegion2Shifts: Math.max(1, Math.min(4, Number(settings.captureRegion2Shifts) || 2)),

    availableShifts: {
      ...DEFAULT_REGISTRATION_SETTINGS.availableShifts,
      ...(settings.availableShifts || {}),
    },

    availableTiers: {
      ...DEFAULT_REGISTRATION_SETTINGS.availableTiers,
      ...(settings.availableTiers || {}),
    },

    visibleFields,
    requiredFields,
    customFields: normalizeCustomFields(settings.customFields),
    alliances: normalizeAlliances(settings),
  };

  normalized.allianceRotation = normalizeAllianceRotation(
    settings.allianceRotation,
    normalized.alliances,
  );

  return applyRegistrationCycle(normalized);
}


export function getStandardRegistrationSettings(current = {}) {
  return normalizeRegistrationSettings({
    ...current,
    cycleMode: DEFAULT_REGISTRATION_SETTINGS.cycleMode,
    wastelandAnchorAt: current.wastelandAnchorAt || DEFAULT_REGISTRATION_SETTINGS.wastelandAnchorAt,
    wastelandIntervalDays: DEFAULT_REGISTRATION_SETTINGS.wastelandIntervalDays,
    wastelandDurationHours: DEFAULT_REGISTRATION_SETTINGS.wastelandDurationHours,
    registrationCloseMode: DEFAULT_REGISTRATION_SETTINGS.registrationCloseMode,
    registrationCloseBeforeHours:
      DEFAULT_REGISTRATION_SETTINGS.registrationCloseBeforeHours,
    registrationOpenWeekdayUtc:
      DEFAULT_REGISTRATION_SETTINGS.registrationOpenWeekdayUtc,
    registrationOpenTimeUtc:
      DEFAULT_REGISTRATION_SETTINGS.registrationOpenTimeUtc,
    manualOpensAt: "",
    manualClosesAt: "",
    autoOpenRegistration: true,
    autoCloseRegistration: true,
    availableShifts: {
      ...DEFAULT_REGISTRATION_SETTINGS.availableShifts,
    },
    availableTiers: {
      ...DEFAULT_REGISTRATION_SETTINGS.availableTiers,
    },
    visibleFields: {
      ...DEFAULT_REGISTRATION_SETTINGS.visibleFields,
    },
    requiredFields: {
      ...DEFAULT_REGISTRATION_SETTINGS.requiredFields,
    },
    customFields: [],

    // Дані Пустоші та альянсів навмисно зберігаються.
    hostAlliance: current.hostAlliance ?? "",
    governor: current.governor ?? "",
    captureRegion1: current.captureRegion1 === true,
    captureRegion2: current.captureRegion2 === true,
    captureRegion1Shifts: current.captureRegion1Shifts ?? 2,
    captureRegion2Shifts: current.captureRegion2Shifts ?? 2,
    alliances: Array.isArray(current.alliances) ? current.alliances : [],
    allianceRotation: Array.isArray(current.allianceRotation)
      ? current.allianceRotation
      : [],
  });
}


export function getRequiredFieldCount(settings) {
  const builtInRequired = REGISTRATION_FORM_FIELDS.filter(
    (field) =>
      settings.visibleFields?.[field] !== false &&
      settings.requiredFields?.[field] === true,
  ).length;

  const customRequired = (settings.customFields || []).filter(
    (field) => field.visible !== false && field.required === true,
  ).length;

  return builtInRequired + customRequired;
}

export function getVisibleFieldCount(settings) {
  const builtInVisible = REGISTRATION_FORM_FIELDS.filter(
    (field) => settings.visibleFields?.[field] !== false,
  ).length;

  const customVisible = (settings.customFields || []).filter(
    (field) => field.visible !== false,
  ).length;

  return builtInVisible + customVisible;
}
