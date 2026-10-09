import test from "node:test";
import assert from "node:assert/strict";

import {
  getRequiredFieldCount,
  getVisibleFieldCount,
  normalizeAllianceRotation,
  normalizeRegistrationSettings,
} from "../src/features/registration/registrationSettings.js";
import {
  buildRegistrationCandidate,
  createDefaultsConfirmState,
  createRegistrationConfirmState,
  getDisabledShiftConflicts,
  getRegistrationSettingsSummary,
  getRegistrationValidationError,
} from "../src/pages/Admin/registration/registrationSettingsAdmin.js";

test("settings: alliances are normalized and invalid entries are removed", () => {
  const settings = normalizeRegistrationSettings({
    alliances: [
      { tag: " zlo ", name: " ZLO Alliance " },
      { tag: "abcd", name: "Long tag" },
      { tag: "", name: "Missing" },
    ],
  });

  assert.deepEqual(settings.alliances, [
    { tag: "ZLO", name: "ZLO Alliance" },
    { tag: "ABC", name: "Long tag" },
  ]);
});

test("settings: alliance rotation keeps valid unique tags and appends missing alliances", () => {
  const alliances = [
    { tag: "ZLO" },
    { tag: "MIR" },
    { tag: "ABC" },
  ];

  assert.deepEqual(
    normalizeAllianceRotation(["MIR", "MIR", "UNKNOWN"], alliances),
    ["MIR", "ZLO", "ABC"],
  );
});

test("settings: hidden built-in fields and hidden custom fields cannot remain required", () => {
  const settings = normalizeRegistrationSettings({
    visibleFields: { comment: false },
    requiredFields: { comment: true },
    customFields: [
      { id: "visible", label: "Visible", visible: true, required: true },
      { id: "hidden", label: "Hidden", visible: false, required: true },
    ],
  });

  assert.equal(settings.requiredFields.comment, false);
  assert.equal(settings.customFields[0].required, true);
  assert.equal(settings.customFields[1].required, false);
});

test("settings: visible and required counters include custom fields", () => {
  const settings = normalizeRegistrationSettings({
    visibleFields: { comment: false },
    customFields: [
      { id: "visible", label: "Visible", visible: true, required: true },
      { id: "hidden", label: "Hidden", visible: false, required: false },
    ],
  });

  assert.equal(getVisibleFieldCount(settings), 12);
  assert.equal(getRequiredFieldCount(settings), 9);
});

test("settings admin: disabled shift conflicts count affected players", () => {
  const conflicts = getDisabledShiftConflicts(
    [
      { shift: "shift1" },
      { shift: "shift3" },
      { shift: "shift3" },
      { shift: "shift4" },
    ],
    { shift1: true, shift2: true, shift3: false, shift4: false },
  );

  assert.deepEqual(conflicts, [
    { shift: "shift3", count: 2 },
    { shift: "shift4", count: 1 },
  ]);
});

test("settings admin: validation blocks invalid period and empty shift/tier selections", () => {
  const base = normalizeRegistrationSettings({});

  assert.equal(
    getRegistrationValidationError("cycle", {
      ...base,
      opensAt: "",
      closesAt: "",
    }),
    "periodMissing",
  );
  assert.equal(
    getRegistrationValidationError("cycle", {
      ...base,
      opensAt: "2026-10-10T00:00:00.000Z",
      closesAt: "2026-10-09T00:00:00.000Z",
    }),
    "period",
  );
  assert.equal(
    getRegistrationValidationError("shifts", {
      ...base,
      availableShifts: { shift1: false, shift2: false, flexible: false },
    }),
    "shiftRequired",
  );
  assert.equal(
    getRegistrationValidationError("tiers", {
      ...base,
      availableTiers: Object.fromEntries(
        Object.keys(base.availableTiers).map((tier) => [tier, false]),
      ),
    }),
    "tierRequired",
  );
});

test("settings admin: active-cycle rule changes request confirmation, harmless changes do not", () => {
  const candidate = buildRegistrationCandidate(normalizeRegistrationSettings({}), {
    availableShifts: { shift1: true, shift2: false, flexible: true },
  });

  assert.equal(
    createRegistrationConfirmState({
      section: "shifts",
      candidate,
      currentCycleOpen: false,
    }),
    null,
  );

  assert.deepEqual(
    createRegistrationConfirmState({
      section: "shifts",
      candidate,
      currentCycleOpen: true,
    }),
    { kind: "rules", section: "shifts", candidate },
  );
});

test("settings admin: summary and defaults confirmation remain structurally stable", () => {
  const settings = normalizeRegistrationSettings({
    alliances: [
      { tag: "ZLO", name: "ZLO" },
      { tag: "MIR", name: "MIR" },
    ],
    allianceRotation: ["MIR", "ZLO"],
  });
  const summary = getRegistrationSettingsSummary(settings);
  const defaults = createDefaultsConfirmState(settings);

  assert.equal(summary.allianceCount, 2);
  assert.deepEqual(summary.rotation, ["MIR", "ZLO"]);
  assert.equal(summary.enabledShifts.includes("shift1"), true);
  assert.equal(defaults.kind, "defaults");
  assert.equal(defaults.section, "defaults");
  assert.equal(defaults.candidate.hostAlliance, settings.hostAlliance);
});
