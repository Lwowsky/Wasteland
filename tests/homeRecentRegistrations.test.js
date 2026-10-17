import test from "node:test";
import assert from "node:assert/strict";
import { getPublicRecentRegistrations } from "../worker/src/public/publicSnapshot.js";

test("home preview publishes at most five whitelisted registrations independently of players access mode", () => {
  const rows = Array.from({ length: 7 }, (_, i) => ({
    id: 7 - i, nickname: `Player ${7 - i}`, alliance: "AAA",
    troopType: "rider", tier: "T9", shift: "shift1", captain: 0,
    createdAt: "2026-10-17 00:00:00", email: "private@example.com", marchSize: 1234,
  }));
  const visible = getPublicRecentRegistrations(rows);
  assert.equal(visible.length, 5);
  assert.deepEqual(visible.map((player) => player.id), [7, 6, 5, 4, 3]);
  assert.equal(visible[0].email, undefined);
  assert.equal(visible[0].marchSize, undefined);
});

test("home preview accepts an empty current cycle", () => {
  assert.deepEqual(getPublicRecentRegistrations([]), []);
  assert.deepEqual(getPublicRecentRegistrations(null), []);
});
