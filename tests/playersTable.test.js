import test from "node:test";
import assert from "node:assert/strict";

import {
  filterPlayers,
  formatPlayerTimeAgo,
  getPlayerAlliances,
  getPlayerStats,
  getTotalPages,
  getVisiblePlayers,
} from "../src/pages/Players/playersTable.js";

const PLAYERS = [
  {
    nickname: "Alpha",
    alliance: "ZLO",
    troopType: "fighter",
    tier: "T10",
    shift: "shift1",
    readiness: { captain: true },
  },
  {
    nickname: "Bravo",
    alliance: "MIR",
    troopType: "rider",
    tier: "T11",
    shift: "shift2",
    readiness: { captain: false },
  },
  {
    nickname: "Charlie",
    alliance: "ZLO",
    troopType: "shooter",
    tier: "T12",
    shift: "flexible",
    readiness: {},
  },
];

const ALL_FILTERS = {
  search: "",
  alliance: "all",
  troop: "all",
  shift: "all",
  captain: "all",
};

test("players: alliance options are unique and sorted", () => {
  assert.deepEqual(getPlayerAlliances(PLAYERS), ["MIR", "ZLO"]);
});

test("players: search is case-insensitive and matches nickname or alliance", () => {
  assert.deepEqual(
    filterPlayers(PLAYERS, { ...ALL_FILTERS, search: "alp" }).map(
      (player) => player.nickname,
    ),
    ["Alpha"],
  );

  assert.deepEqual(
    filterPlayers(PLAYERS, { ...ALL_FILTERS, search: "mir" }).map(
      (player) => player.nickname,
    ),
    ["Bravo"],
  );
});

test("players: filters combine without changing the source array", () => {
  const before = structuredClone(PLAYERS);
  const result = filterPlayers(PLAYERS, {
    ...ALL_FILTERS,
    alliance: "ZLO",
    troop: "fighter",
    shift: "shift1",
    captain: "yes",
  });

  assert.deepEqual(result.map((player) => player.nickname), ["Alpha"]);
  assert.deepEqual(PLAYERS, before);
});

test("players: captain=no includes false and missing captain values", () => {
  const result = filterPlayers(PLAYERS, {
    ...ALL_FILTERS,
    captain: "no",
  });

  assert.deepEqual(
    result.map((player) => player.nickname),
    ["Bravo", "Charlie"],
  );
});

test("players: statistics are calculated correctly in one result", () => {
  assert.deepEqual(getPlayerStats(PLAYERS), {
    total: 3,
    captains: 1,
    fighters: 1,
    riders: 1,
    shooters: 1,
    shift1: 1,
    shift2: 1,
    shift3: 0,
    shift4: 0,
    flexible: 1,
  });
});

test("players: pagination supports fixed sizes and All", () => {
  const players = Array.from({ length: 25 }, (_, index) => ({ id: index + 1 }));

  assert.equal(getTotalPages(players.length, 10), 3);
  assert.equal(getTotalPages(players.length, "all"), 1);
  assert.deepEqual(
    getVisiblePlayers(players, 2, 10).map((player) => player.id),
    [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  );
  assert.equal(getVisiblePlayers(players, 1, "all").length, 25);
});

test("players: time-ago formatting handles seconds, minutes, hours and days", () => {
  const now = Date.parse("2026-10-09T12:00:00.000Z");
  const t = {
    players: {
      time: {
        justNow: "just-now",
        minutesAgo: "{{count}}m",
        hoursAgo: "{{count}}h",
        daysAgo: "{{count}}d",
      },
    },
  };

  assert.equal(formatPlayerTimeAgo("2026-10-09T11:59:45.000Z", t, now), "just-now");
  assert.equal(formatPlayerTimeAgo("2026-10-09T11:55:00.000Z", t, now), "5m");
  assert.equal(formatPlayerTimeAgo("2026-10-09T09:00:00.000Z", t, now), "3h");
  assert.equal(formatPlayerTimeAgo("2026-10-07T12:00:00.000Z", t, now), "2d");
  assert.equal(formatPlayerTimeAgo("not-a-date", t, now), "-");
});
