import { DEFAULT_REGISTRATION_SETTINGS } from "../../features/registration/registrationSettings.js";
import {
  isRegistrationFieldRequired,
  isRegistrationFieldVisible,
} from "../../../shared/registrationFieldRules.js";

export { isRegistrationFieldRequired, isRegistrationFieldVisible };
import { REGISTRATION_TROOP_TYPES } from "../../../shared/registrationConfig.js";
import { normalizeTemplateExtraSquads } from "../../features/playerTemplates/playerTemplatesStorage.js";

const STRING_FIELDS = [
  "nickname",
  "alliance",
  "troopType",
  "tier",
  "lairLevel",
  "marchSize",
  "rallySize",
  "shift",
  "comment",
];


export function createEmptyRegistration(customFields = []) {
  return {
    nickname: "",
    alliance: "",
    troopType: "",
    tier: "",
    lairLevel: "",
    marchSize: "",
    rallySize: "",
    readiness: {
      attack: false,
      captain: false,
    },
    shift: "",
    extraSquads: {
      fighter: { enabled: false, tier: "T10" },
      rider: { enabled: false, tier: "T10" },
      shooter: { enabled: false, tier: "T10" },
    },
    comment: "",
    customFields: Object.fromEntries(
      customFields.map((field) => [field.id, ""]),
    ),
  };
}

export function getRegistrationFormRules(settings = {}) {
  const visibleFields = {
    ...DEFAULT_REGISTRATION_SETTINGS.visibleFields,
    ...(settings.visibleFields || {}),
  };
  const requiredFields = {
    ...DEFAULT_REGISTRATION_SETTINGS.requiredFields,
    ...(settings.requiredFields || {}),
  };
  const availableTiers = {
    ...DEFAULT_REGISTRATION_SETTINGS.availableTiers,
    ...(settings.availableTiers || {}),
  };
  const alliances = Array.isArray(settings.alliances) ? settings.alliances : [];
  const customFields = Array.isArray(settings.customFields)
    ? settings.customFields.filter((field) => field?.id && field?.label)
    : [];
  const visibleCustomFields = customFields.filter(
    (field) => field.visible !== false,
  );

  return {
    rules: settings,
    visibleFields,
    requiredFields,
    availableTiers,
    alliances,
    customFields,
    visibleCustomFields,
  };
}

function normalizeAllianceTag(value = "") {
  return String(value).trim().toUpperCase();
}

function hasEnabledExtraSquad(data) {
  return REGISTRATION_TROOP_TYPES.some(
    (type) => type !== data.troopType && data.extraSquads?.[type]?.enabled === true,
  );
}

export function getInvalidRegistrationFields({
  data,
  rules,
  visibleFields,
  requiredFields,
  availableTiers,
  visibleCustomFields,
}) {
  const invalidFields = [];
  const required = (field) =>
    isRegistrationFieldRequired(visibleFields, requiredFields, field);
  const visible = (field) =>
    isRegistrationFieldVisible(visibleFields, field);

  for (const field of STRING_FIELDS) {
    if (required(field) && !String(data[field] ?? "").trim()) {
      invalidFields.push(field);
    }
  }

  if (
    visible("shift") &&
    data.shift &&
    rules.availableShifts?.[data.shift] !== true
  ) {
    invalidFields.push("shift");
  }

  if (
    visible("tier") &&
    data.tier &&
    availableTiers[data.tier] !== true
  ) {
    invalidFields.push("tier");
  }

  if (required("readyAttack") && data.readiness.attack !== true) {
    invalidFields.push("readyAttack");
  }

  if (required("captain") && data.readiness.captain !== true) {
    invalidFields.push("captain");
  }

  if (required("extraSquads") && !hasEnabledExtraSquad(data)) {
    invalidFields.push("extraSquads");
  }

  for (const field of visibleCustomFields) {
    if (
      field.required === true &&
      !String(data.customFields?.[field.id] ?? "").trim()
    ) {
      invalidFields.push(`custom:${field.id}`);
    }
  }

  return [...new Set(invalidFields)];
}


export function applyPlayerTemplateToRegistration(
  current,
  template,
  { rules, availableTiers, alliances },
) {
  const troopType = template.troopType || "";
  const shift =
    rules.availableShifts?.[template.shift] === true ? template.shift : "";
  const tier = availableTiers[template.tier] === true ? template.tier : "";
  const normalizedTemplateAlliance = normalizeAllianceTag(template.alliance);
  const matchedAlliance = alliances.find(
    (item) => normalizeAllianceTag(item.tag) === normalizedTemplateAlliance,
  );
  const alliance = matchedAlliance?.tag || normalizedTemplateAlliance;

  return {
    ...current,
    nickname: template.nickname || "",
    alliance,
    troopType,
    tier,
    lairLevel: template.lairLevel || "",
    marchSize: template.marchSize || "",
    rallySize: template.rallySize || "",
    shift,
    extraSquads: normalizeTemplateExtraSquads(template.extraSquads, troopType),
  };
}

export function createTemplateUpdate(template, data) {
  return {
    ...template,
    nickname: data.nickname,
    alliance: normalizeAllianceTag(data.alliance),
    troopType: data.troopType,
    tier: data.tier,
    lairLevel: data.lairLevel,
    marchSize: data.marchSize,
    rallySize: data.rallySize,
    shift: data.shift,
    extraSquads: normalizeTemplateExtraSquads(data.extraSquads, data.troopType),
  };
}
