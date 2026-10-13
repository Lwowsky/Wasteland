const STEP = 1000;
const tierNumber = (tier) => Number(String(tier).replace(/^T/i, "")) || 0;

/** Adjust neighbouring enabled tiers after a manual edit, without touching hidden tiers.
 * Zero means unlimited in the existing planner; zero fields are intentionally exempt.
 * Manual limits never increase an individual player's actual march. */
export function updateOrderedTierLimits(settings, tier, value, enabledTiers) {
  const ascending = [...(enabledTiers || [])].sort((a, b) => tierNumber(a) - tierNumber(b));
  const limits = { ...settings.tierLimits, [tier]: Math.min(10000000, Math.max(0, Math.trunc(Number(value) || 0))) };
  const index = ascending.indexOf(tier);
  if (index === -1 || limits[tier] === 0) return limits;
  // Raise higher tiers if a lower tier becomes too large.
  for (let i = index + 1; i < ascending.length; i++) {
    const higher = ascending[i];
    const lower = ascending[i - 1];
    if (limits[higher] > 0 && limits[higher] <= limits[lower]) {
      limits[higher] = Math.min(10000000, limits[lower] + STEP);
    }
  }
  // Lower smaller tiers if an upper tier is decreased.
  for (let i = index - 1; i >= 0; i--) {
    const lower = ascending[i];
    const higher = ascending[i + 1];
    if (limits[lower] > 0 && limits[higher] > 0 && limits[lower] >= limits[higher]) {
      limits[lower] = Math.max(STEP, limits[higher] - STEP);
    }
  }
  return limits;
}
