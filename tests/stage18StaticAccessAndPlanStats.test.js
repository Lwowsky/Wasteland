import test from "node:test";
import assert from "node:assert/strict";
import { countPublishedPlanPlayers } from "../worker/src/public/publishedPlanCount.js";

test("published plan participant count deduplicates players across shifts", () => {
  const plan = { __languages: ["en"], shift1: { hub: { captain: { id: 7 }, players: [{ id: 8 }] } }, shift2: { hub: { captain: { id: 7 }, players: [{ id: 9 }] } } };
  assert.equal(countPublishedPlanPlayers(plan), 3);
  assert.equal(countPublishedPlanPlayers(null), 0);
});
