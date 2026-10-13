import {
  DEFAULT_AVAILABLE_SHIFTS,
  DEFAULT_AVAILABLE_TIERS,
  DEFAULT_REQUIRED_FIELDS,
  DEFAULT_VISIBLE_FIELDS,
  REGISTRATION_FORM_FIELDS,
  REGISTRATION_TIERS,
} from "../../../shared/registrationConfig.js";

export {
  DEFAULT_AVAILABLE_SHIFTS,
  DEFAULT_AVAILABLE_TIERS,
  DEFAULT_REQUIRED_FIELDS,
  DEFAULT_VISIBLE_FIELDS,
  REGISTRATION_FORM_FIELDS,
  REGISTRATION_TIERS,
};

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseJsonObject(value, fallback = {}) {
  if (!value) {
    return { ...fallback };
  }

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return isPlainObject(parsed) ? parsed : { ...fallback };
  } catch {
    return { ...fallback };
  }
}

export function parseJsonArray(value, fallback = []) {
  if (!value) {
    return [...fallback];
  }

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [...fallback];
  } catch {
    return [...fallback];
  }
}


export function sanitizeAvailableShifts(value) {
  const source = isPlainObject(value) ? value : {};
  const shifts = {
    shift1: source.shift1 === true,
    shift2: source.shift2 === true,
    shift3: source.shift3 === true,
    shift4: source.shift4 === true,
    flexible: source.flexible === true,
  };

  if (!Object.values(shifts).some(Boolean)) {
    return { ...DEFAULT_AVAILABLE_SHIFTS };
  }

  return shifts;
}

export function buildRegistrationRulesSnapshot(settings = {}) {
  const visibleFields = sanitizeVisibleFields(settings.visibleFields);

  return {
    availableShifts: sanitizeAvailableShifts(settings.availableShifts),
    availableTiers: sanitizeAvailableTiers(settings.availableTiers),
    visibleFields,
    requiredFields: sanitizeRequiredFields(
      settings.requiredFields,
      visibleFields,
    ),
    customFields: sanitizeCustomFields(settings.customFields),
  };
}

export function parseRegistrationRulesSnapshot(value, fallbackSettings = {}) {
  const parsed = parseJsonObject(value, {});

  if (!Object.keys(parsed).length) {
    return buildRegistrationRulesSnapshot(fallbackSettings);
  }

  const visibleFields = sanitizeVisibleFields(parsed.visibleFields);

  return {
    availableShifts: sanitizeAvailableShifts(parsed.availableShifts),
    availableTiers: sanitizeAvailableTiers(parsed.availableTiers),
    visibleFields,
    requiredFields: sanitizeRequiredFields(parsed.requiredFields, visibleFields),
    customFields: sanitizeCustomFields(parsed.customFields),
  };
}

export function applyRegistrationRulesSnapshot(settings = {}, snapshot = {}) {
  return {
    ...settings,
    ...buildRegistrationRulesSnapshot(snapshot),
  };
}

export function sanitizeAvailableTiers(value) {
  const source = isPlainObject(value) ? value : {};
  const tiers = Object.fromEntries(
    REGISTRATION_TIERS.map((tier) => [tier, source[tier] === true]),
  );

  if (!Object.values(tiers).some(Boolean)) {
    return { ...DEFAULT_AVAILABLE_TIERS };
  }

  return tiers;
}

export function sanitizeVisibleFields(value) {
  const source = isPlainObject(value) ? value : {};

  return Object.fromEntries(
    REGISTRATION_FORM_FIELDS.map((field) => [
      field,
      source[field] !== false,
    ]),
  );
}

export function sanitizeRequiredFields(value, visibleFields) {
  const source = isPlainObject(value) ? value : {};

  return Object.fromEntries(
    REGISTRATION_FORM_FIELDS.map((field) => [
      field,
      visibleFields[field] === true && source[field] === true,
    ]),
  );
}

export function sanitizeCustomFields(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();

  return value
    .map((field) => {
      const id = String(field?.id ?? "").trim().slice(0, 64);
      const label = String(field?.label ?? "").trim().slice(0, 120);
      const visible = field?.visible !== false;

      return {
        id,
        label,
        visible,
        required: visible && field?.required === true,
      };
    })
    .filter((field) => {
      if (!field.id || !field.label || seen.has(field.id)) {
        return false;
      }

      seen.add(field.id);
      return true;
    });
}

export function sanitizeAlliances(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();

  return value
    .map((item) => ({
      tag: String(item?.tag ?? "").trim().toUpperCase().slice(0, 3),
      name: String(item?.name ?? "").trim().slice(0, 120),
    }))
    .filter((item) => {
      if (!item.tag || !item.name || seen.has(item.tag)) {
        return false;
      }

      seen.add(item.tag);
      return true;
    });
}

export function sanitizeCustomFieldValues(value, customFields) {
  const source = isPlainObject(value) ? value : {};
  const result = {};

  for (const field of customFields) {
    if (field.visible === false) {
      continue;
    }

    result[field.id] = String(source[field.id] ?? "").trim().slice(0, 1000);
  }

  return result;
}
