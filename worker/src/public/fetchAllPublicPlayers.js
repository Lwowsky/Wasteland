// Used ONLY by the authenticated GitHub snapshot export, never on public page views.
// The API fetch cap of 500 is a page size, NOT a player registration limit.
const PAGE_SIZE = 500;

function assertPage(data, page, total, seenIds) {
  if (!data || !Array.isArray(data.players)) {
    throw new Error("INVALID_PUBLIC_PLAYERS_EXPORT");
  }
  if (data.total !== undefined && Number(data.total) !== total) {
    throw new Error("PUBLIC_PLAYERS_COUNT_CHANGED_DURING_EXPORT");
  }
  if (data.players.length > PAGE_SIZE || (total > 0 && data.players.length === 0)) {
    throw new Error("INCOMPLETE_PUBLIC_PLAYERS_EXPORT");
  }
  // Every non-final page must be full. Otherwise pagination could skip records.
  const expected = Math.min(PAGE_SIZE, total - (page - 1) * PAGE_SIZE);
  if (data.players.length !== expected) {
    throw new Error("INCOMPLETE_PUBLIC_PLAYERS_EXPORT");
  }
  for (const player of data.players) {
    if (player && player.id !== undefined && player.id !== null) {
      const id = String(player.id);
      if (seenIds.has(id)) {
        throw new Error("PUBLIC_PLAYERS_DUPLICATED_DURING_EXPORT");
      }
      seenIds.add(id);
    }
  }
}

export async function fetchAllPublicPlayers(env, loadPage) {
  const first = await loadPage(env, new URL(`https://internal.invalid/api/players?page=1&limit=${PAGE_SIZE}`));
  if (!first.ok) return first;
  const firstData = await first.json();
  const total = Number(firstData?.total);
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new Error("INVALID_PUBLIC_PLAYERS_EXPORT");
  }
  const seenIds = new Set();
  assertPage(firstData, 1, total, seenIds);
  const result = [...firstData.players];
  const totalPages = Math.ceil(total / PAGE_SIZE);
  for (let page = 2; page <= totalPages; page += 1) {
    const response = await loadPage(env, new URL(`https://internal.invalid/api/players?page=${page}&limit=${PAGE_SIZE}`));
    if (!response.ok) return response;
    const data = await response.json();
    assertPage(data, page, total, seenIds);
    result.push(...data.players);
  }
  if (result.length !== total) {
    throw new Error("PUBLIC_PLAYERS_COUNT_CHANGED_DURING_EXPORT");
  }
  return new Response(JSON.stringify({
    ...firstData,
    players: result,
    total,
    pages: total > 0 ? 1 : 0,
    limit: Math.max(result.length, 1),
  }), { headers: { "content-type": "application/json" } });
}
