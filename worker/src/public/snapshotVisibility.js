// Static GitHub Pages JSON is readable without authentication. Never export
// protected records, regardless of what the frontend access gate displays.
export function isSnapshotPublic(initialAccess, latestAccess) {
  return initialAccess?.mode === "public" && latestAccess?.mode === "public";
}

export function redactSnapshotPlayers(players, expose) {
  if (expose) return players;
  return { ...players, players: [], total: 0, pages: 0 };
}
