import test from "node:test";
import assert from "node:assert/strict";

import {
  applyPlayerTemplateToRegistration,
  createEmptyRegistration,
  createTemplateUpdate,
  getInvalidRegistrationFields,
  getRegistrationFormRules,
  isRegistrationFieldRequired,
} from "../src/pages/Registration/registrationForm.js";

function createValidSetup(overrides = {}) {
  const settings = {
    availableShifts: { shift1: true, shift2: true, flexible: true },
    availableTiers: { T10: true, T11: true, T12: true, T14: false },
    alliances: [
      { tag: "ZLO", name: "ZLO Alliance" },
      { tag: "MIR", name: "MIR Alliance" },
    ],
    ...overrides,
  };
  const formRules = getRegistrationFormRules(settings);
  const data = createEmptyRegistration(formRules.customFields);

  Object.assign(data, {
    nickname: "Lwowsky",
    alliance: "ZLO",
    troopType: "fighter",
    tier: "T10",
    lairLevel: "50",
    marchSize: "500000",
    rallySize: "2500000",
    shift: "shift1",
  });

  return { settings, formRules, data };
}

function invalidFieldsFor(data, formRules) {
  return getInvalidRegistrationFields({
    data,
    rules: formRules.rules,
    visibleFields: formRules.visibleFields,
    requiredFields: formRules.requiredFields,
    availableTiers: formRules.availableTiers,
    visibleCustomFields: formRules.visibleCustomFields,
  });
}

test("registration: empty form includes all requested custom field ids", () => {
  const data = createEmptyRegistration([
    { id: "power" },
    { id: "timezone" },
  ]);

  assert.deepEqual(data.customFields, { power: "", timezone: "" });
  assert.equal(data.readiness.attack, false);
  assert.equal(data.extraSquads.fighter.enabled, false);
});

test("registration: hidden built-in field cannot remain required", () => {
  const { visibleFields, requiredFields } = getRegistrationFormRules({
    visibleFields: { comment: false },
    requiredFields: { comment: true },
  });

  assert.equal(
    isRegistrationFieldRequired(visibleFields, requiredFields, "comment"),
    false,
  );
});

test("registration: valid default-required data has no errors", () => {
  const { data, formRules } = createValidSetup();
  assert.deepEqual(invalidFieldsFor(data, formRules), []);
});

test("registration: required and unavailable fields are reported once", () => {
  const { data, formRules } = createValidSetup({
    requiredFields: { readyAttack: true, captain: true, extraSquads: true },
  });

  data.nickname = "";
  data.tier = "T14";
  data.shift = "shift4";

  assert.deepEqual(invalidFieldsFor(data, formRules).sort(), [
    "captain",
    "extraSquads",
    "nickname",
    "readyAttack",
    "shift",
    "tier",
  ]);
});

test("registration: required visible custom fields are validated, hidden ones are ignored", () => {
  const { data, formRules } = createValidSetup({
    customFields: [
      { id: "power", label: "Power", visible: true, required: true },
      { id: "secret", label: "Secret", visible: false, required: true },
    ],
  });

  data.customFields = { power: "", secret: "" };
  assert.deepEqual(invalidFieldsFor(data, formRules), ["custom:power"]);

  data.customFields.power = "123";
  assert.deepEqual(invalidFieldsFor(data, formRules), []);
});

test("registration: applying a template preserves custom alliance but clears unavailable tier and shift", () => {
  const { data, formRules } = createValidSetup();
  const template = {
    nickname: "Template",
    alliance: "OLD",
    troopType: "fighter",
    tier: "T14",
    shift: "shift4",
    extraSquads: {
      fighter: { enabled: true, tier: "T12" },
      rider: { enabled: true, tier: "T11" },
    },
  };

  const applied = applyPlayerTemplateToRegistration(data, template, {
    rules: formRules.rules,
    availableTiers: formRules.availableTiers,
    alliances: formRules.alliances,
  });

  assert.equal(applied.nickname, "Template");
  assert.equal(applied.alliance, "OLD");
  assert.equal(applied.tier, "");
  assert.equal(applied.shift, "");
  assert.equal(applied.extraSquads.fighter.enabled, false);
  assert.equal(applied.extraSquads.rider.enabled, true);
});

test("registration: template update copies registration fields without dropping template metadata", () => {
  const template = { id: "template-1", label: "Main" };
  const { data } = createValidSetup();
  const updated = createTemplateUpdate(template, data);

  assert.equal(updated.id, "template-1");
  assert.equal(updated.label, "Main");
  assert.equal(updated.nickname, "Lwowsky");
  assert.equal(updated.alliance, "ZLO");
  assert.deepEqual(updated.extraSquads, data.extraSquads);
});
