import test from "node:test";
import assert from "node:assert/strict";
import { isSnapshotPublic, redactSnapshotPlayers } from "./snapshotVisibility.js";

for (const mode of ["public", "code", "link", "private"]) {
  for (const next of ["public", "code", "link", "private"]) {
    test(`snapshot visibility: ${mode} -> ${next}`, () => {
      const allowed = isSnapshotPublic({ mode }, { mode: next });
      assert.equal(allowed, mode === "public" && next === "public");
      const original = { players: [{ nickname: "Secret" }], total: 1, pages: 1, periodId: 5 };
      const result = redactSnapshotPlayers(original, allowed);
      assert.equal(result.players.length, allowed ? 1 : 0);
      assert.equal(result.total, allowed ? 1 : 0);
      assert.equal(result.pages, allowed ? 1 : 0);
      assert.equal(result.periodId, 5);
      assert.equal(original.players.length, 1);
    });
  }
}
