import { DEFAULT_REGISTRATION_SETTINGS } from "../../features/registration/registrationSettings.js";
import { REGISTRATION_TROOP_TYPES } from "../../../shared/registrationConfig.js";

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

export function isRegistrationFieldVisible(visibleFields, field) {
  return visibleFields[field] !== false;
}

export function isRegistrationFieldRequired(
  visibleFields,
  requiredFields,
  field,
) {
  return (
    isRegistrationFieldVisible(visibleFields, field) &&
    requiredFields[field] === true
  );
}

function hasEnabledExtraSquad(data) {
  return Object.values(data.extraSquads || {}).some(
    (squad) => squad?.enabled === true,
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

function normalizeTemplateExtraSquads(template, troopType) {
  return Object.fromEntries(
    REGISTRATION_TROOP_TYPES.map((type) => [
      type,
      {
        enabled:
          troopType !== type &&
          (template.extraSquads?.[type]?.enabled ?? false),
        tier: template.extraSquads?.[type]?.tier || "T10",
      },
    ]),
  );
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
  const alliance = alliances.some(
    (item) => item.tag === template.alliance,
  )
    ? template.alliance
    : "";

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
    extraSquads: normalizeTemplateExtraSquads(template, troopType),
  };
}

export function createTemplateUpdate(template, data) {
  return {
    ...template,
    nickname: data.nickname,
    alliance: data.alliance,
    troopType: data.troopType,
    tier: data.tier,
    lairLevel: data.lairLevel,
    marchSize: data.marchSize,
    rallySize: data.rallySize,
    shift: data.shift,
    extraSquads: data.extraSquads,
  };
}
