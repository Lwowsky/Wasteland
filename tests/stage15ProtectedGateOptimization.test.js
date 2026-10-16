import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

// Stage 16 removed snapshot-derived authorization helpers. Keep this test
// focused on preventing accidental reintroduction of those imports.
test("stage15: public players API does not use removed snapshot gate helpers", () => {
  const players = source("src/features/players/publicPlayersApi.js");
  assert.doesNotMatch(players, /publicStatusFromSnapshot|publicGateStatusFromSnapshot/);
});

test("stage15: content access API does not use removed snapshot gate helpers", () => {
  const access = source("src/features/contentAccess/contentAccessApi.js");
  assert.doesNotMatch(access, /publicStatusFromSnapshot|publicGateStatusFromSnapshot/);
});
