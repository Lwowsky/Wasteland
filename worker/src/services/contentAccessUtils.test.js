import assert from "node:assert/strict";
import test from "node:test";

import { getTokenExpiryIso } from "./contentAccessUtils.js";

test("access tokens: zero TTL means no expiration", () => {
  assert.equal(getTokenExpiryIso(0, 1_700_000_000_000), null);
});

test("access tokens: TTL is measured in minutes", () => {
  const start = Date.parse("2026-10-15T00:00:00.000Z");
  assert.equal(getTokenExpiryIso(30, start), "2026-10-15T00:30:00.000Z");
  assert.equal(getTokenExpiryIso(1440, start), "2026-10-16T00:00:00.000Z");
});
