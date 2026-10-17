import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { getHeaderWasteland } from "../src/components/Header/headerWasteland.js";

const schedule = {
  cycleMode: "automatic",
  wastelandAnchorAt: "2026-10-03T10:00:00.000Z",
  wastelandIntervalDays: 14,
  wastelandDurationHours: 48, // old setting must not override strict 24h
  publicRegistration: false,
};
const at = (iso, overrides = {}) =>
  getHeaderWasteland({ ...schedule, ...overrides }, Date.parse(iso));
const next = "2026-10-31T10:00:00.000Z";

test("before Wasteland: label is ordinary Wasteland date", () => {
  const state = at("2026-10-17T09:59:59.000Z");
  assert.equal(state.active, false);
  assert.equal(state.date.toISOString(), "2026-10-17T10:00:00.000Z");
});

test("from the exact start until the end: show next Wasteland, not today's event", () => {
  for (const iso of ["2026-10-17T10:00:00.000Z", "2026-10-18T09:59:59.000Z"]) {
    const state = at(iso);
    assert.equal(state.active, true);
    assert.equal(state.date.toISOString(), next);
  }
});

test("at the exact 24-hour boundary: return to ordinary date, keeping next event date", () => {
  const state = at("2026-10-18T10:00:00.000Z");
  assert.equal(state.active, false);
  assert.equal(state.date.toISOString(), next);
});

test("manual registration mode does not change Wasteland phase and date", () => {
  const state = at("2026-10-17T12:00:00.000Z", {
    cycleMode: "manual",
    manualOpensAt: "2026-10-01T00:00:00.000Z",
    manualClosesAt: "2026-10-10T00:00:00.000Z",
  });
  assert.equal(state.active, true);
  assert.equal(state.date.toISOString(), next);
});

test("header is wired to live client clock and both JSON locale keys", () => {
  const header = readFileSync(new URL("../src/components/Header/Header.jsx", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../src/layouts/MainLayout.jsx", import.meta.url), "utf8");
  assert.match(header, /useNow\(1000\)/);
  assert.match(header, /getHeaderWasteland\(registrationConfig\?\.settings, nowMs\)/);
  assert.match(header, /wasteland\?\.active \? t\.header\.nextWasteland : t\.header\.wastelandDate/);
  assert.match(layout, /registrationConfig=\{registrationConfig\}/);
  for (const lang of ["uk", "en"]) {
    const dictionary = JSON.parse(readFileSync(
      new URL(`../src/i18n/locales/${lang}/ui/header.json`, import.meta.url), "utf8",
    ));
    assert.ok(dictionary.nextWasteland);
    assert.ok(dictionary.wastelandDate);
  }
});
