import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

// A regression guard for the UI duplication: one accordion owns BOTH actions.
test("turret add-player UI: a single panel owns reserve selection and new-player creation", () => {
  const add = read("../src/pages/Admin/turrets/TurretManualAdd.jsx");
  const assigned = read("../src/pages/Admin/turrets/TurretHelperEditor.jsx");
  const settings = read("../src/pages/Admin/turrets/TurretSettings.jsx");
  assert.match(add, /<details className="turret-details-box turret-manual-add">/);
  assert.match(add, /getHelperCandidates\(/);
  assert.match(add, /onAdd\(validChoice\)/);
  assert.match(add, /onCreate\(\{ \.\.\.form, tier: activeTier \}\)/);
  assert.match(add, /aria-pressed=\{mode === "reserve"\}/);
  assert.match(add, /aria-pressed=\{mode === "new"\}/);
  assert.doesNotMatch(assigned, /<details|turret-helper-picker|selectPlayer/);
  assert.match(settings, /onAdd=\{addSelectedHelper\} onCreate=\{createPlayer\}/);
});

test("turret add-player UI: source switch labels exist in UA and EN", () => {
  const uk = JSON.parse(read("../src/i18n/locales/uk/admin/distribution.json"));
  const en = JSON.parse(read("../src/i18n/locales/en/admin/distribution.json"));
  for (const key of ["addSource", "fromReserve", "newPlayer", "noReserveCandidates"]) {
    assert.ok(uk.towerEditor[key]);
    assert.ok(en.towerEditor[key]);
  }
});
