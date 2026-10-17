// Only the authorized GitHub publication export uses this pagination helper.
// Frontend visitors still read one static JSON file, not the Worker.
const PAGE_SIZE = 500;

export async function fetchAllPublicPlayers(env, loadPage) {
  const first = await loadPage(env, new URL(`https://internal.invalid/api/players?page=1&limit=${PAGE_SIZE}`));
  if (!first.ok) return first;
  const firstData = await first.json();
  const total = Number(firstData.total);
  if (!Number.isSafeInteger(total) || total < 0 || !Array.isArray(firstData.players)) {
    throw new Error("INVALID_PUBLIC_PLAYERS_EXPORT");
  }
  const result = [...firstData.players];
  for (let page = 2; result.length < total; page += 1) {
    const response = await loadPage(env, new URL(`https://internal.invalid/api/players?page=${page}&limit=${PAGE_SIZE}`));
    if (!response.ok) return response;
    const data = await response.json();
    if (!Array.isArray(data.players) || data.players.length === 0) {
      throw new Error("INCOMPLETE_PUBLIC_PLAYERS_EXPORT");
    }
    result.push(...data.players);
  }
  if (result.length !== total) throw new Error("PUBLIC_PLAYERS_COUNT_CHANGED_DURING_EXPORT");
  return new Response(JSON.stringify({ ...firstData, players: result, total, pages: total ? 1 : 0, limit: Math.max(result.length, 1) }), {
    headers: { "content-type": "application/json" },
  });
}
