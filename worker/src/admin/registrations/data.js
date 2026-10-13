import {
  REGISTRATION_SHIFT_KEYS,
  REGISTRATION_TROOP_TYPES,
} from "../../../../shared/registrationConfig.js";
import { normalizeNickname, toInt } from "../../utils/normalize.js";

const VALID_TROOP_TYPES = new Set(REGISTRATION_TROOP_TYPES);
const VALID_SHIFTS = new Set(REGISTRATION_SHIFT_KEYS);

export const IMPORT_MODES = new Set([
  "skipExisting",
  "replacePeriod",
  "replacePeriodAndClose",
]);

export function normalizeRegistrationBody(body = {}) {
  return {
    nickname: String(body.nickname ?? "").trim(),
    alliance: String(body.alliance ?? "").trim(),
    troopType: String(body.troopType ?? ""),
    tier: String(body.tier ?? ""),
    shift: String(body.shift ?? ""),
    lairLevel: toInt(body.lairLevel),
    marchSize: toInt(body.marchSize),
    rallySize: toInt(body.rallySize),
    readyAttack: body.readyAttack === true || body.readiness?.attack === true,
    captain: body.captain === true || body.readiness?.captain === true,
    extraSquads: body.extraSquads || {},
    comment: String(body.comment ?? "").trim(),
    customFields:
      body.customFields && typeof body.customFields === "object"
        ? body.customFields
        : null,
  };
}

export function validateRegistrationBody(data) {
  return Boolean(
    data.nickname &&
      data.alliance &&
      VALID_TROOP_TYPES.has(data.troopType) &&
      data.tier &&
      VALID_SHIFTS.has(data.shift),
  );
}

export function getExtraSquads(data) {
  const extra = data.extraSquads;

  const fighterEnabled =
    data.troopType !== "fighter" && extra.fighter?.enabled === true;
  const riderEnabled =
    data.troopType !== "rider" && extra.rider?.enabled === true;
  const shooterEnabled =
    data.troopType !== "shooter" && extra.shooter?.enabled === true;

  return {
    fighter: {
      enabled: fighterEnabled,
      tier: fighterEnabled ? extra.fighter?.tier || null : null,
    },
    rider: {
      enabled: riderEnabled,
      tier: riderEnabled ? extra.rider?.tier || null : null,
    },
    shooter: {
      enabled: shooterEnabled,
      tier: shooterEnabled ? extra.shooter?.tier || null : null,
    },
  };
}

export function normalizeNicknameForRegistration(data) {
  return normalizeNickname(data.nickname);
}

export function toRegistrationRecord(
  data,
  nicknameNormalized,
  customFields = data.customFields || {},
) {
  return {
    nickname: data.nickname,
    nicknameNormalized,
    alliance: data.alliance,
    troopType: data.troopType,
    tier: data.tier,
    lairLevel: data.lairLevel,
    marchSize: data.marchSize,
    rallySize: data.rallySize,
    readyAttack: data.readyAttack,
    captain: data.captain,
    shift: data.shift,
    extraSquads: getExtraSquads(data),
    comment: data.comment,
    customFields,
  };
}

