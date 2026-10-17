import test from "node:test";
import assert from "node:assert/strict";
import { fetchAllPublicPlayers } from "../worker/src/public/fetchAllPublicPlayers.js";

function stableLoader(total, calls = []) {
  return async (_env, url) => {
    const page = Number(url.searchParams.get("page"));
    const limit = Number(url.searchParams.get("limit"));
    calls.push(page);
    const from = (page - 1) * limit;
    return Response.json({
      total,
      players: Array.from({ length: Math.max(0, Math.min(limit, total - from)) },
        (_, offset) => ({ id: total - from - offset })),
    });
  };
}

for (const total of [0, 1, 499, 500, 501, 1000, 1001, 2501]) {
  test(`Stage 3: snapshot exports exactly ${total} players without a player cap`, async () => {
    const pages = [];
    const result = await (await fetchAllPublicPlayers({}, stableLoader(total, pages))).json();
    assert.equal(result.total, total);
    assert.equal(result.players.length, total);
    assert.equal(pages.length, Math.max(1, Math.ceil(total / 500)));
    assert.equal(new Set(result.players.map((player) => player.id)).size, total);
  });
}

test("Stage 3: rejects a changed player count between pages", async () => {
  const load = stableLoader(501);
  let page = 0;
  await assert.rejects(() => fetchAllPublicPlayers({}, async (env, url) => {
    const response = await load(env, url);
    page += 1;
    const data = await response.json();
    if (page === 2) data.total = 502;
    return Response.json(data);
  }), /COUNT_CHANGED/);
});

test("Stage 3: rejects duplicate records crossing page boundary", async () => {
  let page = 0;
  await assert.rejects(() => fetchAllPublicPlayers({}, async () => {
    page += 1;
    return Response.json({ total: 501,
      players: page === 1
        ? Array.from({ length: 500 }, (_, i) => ({ id: 501 - i }))
        : [{ id: 2 }],
    });
  }), /DUPLICATED/);
});

test("Stage 3: rejects a partial middle page instead of publishing stale data", async () => {
  let page = 0;
  await assert.rejects(() => fetchAllPublicPlayers({}, async () => {
    page += 1;
    return Response.json({ total: 1100, players: Array.from({ length: page === 2 ? 20 : 500 }, (_, i) => ({ id: page * 1000 + i })) });
  }), /INCOMPLETE/);
});

test("Stage 3: propagates a failed API page so deployment fails closed", async () => {
  const response = await fetchAllPublicPlayers({}, async (_env, url) =>
    url.searchParams.get("page") === "1"
      ? Response.json({ total: 501, players: Array.from({ length: 500 }, (_, i) => ({ id: i })) })
      : Response.json({ error: "D1_UNAVAILABLE" }, { status: 503 }));
  assert.equal(response.status, 503);
});
