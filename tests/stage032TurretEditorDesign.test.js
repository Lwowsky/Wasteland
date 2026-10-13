import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => readFileSync(join(root, name), "utf8");
const turretPath = "src/pages/Admin/turrets/";
const settings = read(`${turretPath}TurretSettings.jsx`);
const helpers = read(`${turretPath}TurretHelperEditor.jsx`);
const limits = read(`${turretPath}TurretTowerLimits.jsx`);
const list = read(`${turretPath}TurretList.jsx`);
const mainCss = read(`${turretPath}TurretAssignmentsStage.css`);
const limitsCss = read(`${turretPath}TurretTowerEditor.css`);

const iconPaths = [
  "/images/admin/icons/actions/fill-turrets.webp",
  "/images/admin/icons/actions/delete.webp",
  "/images/admin/icons/actions/edit.webp",
];

test("032 turret UI: all editor actions reuse actual existing site assets", () => {
  for (const path of iconPaths) {
    assert.equal(existsSync(join(root, "public", path.slice(1))), true, path);
    assert.ok(settings.includes(path) || helpers.includes(path), path);
  }
});

test("032 turret UI: captain choice, tower autofill and clear remain in one toolbar", () => {
  const start = settings.indexOf('className="turret-captain-toolbar"');
  const end = settings.indexOf('className="turret-metrics"', start);
  assert.ok(start > 0 && end > start);
  const toolbar = settings.slice(start, end);
  assert.match(toolbar, /<TurretCaptainEditor/);
  assert.match(toolbar, /operation: "tower", shift, tower: selectedId/);
  assert.match(toolbar, /onClick=\{clearSelected\}/);
  assert.match(toolbar, /disabled=\{autoDisabled\}/);
  assert.match(settings, /requestConfirm\?\.\(/);
  assert.doesNotMatch(settings, /turret-detail-auto|turret-detail-policies|currentRules/);
});

test("032 turret UI: captain still requires explicit manual action to change", () => {
  const editor = read(`${turretPath}TurretCaptainEditor.jsx`);
  assert.match(editor, /onClick=\{\(\) => onSetCaptain\(choice\)\}/);
  assert.match(settings, /changeCaptain\(assignments, shift, selectedId, id, players, settings\)/);
  assert.match(settings, /onConfirm: \(\) => apply\(\(assignments\) => clearTurret/);
});

test("032 turret UI: badge components are reused and captain row is distinguished", () => {
  assert.match(settings, /import TroopBadge from/);
  assert.match(settings, /<TroopBadge type=\{captain\.troopType\}/);
  assert.match(helpers, /import TierBadge from/);
  assert.match(helpers, /<TierBadge tier=\{player\.tier\} compact/);
  assert.doesNotMatch(helpers, /player-status-badge--captain-yes/);
  assert.match(helpers, /turret-captain-role/);
  assert.match(helpers, /turret-assigned-table--captain/);
  assert.match(mainCss, /\.turret-assigned-table--captain\s*\{/);
});

test("032 turret UI: the editing button has one narrow column and an image", () => {
  assert.match(helpers, /className="admin-secondary-button turret-assigned-edit"/);
  assert.match(mainCss, /grid-template-columns:minmax\(160px,2fr\).*48px;/);
  assert.match(limitsCss, /\.turret-assigned-edit img\s*\{/);
});

test("032 turret UI: local per-tier inputs are compact with bottom-left helper limit", () => {
  const fields = limits.indexOf('className="turret-tower-limits__fields"');
  const footer = limits.indexOf('className="turret-tower-limits__footer"');
  const count = limits.indexOf('className="admin-field turret-tower-limits__max"');
  const buttons = limits.indexOf('className="turret-tower-limits__actions"');
  assert.ok(fields >= 0 && footer > fields && count > footer && buttons > count);
  assert.match(limitsCss, /grid-template-columns:repeat\(auto-fill,minmax\(94px,108px\)\)/);
  assert.match(limits, /max="29"/);
  assert.match(limits, /labels\.saveLimits/);
  assert.match(limits, /labels\.recalculate/);
  assert.match(limits, /labels\.resetLimits/);
});

test("032 turret UI: active turret is highlighted, and responsive list keeps readable icons", () => {
  const distributionCss = read(`${turretPath}TurretDistribution.css`);
  assert.match(list, /aria-pressed=\{selected === id\}/);
  assert.match(list, /turret-list-card--active/);
  assert.match(distributionCss, /\.turret-list-card--active\s*\{[^}]+box-shadow:inset 4px/);
  assert.match(distributionCss, /\.turret-list-card__icon\s*\{[^}]+width:76px/);
  assert.match(distributionCss, /@media \(max-width:520px\)/);
});

test("032 turret UI: obsolete technical sentence is absent in both locale files", () => {
  assert.doesNotMatch(settings, /currentRules/);
  for (const lang of ["uk", "en"]) {
    const catalog = JSON.parse(read(`src/i18n/locales/${lang}/admin/distribution.json`));
    assert.equal(Object.hasOwn(catalog.manual, "currentRules"), false);
    assert.ok(catalog.turret.autofill);
    assert.ok(catalog.towerEditor.maxHelpers);
  }
});
