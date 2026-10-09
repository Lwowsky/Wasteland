const STORAGE_KEY = "wasteland-player-templates";

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

    return parsed.map((template) => ({
      ...template,
      shift: template.shift === "both" ? "flexible" : template.shift,
    }));
  } catch {
    return [];
  }
}

export function savePlayerTemplates(templates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
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
    extraSquads: {
      fighter: {
        enabled: data.extraSquads?.fighter?.enabled ?? false,
        tier: data.extraSquads?.fighter?.tier || "T10",
      },
      rider: {
        enabled: data.extraSquads?.rider?.enabled ?? false,
        tier: data.extraSquads?.rider?.tier || "T10",
      },
      shooter: {
        enabled: data.extraSquads?.shooter?.enabled ?? false,
        tier: data.extraSquads?.shooter?.tier || "T10",
      },
    },
  };
}

export function createPlayerTemplate(data) {
  return {
    id: crypto.randomUUID(),
    ...createPlayerTemplateDraft(data, "shift1"),
  };
}
