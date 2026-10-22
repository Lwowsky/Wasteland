// Count unique people, not their turret/shift placements. Public plan IDs are
// deliberately generated per placement (e.g. shift1-hub-captain), so those
// IDs cannot identify one person across multiple shifts.
function participantKey(player) {
  const nickname = String(player?.nickname || "").trim().normalize("NFKC").toLocaleLowerCase("en-US");
  const alliance = String(player?.alliance || "").trim().normalize("NFKC").toLocaleLowerCase("en-US");
  if (nickname) return JSON.stringify(["player", alliance, nickname]);
  // Legacy plan rows without a nickname: avoid counting completely empty rows.
  const id = player?.id;
  return id == null || !String(id).trim() ? null : JSON.stringify(["legacy-id", String(id)]);
}

export function countPublishedPlanPlayers(plan) {
  if (!plan || typeof plan !== "object") return 0;
  const seen = new Set();
  // Region ids namespace independent boards; count a person only once across them.
  const plans = [plan, ...Object.values(plan.__regions || {})];
  for (const regionPlan of plans) for (const [shift, towers] of Object.entries(regionPlan || {})) {
    if (!/^shift[1-4]$/.test(shift) || !towers || typeof towers !== "object") continue;
    for (const tower of Object.values(towers)) {
      if (!tower || typeof tower !== "object") continue;
      for (const player of [tower.captain, ...(Array.isArray(tower.players) ? tower.players : [])]) {
        if (!player || typeof player !== "object") continue;
        const key = participantKey(player);
        if (key) seen.add(key);
      }
    }
  }
  return seen.size;
}
