import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("event settings do not poll in the background or refetch on window focus", () => {
  const source = read("src/features/event/useEvent.js");
  assert.doesNotMatch(source, /setInterval\s*\(/);
  assert.doesNotMatch(source, /addEventListener\(\s*["']focus["']/);
  assert.match(source, /registration-settings-updated/);
  assert.match(source, /addEventListener\(\s*["']storage["']/);
});

test("public JSON fallback is time-limited, while network revalidation remains enabled", () => {
  const source = read("src/features/players/publicSnapshot.js");
  assert.match(source, /OFFLINE_FALLBACK_TTL_MS = 30 \* 60 \* 1000/);
  assert.match(source, /cache: "no-cache"/);
  assert.match(source, /Number\.isFinite\(parsed\.savedAt\)/);
});

test("content access remains server-validated, without public-only shortcut", () => {
  const source = read("src/features/contentAccess/ContentAccessGate.jsx");
  assert.match(source, /getContentAccessStatus\(resource\)/);
});
