import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getHomeCountdownPhases } from "../src/pages/Home/utils/homeCountdownPhases.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const HOUR_MS = 60 * 60 * 1000;
const settings = {
  cycleMode: "automatic",
  wastelandAnchorAt: "2026-10-03T10:00:00.000Z",
  wastelandIntervalDays: 14,
  wastelandDurationHours: 24,
  registrationCloseMode: "gameDayReset",
  registrationOpenWeekdayUtc: 5,
  registrationOpenTimeUtc: "00:00",
  publicRegistration: true,
};

const phaseAt = (iso, overrides = {}) =>
  getHomeCountdownPhases({ ...settings, ...overrides }, Date.parse(iso));

test("home: registration open counts to its configured closing", () => {
  const phase = phaseAt("2026-10-12T12:00:00.000Z");
  assert.deepEqual(phase.registration, {
    phase: "open",
    target: Date.parse("2026-10-16T00:00:00.000Z"),
  });
});

test("home: after closing, next registration opens in the next cycle", () => {
  const phase = phaseAt("2026-10-16T00:00:00.000Z");
  assert.deepEqual(phase.registration, {
    phase: "closed",
    target: Date.parse("2026-10-23T00:00:00.000Z"),
  });
});

test("home: event starts exactly at configured time and lasts 24 hours", () => {
  const start = phaseAt("2026-10-17T10:00:00.000Z");
  assert.deepEqual(start.event, {
    phase: "active",
    target: Date.parse("2026-10-18T10:00:00.000Z"),
  });
  const midway = phaseAt("2026-10-18T09:00:00.000Z");
  assert.equal(midway.event.phase, "active");
  assert.equal(midway.event.target - Date.parse("2026-10-18T09:00:00.000Z"), HOUR_MS);
});

test("home: after 24 hours the countdown returns to next Wasteland", () => {
  const ended = phaseAt("2026-10-18T10:00:00.000Z");
  assert.deepEqual(ended.event, {
    phase: "upcoming",
    target: Date.parse("2026-10-31T10:00:00.000Z"),
  });
});

test("home: manual registration does not invent a future opening", () => {
  const closed = phaseAt("2026-10-18T11:00:00.000Z", {
    cycleMode: "manual",
    manualOpensAt: "2026-10-08T00:00:00.000Z",
    manualClosesAt: "2026-10-16T00:00:00.000Z",
  });
  assert.deepEqual(closed.registration, { phase: "closed", target: null });
});

test("home: disabled public registration doesn't promise reopening", () => {
  assert.deepEqual(
    phaseAt("2026-10-12T12:00:00.000Z", { publicRegistration: false }).registration,
    { phase: "disabled", target: null },
  );
});

test("home: alliances initially show 5 with a toggle to display all", () => {
  const code = read("src/pages/Home/sections/OverviewSection.jsx");
  assert.match(code, /allianceStats\.slice\(0, 5\)/);
  assert.match(code, /setShowAllAlliances/);
  assert.match(code, /home\.dashboard\.allianceStats\.showAll/);
  assert.match(code, /home\.dashboard\.allianceStats\.showLess/);
});

test("home: all four navigation cards and stats use existing game images", () => {
  const files = ["StatsSection.jsx", "NavigationSection.jsx"];
  for (const file of files) {
    const code = read(`src/pages/Home/sections/${file}`);
    const refs = [...code.matchAll(/"(\/images\/[^"\n]+\.webp)"/g)];
    assert.ok(refs.length >= 4, file);
    for (const [, image] of refs) {
      assert.ok(fs.existsSync(path.join(root, "public", image.slice(1))), `${file}: ${image}`);
    }
  }
});

test("home: new UI text is sourced from the UK and EN JSON dictionaries", () => {
  const uk = JSON.parse(read("src/i18n/locales/uk/content/home.json")).dashboard;
  const en = JSON.parse(read("src/i18n/locales/en/content/home.json")).dashboard;
  for (const key of ["showAll", "showLess"]) {
    assert.ok(uk.allianceStats[key]);
    assert.ok(en.allianceStats[key]);
  }
  for (const key of ["closedTitle", "closedSubtitle", "closed", "disabledSubtitle"]) {
    assert.ok(uk.registrationCountdown[key]);
    assert.ok(en.registrationCountdown[key]);
  }
  for (const key of ["activeTitle", "activeSubtitle", "active"]) {
    assert.ok(uk.eventCountdown[key]);
    assert.ok(en.eventCountdown[key]);
  }
});
