import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { getPlanBoardTranslations } from "../src/pages/FinalPlan/data/finalPlanLanguages.js";
import { formatFinalPlanTxt } from "../src/pages/FinalPlan/services/finalPlanText.js";
import en from "../src/i18n/locales/en/content/finalPlan.json" with { type: "json" };
import uk from "../src/i18n/locales/uk/content/finalPlan.json" with { type: "json" };

const read = (file) => readFileSync(new URL(file, import.meta.url), "utf8");

test("032: all final plans share a heading-free tower: public, admin preview and PNG", () => {
  const board = read("../src/pages/FinalPlan/components/FinalPlanTower.jsx");
  const admin = read("../src/pages/Admin/turrets/FinalPlanAdminPreview.jsx");
  const publicBoard = read("../src/pages/FinalPlan/FinalPlan.jsx");
  assert.doesNotMatch(board, /final-plan-tower__columns|t\.finalPlan\.columns/);
  assert.match(admin, /<FinalPlanBoard/);
  assert.match(publicBoard, /<FinalPlanBoard/);
  const css = [read("../src/pages/FinalPlan/FinalPlan.details.css"),
    read("../src/pages/FinalPlan/FinalPlan.responsive.css")].join("\n");
  assert.doesNotMatch(css, /final-plan-tower__columns/);
});

test("032: column title translations removed from both catalogs and board presenter", () => {
  for (const catalog of [uk, en]) {
    assert.equal(Object.hasOwn(catalog, "columns"), false);
    assert.doesNotMatch(catalog.languageModal.help, /column|колонок/i);
  }
  const translations = getPlanBoardTranslations({ finalPlan: {} }, ["uk", "en"]);
  assert.equal("columns" in translations.finalPlan, false);
});


test("032: TXT retains player data without redundant table column titles", () => {
  const t = { finalPlan: {} };
  const text = formatFinalPlanTxt({ planByShift: { shift1: { hub: {
    captain: { nickname: "CAP", alliance: "TAG", tier: "T14", marchSize: 12345 },
    players: [{ id: "p1", nickname: "HELPER", alliance: "TAG", tier: "T12", marchSize: 6789 }],
  } } }, shifts: ["shift1"], selectedLanguages: ["uk", "en"], t, locale: "en" });
  assert.match(text, /CAP ✦ TAG ✦ T14 ✦/);
  assert.match(text, /HELPER ✦ TAG ✦ T12 ✦/);
  assert.doesNotMatch(text, /\bNick(?:name)?\s*[|✦]\s*Alliance/);
  assert.doesNotMatch(text, /Нік\s*[|✦]\s*Альянс/);
});
