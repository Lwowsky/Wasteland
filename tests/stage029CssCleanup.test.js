import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { cssSelectors } from "../scripts/audit-code-css.mjs";

function finalDeclarations(relativeFile, targetSelector, context = "") {
  const source = readFileSync(new URL(`../${relativeFile}`, import.meta.url), "utf8");
  const declarations = new Map();
  for (const rule of cssSelectors(source)) {
    if (rule.context !== context) continue;
    if (!rule.selector.split(",").some((part) => part.trim() === targetSelector)) continue;
    for (const [name, value] of rule.declarations) declarations.set(name, value);
  }
  return declarations;
}

test("029 CSS: registration row columns remain distinct for required and custom fields", () => {
  const path = "src/pages/Admin/registration/RegistrationAdminModal.core.css";
  assert.equal(finalDeclarations(path, ".registration-required-row").get("grid-template-columns"), "minmax(0, 1fr) 120px 120px");
  assert.equal(finalDeclarations(path, ".registration-custom-field-row").get("grid-template-columns"), "minmax(0, 1fr) 110px 110px 40px");
});

test("029 CSS: save and reset icons keep their original 23px and 28px sizes", () => {
  const path = "src/pages/Admin/registration/RegistrationCycleModal.css";
  assert.equal(finalDeclarations(path, ".registration-cycle-site-modal .registration-cycle-save-button img").get("width"), "23px");
  assert.equal(finalDeclarations(path, ".registration-cycle-site-modal .registration-cycle-reset-button img").get("width"), "28px");
});

test("029 CSS: setting-specific surfaces retain their final backgrounds", () => {
  const access = "src/pages/Admin/settings/ContentAccessPanel.css";
  assert.equal(finalDeclarations(access, ".settings-access-token-status").get("background"), "#f7faff");
  assert.equal(finalDeclarations(access, ".settings-access-generated").get("background"), "#f1f7ff");
  const reset = "src/pages/Admin/settings/FactoryResetModal.css";
  assert.equal(finalDeclarations(reset, ".factory-reset-select-all").get("background"), "#fff7f8");
  assert.equal(finalDeclarations(reset, ".factory-reset-option").get("background"), "#ffffff");
});

test("029 CSS: inputs, textarea, backup note and turret buttons keep their final values", () => {
  const site = "src/pages/Admin/settings/SiteIdentity.css";
  assert.equal(finalDeclarations(site, ".site-identity-field input").get("min-height"), "40px");
  assert.equal(finalDeclarations(site, ".site-identity-field textarea").get("min-height"), "64px");
  assert.equal(finalDeclarations("src/pages/Admin/settings/RegionBackupPanel.css", ".settings-backup-note").get("margin-top"), "7px");
  const workspace = "src/pages/Admin/turrets/TurretWorkspaceStatus.css";
  assert.equal(finalDeclarations(workspace, ".turret-workspace-status__save").get("color"), "#fff");
  assert.equal(finalDeclarations(workspace, ".turret-workspace-status__secondary").get("color"), "#225fa9");
});

test("029 CSS: responsive rules remain present, rather than being mistaken for duplicates", () => {
  const source = readFileSync(new URL("../src/pages/Admin/turrets/TurretWorkspaceStatus.css", import.meta.url), "utf8");
  const responsive = cssSelectors(source).filter(({ context }) => context.includes("@media"));
  assert.ok(responsive.some(({ selector }) => selector.includes("turret-workspace-status__save")));
});
