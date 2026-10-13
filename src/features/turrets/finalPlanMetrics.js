/** Shared march totals for both the editable preview and published snapshots.
 *  A captain contributes their own march plus rally slots to total capacity.
 *  The green value is the captain's march plus all assigned helper marches.
 *  A snapshot published before rallySize was included has unknown capacity;
 *  never invent an inaccurate value for those older snapshots.
 */
function marchNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

export function getFinalPlanMetrics(tower) {
  const captain = tower?.captain || null;
  const helpersMarch = (tower?.players || []).reduce((sum, helper) =>
    sum + marchNumber(helper?.marchSize), 0);
  const captainMarch = marchNumber(captain?.marchSize);
  const used = captainMarch + helpersMarch;
  if (!captain) {
    return { capacity: 0, used, remaining: 0, captainMarch: 0, helpersMarch };
  }

  const originalRally = captain.rallySize ?? tower?.rallySize;
  const rallyNumber = Number(originalRally);
  const knownRally = originalRally !== undefined && originalRally !== null && originalRally !== "" &&
    Number.isFinite(rallyNumber) && rallyNumber >= 0;
  const capacity = knownRally ? captainMarch + Math.floor(rallyNumber) : null;

  return {
    capacity,
    used,
    remaining: capacity === null ? null : Math.max(0, capacity - used),
    captainMarch,
    helpersMarch,
  };
}
