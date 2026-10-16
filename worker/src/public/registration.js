import {
  REGISTRATION_SHIFT_KEYS,
  REGISTRATION_TROOP_TYPES,
} from "../../../shared/registrationConfig.js";
import { normalizeNickname, toInt } from "../utils/normalize.js";
import { findDuplicateRegistration } from "../db/registrationQueries.js";
import {
  prepareCreateRegistrationStatements,
} from "../db/registrationWrites.js";
import { json } from "../utils/response.js";
import { clearPublicCaches } from "../utils/cache.js";
import {
  ensureCurrentRegistrationPeriod,
  getEffectiveRegistrationSettings,
  isPeriodOpen,
} from "../db/periods.js";
import { getRegistrationSettings } from "../db/registrationSettings.js";
import { sanitizeCustomFieldValues } from "../services/registrationRules.js";

const VALID_TROOP_TYPES = new Set(REGISTRATION_TROOP_TYPES);
const VALID_SHIFTS = new Set(REGISTRATION_SHIFT_KEYS);

function isVisible(settings, field) {
  return settings.visibleFields?.[field] !== false;
}

function isRequired(settings, field) {
  return isVisible(settings, field) && settings.requiredFields?.[field] === true;
}

function isShiftAllowed(shift, settings) {
  return (
    VALID_SHIFTS.has(shift) &&
    settings.availableShifts?.[shift] === true
  );
}

function isTierAllowed(tier, settings) {
  return Boolean(tier && settings.availableTiers?.[tier] === true);
}

function hasText(value) {
  return String(value ?? "").trim().length > 0;
}

function validateBuiltInFields(body, settings) {
  const nickname = String(body.nickname ?? "").trim();
  const alliance = String(body.alliance ?? "").trim();
  const troopType = String(body.troopType ?? "");
  const tier = String(body.tier ?? "");
  const shift = String(body.shift ?? "");

  if (isRequired(settings, "nickname") && !nickname) {
    return false;
  }

  if (isRequired(settings, "alliance") && !alliance) {
    return false;
  }

  if (isVisible(settings, "troopType")) {
    if (isRequired(settings, "troopType") && !troopType) {
      return false;
    }

    if (troopType && !VALID_TROOP_TYPES.has(troopType)) {
      return false;
    }
  }

  if (isVisible(settings, "tier")) {
    if (isRequired(settings, "tier") && !tier) {
      return false;
    }

    if (tier && !isTierAllowed(tier, settings)) {
      return false;
    }
  }

  if (isVisible(settings, "shift")) {
    if (isRequired(settings, "shift") && !shift) {
      return false;
    }

    if (shift && !isShiftAllowed(shift, settings)) {
      return false;
    }
  }

  for (const field of ["lairLevel", "marchSize", "rallySize", "comment"]) {
    if (isRequired(settings, field) && !hasText(body[field])) {
      return false;
    }
  }

  const readyAttack =
    body.readyAttack === true || body.readiness?.attack === true;
  const captain = body.captain === true || body.readiness?.captain === true;

  if (isRequired(settings, "readyAttack") && !readyAttack) {
    return false;
  }

  if (isRequired(settings, "captain") && !captain) {
    return false;
  }

  return true;
}

function normalizeExtraSquads(body, settings, troopType) {
  if (!isVisible(settings, "extraSquads")) {
    return {
      fighter: { enabled: false, tier: null },
      rider: { enabled: false, tier: null },
      shooter: { enabled: false, tier: null },
      valid: true,
    };
  }

  const source = body.extraSquads || {};
  const result = {};
  let enabledCount = 0;

  for (const type of REGISTRATION_TROOP_TYPES) {
    const enabled = troopType !== type && source[type]?.enabled === true;
    const tier = enabled ? String(source[type]?.tier ?? "") : "";

    if (enabled) {
      enabledCount += 1;

      if (!isTierAllowed(tier, settings)) {
        return { valid: false };
      }
    }

    result[type] = {
      enabled,
      tier: enabled ? tier : null,
    };
  }

  if (isRequired(settings, "extraSquads") && enabledCount === 0) {
    return { valid: false };
  }

  return {
    ...result,
    valid: true,
  };
}

function validateCustomFields(body, settings) {
  const customFields = Array.isArray(settings.customFields)
    ? settings.customFields
    : [];
  const values = sanitizeCustomFieldValues(body.customFields, customFields);

  for (const field of customFields) {
    if (field.visible === false) {
      continue;
    }

    if (field.required === true && !hasText(values[field.id])) {
      return { valid: false, values: {} };
    }
  }

  return { valid: true, values };
}

export async function handleRegistration(request, env) {
  const body = await request.json();
  const globalSettings = await getRegistrationSettings(env);

  if (globalSettings.publicRegistration === false) {
    return json({ success: false, error: "REGISTRATION_DISABLED" }, 403);
  }

  const { period } = await ensureCurrentRegistrationPeriod(env, globalSettings);

  if (!period || !isPeriodOpen(period)) {
    return json(
      {
        success: false,
        error: "REGISTRATION_CLOSED",
      },
      400,
    );
  }

  const settings = getEffectiveRegistrationSettings(globalSettings, period);

  if (!validateBuiltInFields(body, settings)) {
    return json({ success: false, error: "INVALID_DATA" }, 400);
  }

  const nickname = isVisible(settings, "nickname")
    ? String(body.nickname ?? "").trim()
    : "";
  const alliance = isVisible(settings, "alliance")
    ? String(body.alliance ?? "").trim().toUpperCase()
    : "";
  const troopType = isVisible(settings, "troopType")
    ? String(body.troopType ?? "")
    : "";
  const tier = isVisible(settings, "tier") ? String(body.tier ?? "") : "";
  const shift = isVisible(settings, "shift") ? String(body.shift ?? "") : "";

  const nicknameNormalized = nickname ? normalizeNickname(nickname) : null;

  if (nicknameNormalized) {
    const existing = await findDuplicateRegistration(
      env,
      period.id,
      nicknameNormalized,
    );

    if (existing) {
      return json({ success: false, error: "ALREADY_REGISTERED" }, 409);
    }
  }

  const extraSquads = normalizeExtraSquads(body, settings, troopType);
  if (!extraSquads.valid) {
    return json({ success: false, error: "INVALID_DATA" }, 400);
  }

  const customFields = validateCustomFields(body, settings);
  if (!customFields.valid) {
    return json({ success: false, error: "INVALID_DATA" }, 400);
  }

  const readyAttack =
    isVisible(settings, "readyAttack") &&
    (body.readyAttack === true || body.readiness?.attack === true);
  const captain =
    isVisible(settings, "captain") &&
    (body.captain === true || body.readiness?.captain === true);
  const comment = isVisible(settings, "comment")
    ? String(body.comment ?? "").trim()
    : "";

  const registrationRecord = {
    nickname: nickname || null,
    nicknameNormalized,
    alliance: alliance || null,
    troopType: troopType || null,
    tier: tier || null,
    lairLevel: isVisible(settings, "lairLevel") ? toInt(body.lairLevel) : 0,
    marchSize: isVisible(settings, "marchSize") ? toInt(body.marchSize) : 0,
    rallySize: isVisible(settings, "rallySize") ? toInt(body.rallySize) : 0,
    readyAttack,
    captain,
    shift: shift || null,
    extraSquads,
    comment,
    customFields: customFields.values,
  };

  const [registrationResult] = await env.DB.batch(
    prepareCreateRegistrationStatements(env, period.id, registrationRecord),
  );
  const registrationId = registrationResult.meta.last_row_id;
  try {
    await clearPublicCaches(request, env);
  } catch {
    // Committed registration remains successful if cache deletion fails.
  }

  return json({
    success: true,
    registrationId,
  });
}
