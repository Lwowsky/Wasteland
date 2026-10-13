import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  createPlayerTemplateDraft,
  createPlayerTemplate,
  getPlayerTemplates,
  normalizeTemplateExtraSquads,
  normalizePlayerTemplate,
  savePlayerTemplates,
} from "../src/features/playerTemplates/playerTemplatesStorage.js";
import {
  applyPlayerTemplateToRegistration,
  createEmptyRegistration,
  createTemplateUpdate,
  getInvalidRegistrationFields,
  getRegistrationFormRules,
} from "../src/pages/Registration/registrationForm.js";
import { TEMPLATE_ASSETS } from "../src/features/playerTemplates/templateAssets.js";

const TYPES = ["fighter", "rider", "shooter"];
const originalLocalStorage = globalThis.localStorage;

function squadData() {
  return Object.fromEntries(TYPES.map((type) => [type, { enabled: true, tier: "T12" }]));
}

test("034: primary troop is excluded from extra squads for every primary type", () => {
  for (const primary of TYPES) {
    const extras = normalizeTemplateExtraSquads(squadData(), primary);
    assert.equal(extras[primary].enabled, false);
    assert.equal(TYPES.filter((type) => extras[type].enabled).length, 2);
    assert.equal(extras[primary].tier, "T12");
  }
});

test("034: switching primary troops never leaves new primary enabled as an extra", () => {
  const oldDraft = createPlayerTemplateDraft({ troopType: "fighter", extraSquads: squadData() });
  assert.equal(oldDraft.extraSquads.fighter.enabled, false);
  const next = normalizeTemplateExtraSquads(oldDraft.extraSquads, "rider");
  assert.equal(next.rider.enabled, false);
  assert.equal(next.shooter.enabled, true);
});

test("034: malformed and legacy templates sanitize on read and save", () => {
  let stored = JSON.stringify([{ id: "legacy", nickname: "Test", troopType: "shooter", shift: "both", extraSquads: squadData() }]);
  globalThis.localStorage = {
    getItem: () => stored,
    setItem: (_key, value) => { stored = value; },
  };
  try {
    const loaded = getPlayerTemplates();
    assert.equal(loaded[0].extraSquads.shooter.enabled, false);
    assert.equal(loaded[0].shift, "flexible");
    savePlayerTemplates([{ ...loaded[0], extraSquads: squadData() }]);
    assert.equal(JSON.parse(stored)[0].extraSquads.shooter.enabled, false);
    assert.equal(normalizePlayerTemplate({ troopType: "fighter" }).extraSquads.fighter.enabled, false);
  } finally {
    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalLocalStorage;
  }
});

test("034: creating and updating templates both exclude primary troop", () => {
  const template = createPlayerTemplate({ nickname: "Test", troopType: "rider", extraSquads: squadData() });
  assert.equal(template.extraSquads.rider.enabled, false);
  const updated = createTemplateUpdate(template, { ...template, troopType: "fighter", extraSquads: squadData() });
  assert.equal(updated.extraSquads.fighter.enabled, false);
  assert.equal(updated.extraSquads.rider.enabled, true);
});

test("034: applying a legacy template to registration excludes primary extras", () => {
  const settings = {
    availableShifts: { shift1: true },
    availableTiers: { T12: true },
    alliances: [{ tag: "ZLO" }],
  };
  const formRules = getRegistrationFormRules(settings);
  const applied = applyPlayerTemplateToRegistration(createEmptyRegistration(), {
    nickname: "Test",
    troopType: "fighter",
    tier: "T12",
    shift: "shift1",
    alliance: "ZLO",
    extraSquads: squadData(),
  }, { rules: formRules.rules, availableTiers: formRules.availableTiers, alliances: formRules.alliances });
  assert.equal(applied.extraSquads.fighter.enabled, false);
  assert.equal(applied.extraSquads.rider.enabled, true);
  assert.equal(applied.extraSquads.shooter.enabled, true);
});

test("034: primary extra squad never satisfies required-extra-squads validation", () => {
  const formRules = getRegistrationFormRules({
    requiredFields: { extraSquads: true },
    availableTiers: { T12: true },
    availableShifts: { shift1: true },
  });
  const data = createEmptyRegistration();
  data.troopType = "fighter";
  data.extraSquads.fighter.enabled = true;
  const invalid = getInvalidRegistrationFields({
    data,
    rules: formRules.rules,
    visibleFields: formRules.visibleFields,
    requiredFields: formRules.requiredFields,
    availableTiers: formRules.availableTiers,
    visibleCustomFields: formRules.visibleCustomFields,
  });
  assert.ok(invalid.includes("extraSquads"));
});

test("034: settings form renders only two non-primary types", () => {
  const form = readFileSync(resolve("src/pages/Settings/components/PlayerTemplateForm.jsx"), "utf8");
  const page = readFileSync(resolve("src/pages/Settings/Settings.jsx"), "utf8");
  assert.match(form, /filter\(\(type\) => type !== templateForm\.troopType\)/);
  assert.match(page, /normalizeTemplateExtraSquads\(current\.extraSquads, value\)/);
  const playerSection = readFileSync(resolve("src/features/registration/components/PlayerSection.jsx"), "utf8");
  assert.match(playerSection, /normalizeTemplateExtraSquads\(current\.extraSquads, value\)/);
});

test("034: existing icon references resolve and registration selector has explicit CSS", () => {
  for (const [name, path] of Object.entries(TEMPLATE_ASSETS)) {
    assert.ok(existsSync(resolve(`public${path}`)), `${name}: ${path}`);
  }
  const selector = readFileSync(resolve("src/features/playerTemplates/PlayerTemplateSelector.jsx"), "utf8");
  assert.match(selector, /PlayerTemplateSelector\.css/);
  assert.match(selector, /registration-template__preview/);
  assert.match(selector, /registration-template__choice/);
});
