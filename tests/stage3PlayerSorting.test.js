import assert from "node:assert/strict";
import test from "node:test";
import { sortPlayers } from "../src/pages/Admin/players/playerSorting.js";

const PLAYERS = [
  { id: "a", nickname: "Zed", tier: "T9", marchSize: 12500, captain: false },
  { id: "b", nickname: "Alice", tier: "T14", marchSize: 8500, captain: true },
  { id: "c", nickname: "Bob", tier: "T12", marchSize: 18000, captain: false },
];

test("stage 3: sorting never mutates the input list", () => {
  const originalIds = PLAYERS.map(({ id }) => id);
  const sorted = sortPlayers(PLAYERS, { field: "tier", direction: "desc" }, "uk");

  assert.notStrictEqual(sorted, PLAYERS);
  assert.deepEqual(PLAYERS.map(({ id }) => id), originalIds);
  assert.deepEqual(sorted.map(({ id }) => id), ["b", "c", "a"]);
});

test("stage 3: text, numeric and boolean sorts preserve existing behavior", () => {
  assert.deepEqual(
    sortPlayers(PLAYERS, { field: "nickname", direction: "asc" }, "en").map(({ id }) => id),
    ["b", "c", "a"],
  );
  assert.deepEqual(
    sortPlayers(PLAYERS, { field: "marchSize", direction: "asc" }, "uk").map(({ id }) => id),
    ["b", "a", "c"],
  );
  assert.equal(sortPlayers(PLAYERS, { field: "captain", direction: "desc" }, "en")[0].id, "b");
});

test("stage 3: no active sorting returns original list unchanged", () => {
  assert.strictEqual(sortPlayers(PLAYERS, { field: "", direction: "asc" }, "en"), PLAYERS);
});
