import { REGISTRATION_TROOP_TYPES } from "../../../shared/registrationConfig.js";

const STORAGE_KEY = "wasteland-player-templates";

// Primary troops must never be an enabled extra squad, including legacy drafts.
export function normalizeTemplateExtraSquads(extraSquads = {}, troopType = "") {
  return Object.fromEntries(
    REGISTRATION_TROOP_TYPES.map((type) => [
      type,
      {
        enabled: type !== troopType && extraSquads?.[type]?.enabled === true,
        tier: extraSquads?.[type]?.tier || "T10",
      },
    ]),
  );
}

export function normalizePlayerTemplate(template = {}) {
  return {
    ...template,
    shift: template.shift === "both" ? "flexible" : template.shift,
    extraSquads: normalizeTemplateExtraSquads(
      template.extraSquads,
      template.troopType,
    ),
  };
}

export function getPlayerTemplates() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((template) => template && typeof template === "object")
      .map(normalizePlayerTemplate);
  } catch {
    return [];
  }
}

export function savePlayerTemplates(templates) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(templates.map(normalizePlayerTemplate)),
  );
}

export function createPlayerTemplateDraft(data = {}, fallbackShift = "") {
  return {
    nickname: data.nickname || "",
    alliance: data.alliance || "",
    troopType: data.troopType || "fighter",
    tier: data.tier || "T10",
    lairLevel: data.lairLevel || "",
    marchSize: data.marchSize || "",
    rallySize: data.rallySize || "",
    shift: data.shift || fallbackShift,
    extraSquads: normalizeTemplateExtraSquads(data.extraSquads, data.troopType || "fighter"),
  };
}

export function createPlayerTemplate(data) {
  return {
    id: crypto.randomUUID(),
    ...createPlayerTemplateDraft(data, "shift1"),
  };
}
