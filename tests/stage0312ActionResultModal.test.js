import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

const locales = ["uk", "en"];
const resultKeys = ["actionTitle", "successTitle", "infoTitle", "errorTitle", "acknowledge", "dismiss"];

test("031.2: every result-modal label exists in official JSON dictionaries", () => {
  for (const language of locales) {
    const dict = JSON.parse(read(`src/i18n/locales/${language}/admin/distribution.json`));
    for (const key of resultKeys) {
      assert.ok(dict.limits.feedback[key]?.trim(), `${language}: ${key}`);
    }
  }
});

test("031.2: action results use a centered modal with explicit acknowledgement and no timer", () => {
  const source = read("src/pages/Admin/turrets/TurretActionResultModal.jsx");
  const css = read("src/pages/Admin/turrets/TurretActionResultModal.css");
  assert.match(source, /<Modal\s/);
  assert.match(source, /backdropClassName="turret-action-result-backdrop"/);
  assert.match(source, /closeOnBackdrop=\{false\}/);
  assert.match(source, /labels\.acknowledge/);
  assert.match(source, /buttonRef\.current\?\.focus\(\)/);
  assert.match(source, /role=\{tone === "error" \? "alert" : "status"\}/);
  assert.doesNotMatch(source, /setTimeout|setInterval/);
  assert.match(css, /\.site-modal-backdrop\.turret-action-result-backdrop\s*\{\s*align-items:\s*center;/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.site-modal\.turret-action-result-modal/);
  for (const old of ["src/pages/Admin/turrets/TurretActionToast.jsx", "src/pages/Admin/turrets/TurretActionToast.css"]) {
    assert.equal(existsSync(new URL(`../${old}`, import.meta.url)), false, old);
  }
});

test("031.2: restore, apply, fill, redistribution and clear show their own action title", () => {
  const shifts = read("src/pages/Admin/turrets/FlexibleShiftSettings.jsx");
  const cycle = read("src/pages/Admin/turrets/TurretDistributionCycle.jsx");
  assert.match(shifts, /showResult\(t\.apply,/);
  assert.match(shifts, /showResult\(t\.restore,/);
  assert.match(cycle, /options\.operation === "redistribute" \? a\.distribution\.actions\.redistribute/);
  assert.match(cycle, /: a\.distribution\.actions\.fill/);
  assert.match(cycle, /title: a\.distribution\.actions\.clearHelpers/);
  assert.match(cycle, /<TurretActionResultModal\b/);
  assert.doesNotMatch(cycle, /TurretActionToast/);
  assert.doesNotMatch(shifts, /\{notice &&/);
});

test("031.2: the shared Modal supports an opt-in backdrop class without affecting other dialogs", () => {
  const source = read("src/components/Modal/Modal.jsx");
  assert.match(source, /backdropClassName = ""/);
  assert.match(source, /className=\{`site-modal-backdrop \$\{backdropClassName\}`\.trim\(\)\}/);
  assert.match(source, /aria-modal="true"/);
});
