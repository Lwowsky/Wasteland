import test from "node:test";
import assert from "node:assert/strict";
import { buildSafeSnapshotPlayers, getPublicRecentRegistrations } from "../worker/src/public/publicSnapshot.js";

const privatePayload = {
  players: [{ id: 12, nickname: "TEST", alliance: "YYY", captain: 1,
    marchSize: 220000, adminNotes: "DO_NOT_EXPORT", sessionToken: "SECRET" }],
  privateSettings: { adminKey: "SECRET" },
  rawAccessTokens: ["SECRET"],
  total: 1,
};

test("Stage 3: public snapshot explicitly exports only approved fields", () => {
  const snapshot = buildSafeSnapshotPlayers(privatePayload, "public", [], true);
  assert.equal(snapshot.players.length, 1);
  assert.deepEqual(Object.keys(snapshot.players[0]).sort(),
    ["id", "nickname", "alliance", "troopType", "tier", "shift", "captain", "createdAt"].sort());
  assert.doesNotMatch(JSON.stringify(snapshot), /SECRET|DO_NOT_EXPORT|220000|privateSettings/);
});

test("Stage 3: private or closed snapshot redacts player data, not only the UI", () => {
  for (const mode of ["closed", "private", "link"]) {
    const snapshot = buildSafeSnapshotPlayers(privatePayload, mode, [], false);
    assert.equal(snapshot.players.length, 0);
    assert.equal(snapshot.total, 0);
    assert.doesNotMatch(JSON.stringify(snapshot), /TEST|DO_NOT_EXPORT/);
  }
});

test("Stage 3: share metadata allowlist does not expose raw share codes", () => {
  const snapshot = buildSafeSnapshotPlayers({ players: [] }, "link",
    [{ hash: "SHA256_HASH", expiresAt: null, token: "PRIVATE_CODE", privateNotes: "SECRET" }], true);
  assert.deepEqual(snapshot.shareLinks, [{ hash: "SHA256_HASH", expiresAt: null }]);
  assert.doesNotMatch(JSON.stringify(snapshot), /PRIVATE_CODE|SECRET/);
});

test("Stage 3: homepage five-player preview stays independent of table visibility", () => {
  const rows = Array.from({ length: 8 }, (_, index) => ({ ...privatePayload.players[0], id: index + 1 }));
  const recent = getPublicRecentRegistrations(rows);
  assert.equal(recent.length, 5);
  assert.doesNotMatch(JSON.stringify(recent), /DO_NOT_EXPORT|SECRET/);
});
