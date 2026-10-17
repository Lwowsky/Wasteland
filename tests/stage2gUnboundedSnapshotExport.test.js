import test from "node:test";
import assert from "node:assert/strict";
import { fetchAllPublicPlayers } from "../worker/src/public/fetchAllPublicPlayers.js";

function loader(total, calls) {
  return async (_env, url) => {
    const page = Number(url.searchParams.get("page"));
    const limit = Number(url.searchParams.get("limit"));
    calls.push(page);
    const start = (page - 1) * limit;
    return Response.json({ page, limit, total, players: Array.from({ length: Math.max(0, Math.min(limit, total - start)) }, (_, i) => ({ id: start + i + 1 })) });
  };
}

test("snapshot includes all 1201 players using 500-row D1 pages", async () => {
  const calls = [];
  const response = await fetchAllPublicPlayers({}, loader(1201, calls));
  const result = await response.json();
  assert.equal(result.players.length, 1201);
  assert.equal(result.players[1200].id, 1201);
  assert.deepEqual(calls, [1, 2, 3]);
});

test("empty cycle does one read", async () => {
  const calls = [];
  const result = await (await fetchAllPublicPlayers({}, loader(0, calls))).json();
  assert.equal(result.total, 0);
  assert.deepEqual(calls, [1]);
});

test("pagination fails closed on an incomplete page", async () => {
  let calls = 0;
  await assert.rejects(() => fetchAllPublicPlayers({}, async () => {
    calls += 1;
    return Response.json(calls === 1 ? { total: 501, players: Array.from({ length: 500 }, (_, i) => ({ id: i + 1 })) } : { players: [] });
  }), /INCOMPLETE_PUBLIC_PLAYERS_EXPORT/);
});
