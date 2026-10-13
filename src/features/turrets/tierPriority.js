/** One shared ranking for automatic helpers, admin tables and public plans.
 * Tier wins over march; equal-tier players rank by their actual march size.
 * No player data or saved assignment order is mutated by this comparator.
 */
export function getTierRank(player) {
  const match = /^T(\d+)$/i.exec(String(player?.tier || "").trim());
  return match ? Number(match[1]) : 0;
}

export function getPriorityMarch(player) {
  const march = Number(player?.marchSize);
  return Number.isFinite(march) && march > 0 ? Math.floor(march) : 0;
}

export function comparePlayersByTier(a, b, marchOf = getPriorityMarch) {
  return getTierRank(b) - getTierRank(a) ||
    marchOf(b) - marchOf(a) ||
    String(a?.id ?? "").localeCompare(String(b?.id ?? ""), "en") ||
    String(a?.nickname ?? "").localeCompare(String(b?.nickname ?? ""), "en");
}

/** Fairness can break ties, but must never push a lower tier/march ahead. */
export function sameTierAndMarch(a, b) {
  return getTierRank(a) === getTierRank(b) &&
    getPriorityMarch(a) === getPriorityMarch(b);
}
