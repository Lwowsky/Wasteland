import test from "node:test";
import assert from "node:assert/strict";
import {
  clearAdminPlayersCache,
  markAdminPlayersCheckAt,
  readAdminPlayersCheckAt,
} from "../src/pages/Admin/services/adminPlayersCache.js";
import {
  ADMIN_PLAYERS_AUTO_CHECK_MS,
  shouldCheckAdminPlayers,
} from "../src/pages/Admin/services/adminPlayersSyncPolicy.js";
import { guardSensitiveRequest } from "../worker/src/utils/requestGuard.js";

function createSessionStorage() {
  const map = new Map();
  return {
    get length() { return map.size; },
    key(i) { return [...map.keys()][i] ?? null; },
    getItem(k) { return map.get(k) ?? null; },
    setItem(k,v) { map.set(k,String(v)); },
    removeItem(k) { map.delete(k); },
  };
}

test("rapid F5 keeps the previous check time and skips unnecessary delta requests", () => {
  const oldWindow = globalThis.window;
  globalThis.window = { sessionStorage: createSessionStorage() };
  try {
    const when = 1_800_000_000_000;
    const id = "uid:admin:owner";
    assert.equal(readAdminPlayersCheckAt(id), 0);
    assert.equal(shouldCheckAdminPlayers(readAdminPlayersCheckAt(id), when), true);
    markAdminPlayersCheckAt(id, when);
    // Simulate a fresh React instance after F5 by reading sessionStorage anew.
    for (let i = 1; i <= 1000; i += 1) {
      assert.equal(shouldCheckAdminPlayers(readAdminPlayersCheckAt(id), when + i * 10), false);
    }
    assert.equal(shouldCheckAdminPlayers(readAdminPlayersCheckAt(id), when + ADMIN_PLAYERS_AUTO_CHECK_MS), true);
    assert.equal(readAdminPlayersCheckAt("different-admin"), 0);
    clearAdminPlayersCache();
    assert.equal(readAdminPlayersCheckAt(id), 0);
  } finally { globalThis.window = oldWindow; }
});

test("auto refresh checks can recover after system clock changes", () => {
  assert.equal(shouldCheckAdminPlayers(Date.now()+999999, Date.now()), true);
  assert.equal(shouldCheckAdminPlayers(0, Date.now()), true);
  assert.equal(shouldCheckAdminPlayers(Date.now(), Date.now()), false);
});

test("admin read edge limit blocks excess requests without calling the database", async () => {
  const keys = [];
  const env = { ADMIN_READ_RATE_LIMIT: {
    async limit({key}) { keys.push(key); return { success: keys.length === 1 }; },
  }};
  const request = new Request("https://example.test/api/admin/registrations/changes?periodId=6&after=2", {
    headers: { "CF-Connecting-IP": "203.0.113.10" },
  });
  assert.equal(await guardSensitiveRequest(request, env, "adminRead"), null);
  const blocked = await guardSensitiveRequest(request, env, "adminRead");
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get("Retry-After"), "60");
  assert.equal(keys.length, 2);
  assert.equal(keys[0], keys[1]);
  const missing = await guardSensitiveRequest(request, {}, "adminRead");
  assert.equal(missing.status, 503); // Fail closed, never silently lose protection.
});
