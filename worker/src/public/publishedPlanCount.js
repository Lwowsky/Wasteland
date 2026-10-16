// Count distinct public plan participants across shifts and turrets.
// No database query is needed during a visitor's page refresh.
export function countPublishedPlanPlayers(plan) {
  if (!plan || typeof plan !== "object") return 0;
  const seen = new Set();
  for (const [shift, towers] of Object.entries(plan)) {
    if (!/^shift[1-4]$/.test(shift) || !towers || typeof towers !== "object") continue;
    for (const tower of Object.values(towers)) {
      if (!tower || typeof tower !== "object") continue;
      for (const player of [tower.captain, ...(Array.isArray(tower.players) ? tower.players : [])]) {
        if (!player || typeof player !== "object") continue;
        const id = player.id ?? player.nickname;
        if (id !== undefined && id !== null && String(id).trim()) seen.add(String(id));
      }
    }
  }
  return seen.size;
}
