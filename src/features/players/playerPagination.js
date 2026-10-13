/** Shared pagination for public and admin tables. "all" means no slicing. */
export function getTotalPages(itemCount, pageSize) {
  if (pageSize === "all") return 1;
  return Math.max(1, Math.ceil(itemCount / Number(pageSize)));
}

export function getVisiblePlayers(players, page, pageSize) {
  if (pageSize === "all") return players;
  const size = Number(pageSize);
  const start = (page - 1) * size;
  return players.slice(start, start + size);
}
