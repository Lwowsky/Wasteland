import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getPublicCycleViewState } from "../shared/registrationCycle.js";
import { getNextRegistrationOpening } from "../src/features/contentAccess/nextRegistrationOpening.js";
import { getClosedCycleCopy } from "../src/features/contentAccess/closedCycleCopy.js";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const uk = JSON.parse(source("src/i18n/locales/uk/ui/contentAccess.json"));
const en = JSON.parse(source("src/i18n/locales/en/ui/contentAccess.json"));
const schedule = {
  cycleMode: "automatic",
  wastelandAnchorAt: "2026-10-03T10:00:00.000Z",
  wastelandIntervalDays: 14,
  registrationCloseMode: "gameDayReset",
  registrationOpenWeekdayUtc: 5,
  registrationOpenTimeUtc: "00:00",
};
const ms = Date.parse;

test("Stage 047: closed-cycle next opening follows configured weekday, not fixed Friday", () => {
  const monday = ms("2026-10-19T00:00:00Z");
  assert.equal(getPublicCycleViewState(schedule, monday).state, "closed");
  assert.equal(getNextRegistrationOpening(schedule, monday), "2026-10-23T00:00:00.000Z");
  const custom = { ...schedule, registrationOpenWeekdayUtc: 3, registrationOpenTimeUtc: "04:30" };
  const closed = getPublicCycleViewState(custom, monday);
  assert.equal(closed.state, "closed");
  assert.equal(getNextRegistrationOpening(custom, monday), "2026-10-28T04:30:00.000Z");
  assert.equal(getPublicCycleViewState(custom, ms("2026-10-28T04:30:00Z")).state, "open");
});

test("Stage 047: Monday-to-Friday opening has localized date and countdown without API", () => {
  const nowMs = ms("2026-10-19T00:00:00Z");
  const nextOpensAt = getNextRegistrationOpening(schedule, nowMs);
  const english = getClosedCycleCopy({ copy: en, resource: "players", nextOpensAt, nowMs, language: "en", useLocalTime: false });
  assert.match(english.text, /23 October 2026/);
  assert.match(english.countdown, /4d 00h 00m/);
  const ukrainian = getClosedCycleCopy({ copy: uk, resource: "players", nextOpensAt, nowMs, language: "uk", useLocalTime: false });
  assert.match(ukrainian.text, /23 жовтня 2026/);
  assert.match(ukrainian.countdown, /4 дн 00 год 00 хв/);
  assert.doesNotMatch(ukrainian.text, /п’ятницю/);
});

test("Stage 047: final plan does not promise a private link when public mode is enabled", () => {
  const info = getClosedCycleCopy({ copy: uk, resource: "final_plan", nextOpensAt: null, nowMs: ms("2026-10-19T00:00:00Z"), language: "uk", useLocalTime: false });
  assert.match(info.text, /публікації адміністратором/);
  assert.doesNotMatch(info.text, /приватн/);
  assert.equal(info.countdown, "");
});

test("Stage 047: static-first public layout avoids Worker fallback on failed CDN snapshots", () => {
  const registrationApi = source("src/features/registration/registrationApi.js");
  const mainCalendar = source("src/features/event/useEvent.js");
  assert.match(registrationApi, /staticOnly && isPublicSnapshotEnabled\(\) && !staticSettings/);
  assert.match(registrationApi, /throw new Error\("PUBLIC_CALENDAR_UNAVAILABLE"\)/);
  assert.match(mainCalendar, /staticOnly:\s*!force && isPublicSnapshotEnabled\(\)/);
  // Critical server-validation boundaries must remain unchanged.
  assert.match(registrationApi, /if \(serverOnly\) return fetchRegistrationSettings\(\)/);
  assert.match(registrationApi, /export async function submitRegistration/);
});

test("Stage 047: no server content access check while public cycle is closed", () => {
  const gate = source("src/features/contentAccess/ContentAccessGate.jsx");
  const closedBranch = gate.indexOf("if (cycleClosed) {");
  const statusCheck = gate.indexOf("if (loading) {");
  assert.ok(closedBranch >= 0 && statusCheck > closedBranch);
  assert.match(gate, /if \(cycleClosed \|\| !settingsLoaded\)/);
  assert.match(gate, /getClosedCycleCopy\(/);
});


test("Stage 047 clean: manual dates do not generate fictional automatic countdown", () => {
  assert.equal(getNextRegistrationOpening({ ...schedule, cycleMode: "manual" }, ms("2026-10-19T00:00:00Z")), null);
});

test("Stage 047 clean: flagged shared registration module is unchanged", () => {
  const gate = source("src/features/contentAccess/ContentAccessGate.jsx");
  assert.match(gate, /getNextRegistrationOpening\(registrationConfig.settings, now\)/);
});
