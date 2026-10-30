import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PLAN_LANGUAGE_CHOICES, normalizePlanLanguages, getPlanShiftHeading,
  getPlanBoardTranslations, defaultPlanLanguagesForLocale,
} from "../src/pages/FinalPlan/data/finalPlanLanguages.js";
import { formatFinalPlanTxt } from "../src/pages/FinalPlan/services/finalPlanText.js";
import { normalizePlannerSettings } from "../src/features/turrets/plannerSettings.js";
import { createEmptyAssignments } from "../src/features/turrets/turretAssignments.js";
import { createPublicPlan } from "../worker/src/turrets/validate.js";

const player = (nickname, tier, march) => ({ nickname, tier, marchSize: march, alliance: "ZLO" });
const tower = {
  troopType: "fighter", captain: { ...player("CAPTAIN", "T12", 100), rallySize: 500 },
  players: [player("LOW", "T9", 60), player("HIGH", "T13", 40)],
};

const t = { finalPlan: { title: "Final plan", share: "Share" } };

test("066: ten plan languages are available; EN cannot be disabled", () => {
  assert.equal(PLAN_LANGUAGE_CHOICES.length, 10);
  assert.deepEqual(normalizePlanLanguages(["ja", "ar", "ru", "invalid"]), ["en", "ru", "ja", "ar"]);
  assert.deepEqual(normalizePlanLanguages(["uk", "en"]), ["uk", "en"]);
  assert.deepEqual(normalizePlanLanguages([]), ["en"]);
  assert.deepEqual(defaultPlanLanguagesForLocale("uk"), ["uk", "en"]);
  assert.deepEqual(defaultPlanLanguagesForLocale("en"), ["en"]);
  assert.deepEqual(defaultPlanLanguagesForLocale("ja-JP"), ["en", "ja"]);
  assert.deepEqual(defaultPlanLanguagesForLocale("uk", "ja-JP"), ["uk", "en"]);
  assert.equal(PLAN_LANGUAGE_CHOICES.find((choice) => choice.code === "en").fixed, true);
});

test("066: plan headings use JSON dictionaries for selected languages", () => {
  const multi = getPlanBoardTranslations(t, ["uk", "en", "ja"]);
  assert.match(multi.finalPlan.towers.hub, /Техно-Центр/);
  assert.match(multi.finalPlan.towers.hub, /Tech Hub/);
  assert.match(multi.finalPlan.towers.hub, /テックハブ/);
  assert.match(getPlanShiftHeading("shift2", ["uk", "en", "ja"]), /Зміна 2/);
});

test("024: TXT exports all shifts with complete rosters but no metric lines", () => {
  const text = formatFinalPlanTxt({
    planByShift: { shift1: { hub: tower }, shift2: { north: tower } },
    shifts: ["shift1", "shift2"], selectedLanguages: ["uk", "en", "ja"], t,
  });
  assert.match(text, /Shift 1/);
  assert.match(text, /Shift 2/);
  assert.match(text, /Tech Hub/);
  assert.match(text, /CAPTAIN ✦ ZLO ✦ T12 ✦ 100/);
  assert.match(text, /HIGH ✦ ZLO ✦ T13 ✦ 40/);
  assert.ok(text.indexOf("HIGH ✦ ZLO") < text.indexOf("LOW ✦ ZLO"), "higher tiers first");
  assert.doesNotMatch(text, /🔵|🟢|🟡/);
  assert.doesNotMatch(text, /Captain march|Free rally space|Марш у турелі/);
});

test("024: old published snapshots do not invent missing rally capacity", () => {
  const legacy = { ...tower, captain: player("CAPTAIN", "T12", 100) };
  const text = formatFinalPlanTxt({ planByShift: { shift1: { hub: legacy } },
    shifts: ["shift1"], selectedLanguages: ["uk", "en"], t });
  assert.doesNotMatch(text, /🔵|🟢|🟡/);
  assert.match(text, /CAPTAIN/);
});

test("024: publish snapshot safely includes the administrator's language selection", () => {
  const settings = normalizePlannerSettings({ planLanguages: ["ru", "zh", "invalid"] });
  assert.deepEqual(settings.planLanguages, ["en", "ru", "zh"]);
  const snapshot = createPublicPlan(createEmptyAssignments(), [], ["shift1"], settings.planLanguages);
  assert.deepEqual(snapshot.__languages, ["en", "ru", "zh"]);
  assert.equal("shift2" in snapshot, false);
});


test("032: final-plan board translates towers without unused column headings", () => {
  const uk = getPlanBoardTranslations({ finalPlan: {} }, ["uk", "en"], "uk");
  assert.equal("columns" in uk.finalPlan, false);
  assert.match(uk.finalPlan.towers.hub, /Техно-Центр/);
  assert.match(uk.finalPlan.towers.hub, /Tech Hub/);
  const en = getPlanBoardTranslations({ finalPlan: {} }, ["en"], "en");
  assert.equal("columns" in en.finalPlan, false);
  assert.equal(en.finalPlan.towers.hub, "Tech Hub");
});

test("025: disabling Ukrainian keeps English and removes Ukrainian from all names", () => {
  const normalized = normalizePlanLanguages(["uk", "ja"].filter((code) => code !== "uk"));
  assert.deepEqual(normalized, ["en", "ja"]);
  const heading = getPlanShiftHeading("shift1", normalized);
  assert.match(heading, /Shift 1/);
  assert.doesNotMatch(heading, /Зміна 1/);
});

test("066: selected languages are present in board and TXT exports", () => {
  const board = getPlanBoardTranslations({ finalPlan: {} }, ["uk", "en", "de", "ja"], "en");
  assert.equal("columns" in board.finalPlan, false);
  assert.match(board.finalPlan.towers.hub, /テックハブ/);
  assert.match(board.finalPlan.towers.hub, /Tech-Zentrum/);
  const plain = formatFinalPlanTxt({ planByShift: { shift1: { hub: tower } },
    shifts: ["shift1"], selectedLanguages: ["uk", "en", "de"], t, locale: "en" });
  assert.match(plain, /Tech-Zentrum/);
  assert.doesNotMatch(plain, /🔵|🟢|🟡/);
});
