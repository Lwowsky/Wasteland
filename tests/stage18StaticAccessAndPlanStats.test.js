import test from "node:test";
import assert from "node:assert/strict";
import { countPublishedPlanPlayers } from "../worker/src/public/publishedPlanCount.js";

test("published plan counts distinct participants across shifts and turrets", () => {
  const plan = {
    __languages: ["en"],
    shift1: { hub: {
      captain: { id: "shift1-hub-captain", nickname: "Lwowsky", alliance: "YYY" },
      players: [{ id: "shift1-hub-0", nickname: "Friend", alliance: "DIO" }],
    } },
    shift2: { hub: {
      captain: { id: "shift2-hub-captain", nickname: "Lwowsky", alliance: "YYY" },
      players: [{ id: "shift2-hub-0", nickname: "Friend", alliance: "DIO" }],
    } },
  };
  assert.equal(countPublishedPlanPlayers(plan), 2);
  assert.equal(countPublishedPlanPlayers(null), 0);
});

test("different people with identical nickname in different alliances count separately", () => {
  const plan = { shift1: { hub: {
    captain: { id: "one", nickname: "Alex", alliance: "AAA" },
    players: [{ id: "two", nickname: "Alex", alliance: "BBB" }],
  } } };
  assert.equal(countPublishedPlanPlayers(plan), 2);
});

test("legacy records without nicknames still use their ID", () => {
  const plan = { shift1: { hub: { captain: { id: 7 }, players: [{ id: 8 }] } }, shift2: { hub: { captain: { id: 7 }, players: [{ id: 9 }] } } };
  assert.equal(countPublishedPlanPlayers(plan), 3);
});
