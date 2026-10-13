import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFileSync(join(root, relativePath), "utf8");
const dir = "src/pages/Admin/turrets/";

function rule(css, selector) {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, `Missing CSS rule: ${selector}`);
  return css.slice(start, css.indexOf("}", start) + 1);
}

test("032 visual polish: captain has a blue highlighted row without a status badge", () => {
  const editor = read(`${dir}TurretHelperEditor.jsx`);
  const css = read(`${dir}TurretAssignmentsStage.css`);
  assert.match(editor, /turret-assigned-table--captain/);
  assert.match(editor, /className=\{captain \? "turret-captain-role" : "turret-helper-role"\}/);
  assert.doesNotMatch(editor, /player-status-badge--captain-yes/);
  const captain = rule(css, ".turret-assigned-table--captain");
  assert.match(captain, /#d9eaff/);
  assert.match(captain, /inset 5px 0 #367cf2/);
  assert.doesNotMatch(captain, /#fff0d0|#e8ae41/);
});

test("032 visual polish: active turret has strong contrast and larger existing artwork", () => {
  const jsx = read(`${dir}TurretList.jsx`);
  const css = read(`${dir}TurretDistribution.css`);
  const stage = read(`${dir}TurretAssignmentsStage.css`);
  assert.match(jsx, /aria-pressed=\{selected === id\}/);
  assert.match(jsx, /TURRET_ICON_URLS\[id\]/);
  assert.match(rule(css, ".turret-list-card--active"), /#285fae/);
  assert.match(rule(css, ".turret-list-card__icon"), /width:76px;[\s\S]*height:76px/);
  assert.match(rule(stage, ".turret-detail-head__icon"), /width:78px;[\s\S]*height:78px/);
  // More specific selectors ensure the text does not inherit the normal dark-on-light colors.
  for (const element of ["strong", "span", "small"]) {
    assert.ok(css.includes(`.turret-list-card.turret-list-card--active ${element} {`));
  }
});

test("032 visual polish: technical max-helper hint removed, manual/global limits untouched", () => {
  const jsx = read(`${dir}TurretTowerLimits.jsx`);
  const css = read(`${dir}DistributionLimits.css`);
  assert.doesNotMatch(jsx, /turret-tower-limits__inherit-hint|labels\.overridesGlobal|labels\.inheritsGlobal/);
  assert.doesNotMatch(css, /turret-tower-limits__inherit-hint/);
  assert.match(jsx, /max="29"/);
  assert.match(jsx, /labels\.saveLimits/);
  assert.match(jsx, /labels\.recalculate/);
  assert.match(jsx, /labels\.resetLimits/);
  for (const lang of ["uk", "en"]) {
    const dictionary = JSON.parse(read(`src/i18n/locales/${lang}/admin/distribution.json`));
    assert.equal(Object.hasOwn(dictionary.towerEditor, "inheritsGlobal"), false);
    assert.equal(Object.hasOwn(dictionary.towerEditor, "overridesGlobal"), false);
  }
});
