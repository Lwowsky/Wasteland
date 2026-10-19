// The Worker limits EACH response to 500 players. That is not a limit on
// total registrations. Never silently truncate the protected table at 500.
export async function fetchCompleteWorkerPlayers(loadPage) {
  const perPage = 500;
  const first = await loadPage(1, perPage);
  const total = Number(first?.total);
  if (!Number.isSafeInteger(total) || total < 0 || !Array.isArray(first?.players)) {
    throw new Error("INVALID_PUBLIC_PLAYERS_RESPONSE");
  }
  const expectedFirst = Math.min(total, perPage);
  if (first.players.length !== expectedFirst) {
    throw new Error("INCOMPLETE_PUBLIC_PLAYERS_RESPONSE");
  }
  const players = [...first.players];
  for (let page = 2, pages = Math.ceil(total / perPage); page <= pages; page += 1) {
    const data = await loadPage(page, perPage);
    const expected = Math.min(perPage, total - players.length);
    if (!Array.isArray(data?.players) || Number(data.total) !== total ||
        data.players.length !== expected) {
      throw new Error("INCOMPLETE_PUBLIC_PLAYERS_RESPONSE");
    }
    players.push(...data.players);
  }
  return { ...first, players, total, page: 1, pages: total ? 1 : 0 };
}
