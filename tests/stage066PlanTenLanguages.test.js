import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PLAN_LANGUAGE_CHOICES, normalizePlanLanguages, getPlanBoardTranslations, getPlanShiftHeading,
} from "../src/pages/FinalPlan/data/finalPlanLanguages.js";
import { PLAN_LANGUAGE_CODES, defaultPlanLanguagesForLocale } from "../src/features/turrets/planLanguages.js";
import { formatFinalPlanTxt } from "../src/pages/FinalPlan/services/finalPlanText.js";
import { createPublicPlan } from "../worker/src/turrets/validate.js";
import { createEmptyAssignments } from "../src/features/turrets/turretAssignments.js";

const codes = ["uk", "en", "ru", "pl", "de", "ja", "zh", "ko", "vi", "ar"];
test("066: browser and Worker allow the same ten plan language codes", () => {
  assert.deepEqual(PLAN_LANGUAGE_CODES, codes);
  assert.deepEqual(PLAN_LANGUAGE_CHOICES.map((choice) => choice.code), codes);
  assert.deepEqual(normalizePlanLanguages([...codes, "untrusted"]), codes);
  assert.deepEqual(normalizePlanLanguages(["ar"]), ["en", "ar"]);
  assert.deepEqual(defaultPlanLanguagesForLocale("ko-KR"), ["en", "ko"]);
  assert.deepEqual(defaultPlanLanguagesForLocale("ar-SA"), ["en", "ar"]);
});

test("066: all ten dictionaries resolve shift/tower/troop texts in public and admin plan", () => {
  const board = getPlanBoardTranslations({ finalPlan: {} }, codes, "uk").finalPlan;
  for (const code of codes) {
    const one = getPlanBoardTranslations({ finalPlan: {} }, [code], code).finalPlan;
    assert.ok(one.towers.hub.length > 0, `hub ${code}`);
    assert.ok(one.troops.fighter.length > 0, `fighter ${code}`);
    assert.ok(one.troops.shooter.length > 0, `shooter ${code}`);
    assert.ok(one.troops.rider.length > 0, `rider ${code}`);
    assert.ok(getPlanShiftHeading("shift1", [code]));
    assert.ok(board.towers.hub.includes(one.towers.hub.split(" ✦ ").at(-1)), `board contains ${code}`);
  }
  assert.match(board.towers.hub, /المركز التقني/);
  assert.match(board.troops.shooter, /射手/);
  assert.match(board.troops.fighter, /전사/);
});

test("066: public snapshots preserve selected languages, TXT includes translated troops", () => {
  const snapshot = createPublicPlan(createEmptyAssignments(), [], ["shift1"], ["ar", "ja", "ko"]);
  assert.deepEqual(snapshot.__languages, ["en", "ja", "ko", "ar"]);
  const plan = { shift1: { hub: { troopType: "fighter", players: [], captain: null } } };
  const output = formatFinalPlanTxt({ planByShift: plan, shifts: ["shift1"],
    selectedLanguages: ["zh", "ar"], t: { finalPlan: {} }, locale: "ar" });
  assert.match(output, /المركز التقني/);
  assert.match(output, /技术中心/);
  assert.match(output, /مقاتلون/);
  assert.match(output, /战士/);
});
