import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getLanguagePath, normalizeLanguage, getStoredLanguage, savePreferredLanguage, getBrowserLanguage, resolvePreferredLanguage } from "../src/utils/language.js";
import { findDuplicateJsonKeys } from "../scripts/audit-json-duplicate-keys.mjs";
import { getHeaderWasteland } from "../src/components/Header/headerWasteland.js";
import { getPublicCycleViewState } from "../shared/registrationCycle.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const cycle = {
  cycleMode: "automatic",
  wastelandAnchorAt: "2026-10-03T10:00:00.000Z",
  wastelandIntervalDays: 14,
  registrationCloseMode: "gameDayReset",
  registrationOpenWeekdayUtc: 5,
  registrationOpenTimeUtc: "00:00",
  publicRegistration: true,
};

test("Stage 044: language changes preserve all paths and opaque share capabilities", () => {
  for (const segment of ["registration", "players", "player", "final-plan", "settings", "login", "admin"]) {
    assert.equal(getLanguagePath(`/${segment}`, "uk"), `/uk/${segment}`);
    assert.equal(getLanguagePath(`/en/${segment}`, "uk"), `/uk/${segment}`);
    assert.equal(getLanguagePath(`/uk/${segment}`, "en"), `/en/${segment}`);
  }
  assert.equal(getLanguagePath("/", "uk"), "/uk");
  assert.equal(getLanguagePath("/en", "uk"), "/uk");
  assert.equal(getLanguagePath("/s/p0123456789abcde", "en"), "/s/p0123456789abcde");
  assert.equal(getLanguagePath("/players", "fr"), "/en/players");
  assert.equal(normalizeLanguage("uk-UA"), "uk");
});

test("Stage 044: blocked browser storage never crashes navigation", () => {
  const original = globalThis.window;
  try {
    globalThis.window = { localStorage: {
      getItem() { throw new Error("blocked"); },
      setItem() { throw new Error("blocked"); },
    } };
    assert.equal(getStoredLanguage(), "");
    assert.doesNotThrow(() => savePreferredLanguage("uk"));
    // Blocked storage falls back to the detected browser language (which can be Ukrainian).
    assert.equal(resolvePreferredLanguage(), getBrowserLanguage());
  } finally {
    if (original === undefined) delete globalThis.window;
    else globalThis.window = original;
  }
});

test("Stage 044: JSON audit rejects duplicate keys in each nested scope", () => {
  const sample = '{"same":1,"nested":{"same":1,"same":2},"same":3,"items":[{"name":"one","name":"two"}]}';
  const repeated = findDuplicateJsonKeys(sample).map((issue) => issue.key);
  assert.deepEqual(repeated, ["nested.same", "same", "items[0].name"]);
  assert.deepEqual(findDuplicateJsonKeys('{"left":{"name":"1"},"right":{"name":"2"}}'), []);
  const escapedKey = JSON.stringify('es"c');
  const escapedSample = `{${escapedKey}:1,${escapedKey}:2}`;
  assert.deepEqual(findDuplicateJsonKeys(escapedSample).map(({ key }) => key), ['es"c']);
});

test("Stage 044: automatic calendar changes header dates without server polls", () => {
  const before = getHeaderWasteland(cycle, Date.parse("2026-10-17T11:00:00Z"));
  const after = getHeaderWasteland(cycle, Date.parse("2026-11-01T11:00:00Z"));
  assert.equal(before.active, true);
  assert.equal(before.date.toISOString(), "2026-10-31T10:00:00.000Z");
  assert.equal(after.active, false);
  assert.equal(after.date.toISOString(), "2026-11-14T10:00:00.000Z");
  const hook = read("src/features/event/useEvent.js");
  assert.match(hook, /useNow\(60_000\)/);
  assert.match(hook, /buildEvent\(registrationConfig\.settings, nowMs\)/);
  assert.doesNotMatch(hook, /setInterval\(|addEventListener\(\s*["']focus["']/);
});

test("Stage 044: cycle visibility closes after the event and reopens next cycle", () => {
  assert.equal(getPublicCycleViewState(cycle, Date.parse("2026-11-02T00:00:00Z")).visible, false);
  assert.equal(getPublicCycleViewState(cycle, Date.parse("2026-11-06T01:00:00Z")).visible, true);
});
