import { REGISTRATION_SHIFTS } from "../../../features/registration/registrationShifts.js";
import {
  REGISTRATION_TIERS,
  REGISTRATION_TROOP_TYPES,
} from "../../../../shared/registrationConfig.js";

export const TROOP_TYPES = REGISTRATION_TROOP_TYPES;

export const TIERS = REGISTRATION_TIERS;

export const SHIFTS = REGISTRATION_SHIFTS;

export function createEmptyPlayer() {
  return {
    nickname: "",
    alliance: "",

    troopType: "fighter",
    tier: "T10",

    lairLevel: 0,
    marchSize: 0,
    rallySize: 0,

    shift: "",

    readyAttack: false,
    captain: false,

    extraSquads: {
      fighter: {
        enabled: false,
        tier: "T10",
      },

      rider: {
        enabled: false,
        tier: "T10",
      },

      shooter: {
        enabled: false,
        tier: "T10",
      },
    },

    comment: "",
    customFields: {},
  };
}

export function playerToForm(player) {
  if (!player) {
    return createEmptyPlayer();
  }

  return {
    nickname: player.nickname || "",
    alliance: player.alliance || "",

    troopType: player.troopType || "fighter",
    tier: player.tier || "T10",

    lairLevel: Number(player.lairLevel ?? 0),
    marchSize: Number(player.marchSize ?? 0),
    rallySize: Number(player.rallySize ?? 0),

    shift: SHIFTS.includes(player.shift) ? player.shift : "",

    readyAttack:
      player.readyAttack === true || player.readiness?.attack === true,

    captain: player.captain === true || player.readiness?.captain === true,

    extraSquads: {
      fighter: {
        enabled: player.extraSquads?.fighter?.enabled === true,

        tier: player.extraSquads?.fighter?.tier || "T10",
      },

      rider: {
        enabled: player.extraSquads?.rider?.enabled === true,

        tier: player.extraSquads?.rider?.tier || "T10",
      },

      shooter: {
        enabled: player.extraSquads?.shooter?.enabled === true,

        tier: player.extraSquads?.shooter?.tier || "T10",
      },
    },

    comment: player.comment || "",
    customFields:
      player.customFields && typeof player.customFields === "object"
        ? { ...player.customFields }
        : {},
  };
}

export function normalizePlayerForm(form) {
  const extraSquads = Object.fromEntries(
    Object.entries(form.extraSquads).map(([type, squad]) => [
      type,
      {
        ...squad,

        enabled: type === form.troopType ? false : squad.enabled === true,
      },
    ]),
  );

  return {
    ...form,

    nickname: String(form.nickname || "").trim(),

    alliance: String(form.alliance || "").trim(),

    troopType: form.troopType || "fighter",

    tier: form.tier || "T10",

    lairLevel: Number(form.lairLevel ?? 0),

    marchSize: Number(form.marchSize ?? 0),

    rallySize: Number(form.rallySize ?? 0),

    shift: SHIFTS.includes(form.shift) ? form.shift : "",

    readyAttack: form.readyAttack === true,

    captain: form.captain === true,

    readiness: {
      attack: form.readyAttack === true,

      captain: form.captain === true,
    },

    extraSquads,

    comment: String(form.comment || "").trim(),
  };
}

export function validatePlayerForm(form, t) {
  if (!form.nickname.trim()) {
    return t.editor.validation.nickname;
  }

  if (!form.alliance.trim()) {
    return t.editor.validation.alliance;
  }

  if (!TROOP_TYPES.includes(form.troopType)) {
    return t.editor.validation.troopType;
  }

  if (!TIERS.includes(form.tier)) {
    return t.editor.validation.tier;
  }

  if (!SHIFTS.includes(form.shift)) {
    return t.editor.validation.shift;
  }

  if (Number(form.lairLevel) < 0) {
    return t.editor.validation.lair;
  }

  if (Number(form.marchSize) < 0) {
    return t.editor.validation.march;
  }

  if (Number(form.rallySize) < 0) {
    return t.editor.validation.rally;
  }

  return "";
}

