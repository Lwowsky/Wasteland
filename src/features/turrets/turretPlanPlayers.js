/** Plan-only players and field edits. Never mutate registration rows. */
export const PLAN_FIELDS = Object.freeze([
  "nickname", "alliance", "tier", "troopType", "marchSize", "rallySize", "captain", "shift",
]);
const TROOPS = new Set(["fighter", "rider", "shooter"]);
const TIERS = new Set(Array.from({ length: 14 }, (_, i) => `T${i + 1}`));
export const MANUAL_ID_PATTERN = /^m_[0-9a-f]{32}$/;

export function validPlanPlayerFields(row) {
  if (!row || typeof row !== "object" || Array.isArray(row) ||
    Object.keys(row).some((key) => !PLAN_FIELDS.includes(key))) return false;
  return typeof row.nickname === "string" && row.nickname.trim().length > 0 && row.nickname.length <= 90 &&
    typeof row.alliance === "string" && row.alliance.length <= 80 &&
    TIERS.has(row.tier) && TROOPS.has(row.troopType) &&
    Number.isSafeInteger(row.marchSize) && row.marchSize > 0 && row.marchSize <= 10000000 &&
    Number.isSafeInteger(row.rallySize) && row.rallySize >= 0 && row.rallySize <= 20000000 &&
    typeof row.captain === "boolean" &&
    (row.shift === undefined || ["shift1", "shift2", "shift3", "shift4", "flexible"].includes(row.shift));
}

export function normalizePlanPlayerFields(raw) {
  return {
    nickname: String(raw?.nickname || "").trim().slice(0, 90),
    alliance: String(raw?.alliance || "").trim().slice(0, 80),
    tier: String(raw?.tier || "T14").toUpperCase(),
    troopType: raw?.troopType || "fighter",
    marchSize: Number(raw?.marchSize),
    rallySize: Number(raw?.rallySize || 0),
    captain: Boolean(raw?.captain),
  };
}

export function composePlanPlayers(registrations, assignments) {
  const edits = assignments?.playerOverrides || {};
  const recorded = (registrations || []).filter((player) => !MANUAL_ID_PATTERN.test(String(player.id))).map((player) => {
    const override = edits[String(player.id)];
    return override ? { ...player, ...override } : player;
  });
  const manual = Object.entries(assignments?.manualPlayers || {}).map(([id, player]) => ({
    ...player, id, shift: player.shift,
  }));
  return [...recorded, ...manual];
}

/** Restricted metadata that is stored with assignments, not in the registration table. */
export function copyPlanMetadata(from, into) {
  for (const key of ["manualPlayers", "playerOverrides", "towerRules"]) {
    if (from && Object.hasOwn(from, key)) into[key] = structuredClone(from[key]);
  }
  return into;
}

export function createManualPlanPlayer(raw, shift, id) {
  const player = normalizePlanPlayerFields(raw);
  if (!validPlanPlayerFields(player) || !MANUAL_ID_PATTERN.test(id)) return null;
  return { ...player, shift };
}
