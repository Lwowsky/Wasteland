import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  getPlanShiftHeading,
} from "../src/pages/FinalPlan/data/finalPlanLanguages.js";
import { formatFinalPlanTxt } from "../src/pages/FinalPlan/services/finalPlanText.js";
import uk from "../src/i18n/locales/uk/content/finalPlan.json" with { type: "json" };
import en from "../src/i18n/locales/en/content/finalPlan.json" with { type: "json" };
import ukAdmin from "../src/i18n/locales/uk/admin/distribution.json" with { type: "json" };
import enAdmin from "../src/i18n/locales/en/admin/distribution.json" with { type: "json" };
import { cssSelectors, inspectCodeCss } from "../scripts/audit-code-css.mjs";

test("029: shift headings show only the number in each enabled language", () => {
  assert.equal(getPlanShiftHeading("shift1", ["uk", "en"]), "Зміна 1 ✦ Shift 1");
  assert.equal(getPlanShiftHeading("shift2", ["en"]), "Shift 2");
  assert.equal(getPlanShiftHeading("shift3", ["uk", "en"]), "Зміна 3 ✦ Shift 3");
  assert.equal(getPlanShiftHeading("shift4", ["uk", "en"]), "Зміна 4 ✦ Shift 4");
});

test("029: half-of-event labels are absent from public and admin catalogs", () => {
  for (const catalog of [uk, en]) {
    assert.equal(Object.hasOwn(catalog, "firstHalf"), false);
    assert.equal(Object.hasOwn(catalog, "secondHalf"), false);
  }
  for (const catalog of [ukAdmin, enAdmin]) {
    assert.equal(Object.hasOwn(catalog.final, "firstHalf"), false);
  }
});

test("029: TXT titles omit half-of-event labels without changing rosters", () => {
  const text = formatFinalPlanTxt({
    planByShift: {
      shift1: { hub: { troopType: "fighter", captain: {
        nickname: "Leader", alliance: "A", tier: "T12", marchSize: 3000,
      }, players: [{ nickname: "Helper", alliance: "B", tier: "T11", marchSize: 2000 }] } },
      shift2: { north: { troopType: "rider", players: [] } },
    },
    shifts: ["shift1", "shift2"],
    selectedLanguages: ["uk", "en"],
    t: { finalPlan: { columns: {} } },
  });
  assert.match(text, /Зміна 1 ✦ Shift 1/);
  assert.match(text, /Зміна 2 ✦ Shift 2/);
  assert.match(text, /Leader ✦ A ✦ T12/);
  assert.match(text, /Helper ✦ B ✦ T11/);
  assert.doesNotMatch(text, /Перша половина|Друга половина|First half|Second half/);
});

test("029: CSS usage report distinguishes responsive overrides from true duplicates", () => {
  const samples = cssSelectors(`
    .row { color: red; }
    @media (max-width: 700px) { .row { color: blue; } }
    .row { padding: 4px; }
  `);
  assert.equal(samples.length, 3);
  assert.equal(samples.filter((item) => item.context === "").length, 2);
  assert.equal(samples.filter((item) => item.context.includes("@media")).length, 1);
});

test("029: source scan has no byte-identical files or repeated selector scopes", () => {
  const report = inspectCodeCss();
  assert.ok(report.sourceFiles >= 400);
  assert.ok(report.cssFiles >= 100);
  assert.deepEqual(report.identicalFiles, []);
  assert.deepEqual(report.repeatedSelectors, []);
});

test("029: removing CSS duplication keeps the global mobile min-width rule", () => {
  const reset = readFileSync(new URL("../src/styles/reset.css", import.meta.url), "utf8");
  const global = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
  assert.doesNotMatch(reset, /\bbody\s*\{\s*min-width/);
  assert.match(global, /\bbody\s*\{\s*min-width:\s*320px/);
});
