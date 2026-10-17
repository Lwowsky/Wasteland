import test from "node:test";
import assert from "node:assert/strict";
import {
  clearAdminPlayersCache,
  mergeAdminRegistrationChanges,
  readAdminPlayersCache,
  writeAdminPlayersCache,
} from "../src/pages/Admin/services/adminPlayersCache.js";
import { handleAdminRegistrationChanges } from "../worker/src/admin/registrations/list.js";

function fakeSessionStorage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(name) { return values.get(name) ?? null; },
    setItem(name, value) { values.set(name, value); },
    removeItem(name) { values.delete(name); },
  };
}

test("delta merge adds, edits and removes without re-reading unchanged rows", () => {
  const original = [
    { id: "200", nickname: "Old" },
    { id: "199", nickname: "Unchanged" },
  ];
  const merged = mergeAdminRegistrationChanges(original, {
    upserts: [{ id: "201", nickname: "New" }, { id: "200", nickname: "Updated" }],
  });
  assert.deepEqual(merged.map((p) => p.id), ["201", "200", "199"]);
  assert.equal(merged[1].nickname, "Updated");
  assert.equal(merged[2], original[1]);
  assert.deepEqual(mergeAdminRegistrationChanges(merged, { deletes: [200] }).map((p) => p.id), ["201", "199"]);
});

test("admin cache only uses sessionStorage, survives reload and expires", () => {
  const before = globalThis.window;
  const sessionStorage = fakeSessionStorage();
  let localAccessed = false;
  globalThis.window = {
    sessionStorage,
    get localStorage() { localAccessed = true; throw new Error("localStorage must not be used"); },
  };
  try {
    const now = 1_800_000_000_000;
    const snapshot = { cursor: 201, period: { id: 7, cycleKey: "K" }, players: [{ id: "201", nickname: "New" }] };
    writeAdminPlayersCache("uid-1:owner", snapshot, now);
    assert.deepEqual(readAdminPlayersCache("uid-1:owner", now + 1000)?.players, snapshot.players);
    assert.equal(readAdminPlayersCache("uid-2:owner", now + 1000), null);
    assert.equal(readAdminPlayersCache("uid-1:owner", now + 31 * 60_000), null);
    assert.equal(localAccessed, false);
    clearAdminPlayersCache();
    assert.equal(sessionStorage.length, 0);
  } finally {
    globalThis.window = before;
  }
});

test("incremental admin API rejects requests without authentication", async () => {
  const response = await handleAdminRegistrationChanges(
    new Request("https://example.test/api/admin/registrations/changes?periodId=1&after=0"),
    {},
  );
  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.error, "AUTH_REQUIRED");
});
