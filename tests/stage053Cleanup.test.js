import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isRegistrationFieldVisible,
  isRegistrationFieldRequired,
} from "../shared/registrationFieldRules.js";
import {
  isRegistrationFieldVisible as visibleInForm,
  isRegistrationFieldRequired as requiredInForm,
} from "../src/pages/Registration/registrationForm.js";
import { replaceTemplateName } from "../src/pages/Admin/utils/replaceTemplateName.js";

const source = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("053: shared registration visibility is true by default and false only for explicit false", () => {
  for (const fields of [undefined, {}, { nickname: true }, { nickname: null }]) {
    assert.equal(isRegistrationFieldVisible(fields, "nickname"), true);
    assert.equal(visibleInForm(fields, "nickname"), true);
  }
  const fields = { nickname: false, tier: true };
  assert.equal(isRegistrationFieldVisible(fields, "nickname"), false);
  assert.equal(isRegistrationFieldVisible(fields, "tier"), true);
});

test("053: hidden fields cannot be required, including when required flag is true", () => {
  const required = { nickname: true, tier: true, alliance: false };
  const shown = { nickname: true, tier: false, alliance: true };
  for (const field of ["nickname", "tier", "alliance", "comment"]) {
    assert.equal(requiredInForm(shown, required, field), isRegistrationFieldRequired(shown, required, field));
  }
  assert.equal(isRegistrationFieldRequired(shown, required, "nickname"), true);
  assert.equal(isRegistrationFieldRequired(shown, required, "tier"), false);
  assert.equal(isRegistrationFieldRequired(shown, required, "alliance"), false);
  assert.equal(isRegistrationFieldRequired(undefined, undefined, "comment"), false);
});

test("053: Worker and PlayerSection use identical shared field decisions", () => {
  assert.match(source("worker/src/public/registration.js"), /isRegistrationFieldRequired\(settings\.visibleFields, settings\.requiredFields, field\)/);
  assert.match(source("src/features/registration/components/PlayerSection.jsx"), /isRegistrationFieldRequired\(visibleFields, requiredFields, field\)/);
});

test("053: template helper keeps former replacement behavior", () => {
  assert.equal(replaceTemplateName("Remove {{name}}?", "Lwowsky"), "Remove Lwowsky?");
  assert.equal(replaceTemplateName("{{name}}/{{name}}", "X"), "X/{{name}}");
  assert.equal(replaceTemplateName(undefined, "X"), "");
  assert.equal(replaceTemplateName("Hello {{name}}", null), "Hello ");
});

test("053: CSS consolidations keep both scoped selectors", () => {
  assert.match(source("src/pages/Admin/registration/RegistrationAdminModal.core.css"), /\.registration-alliance-item span,\s*\.registration-rotation-item__name\s*\{/);
  assert.match(source("src/pages/Admin/tabs/SettingsTab.css"), /\.factory-reset-danger-button,\s*\.settings-danger-zone__button\s*\{/);
  assert.match(source("src/pages/Admin/settings/SystemSettingsModal.css"), /\.factory-reset-danger-button:hover:not\(:disabled\)/);
});
