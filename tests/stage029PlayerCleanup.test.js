import assert from "node:assert/strict";
import test from "node:test";

import { filterPlayers, getTotalPages, getVisiblePlayers } from "../src/pages/Players/playersTable.js";
import {
  matchesCaptainFilter,
  matchesPlayerField,
  matchesPlayerSearch,
  normalizePlayerSearch,
} from "../src/features/players/playerTableFilters.js";
import {
  getTotalPages as getAdminTotalPages,
  getVisiblePlayers as getAdminVisiblePlayers,
} from "../src/features/players/playerPagination.js";

const records = [
  { id: 1, nickname: "Alpha", alliance: "MIR", troopType: "fighter", shift: "shift1", readiness: { captain: true }, captain: false },
  { id: 2, nickname: "Bravo", alliance: "ZLO", troopType: "rider", shift: "shift2", readiness: { captain: false }, captain: true },
  { id: 3, nickname: "Charlie", alliance: "MIR", troopType: "shooter", shift: "shift3", readiness: {}, captain: false },
];

test("029: player search matches nickname and alliance, insensitive to case and search spaces", () => {
  const search = normalizePlayerSearch("  mIr ");
  assert.deepEqual(records.filter((player) => matchesPlayerSearch(player, search)).map((p) => p.id), [1, 3]);
  assert.equal(matchesPlayerSearch(records[0], normalizePlayerSearch("ALP")), true);
  assert.equal(matchesPlayerSearch(records[0], normalizePlayerSearch("zzz")), false);
  assert.equal(matchesPlayerSearch(records[0], ""), true);
});

test("029: public and admin captain fields deliberately keep different meanings", () => {
  assert.equal(matchesCaptainFilter("yes", records[0].readiness?.captain), true);
  assert.equal(matchesCaptainFilter("yes", records[0].captain), false);
  assert.equal(matchesCaptainFilter("no", undefined), true);
  assert.equal(matchesCaptainFilter("all", undefined), true);
  assert.equal(matchesCaptainFilter("invalid", true), false);
});

test("029: field filter handles all, exact matches and absent fields", () => {
  assert.equal(matchesPlayerField(records[0], "alliance", "all"), true);
  assert.equal(matchesPlayerField(records[0], "troopType", "fighter"), true);
  assert.equal(matchesPlayerField(records[0], "troopType", "rider"), false);
});

test("029: public filtering preserves its existing semantics and input records", () => {
  const before = structuredClone(records);
  const filter = { search: "", alliance: "all", troop: "all", shift: "all", captain: "yes" };
  assert.deepEqual(filterPlayers(records, filter).map((p) => p.id), [1]);
  assert.deepEqual(filterPlayers(records, { ...filter, captain: "no" }).map((p) => p.id), [2, 3]);
  assert.deepEqual(filterPlayers(records, { ...filter, captain: "all", search: "brA", troop: "rider" }).map((p) => p.id), [2]);
  assert.deepEqual(records, before);
});

test("029: public/admin pagination helpers are shared including All and boundaries", () => {
  for (const count of [0, 1, 10, 11, 24]) {
    for (const size of [3, 10, "all"]) {
      assert.equal(getTotalPages(count, size), getAdminTotalPages(count, size));
      const entries = Array.from({ length: count }, (_, i) => ({ id: i }));
      for (const page of [1, 2, 3]) {
        assert.deepEqual(getVisiblePlayers(entries, page, size), getAdminVisiblePlayers(entries, page, size));
      }
    }
  }
});
