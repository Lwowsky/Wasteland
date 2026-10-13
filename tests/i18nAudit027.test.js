import assert from "node:assert/strict";
import { test } from "node:test";

import i18nJsxRule, { isRawInterfaceText } from "../scripts/i18n-jsx-rule.mjs";
import {
  compareTranslationStrings,
  translationPlaceholders,
  runTranslationAudit,
} from "../scripts/audit-translations.mjs";
import { getPlanBoardTranslations } from "../src/pages/FinalPlan/data/finalPlanLanguages.js";
import { formatFinalPlanTxt } from "../src/pages/FinalPlan/services/finalPlanText.js";

function checkNode(visitor, node) {
  const reports = [];
  const listeners = i18nJsxRule.create({ report: (record) => reports.push(record) });
  listeners[visitor](node);
  return reports;
}

test("027: display strings must live in JSON, not in JSX elements", () => {
  assert.equal(checkNode("JSXText", { value: " Save changes " }).length, 1);
  assert.equal(checkNode("JSXText", { value: "Зберегти зміни" }).length, 1);
  assert.equal(checkNode("JSXText", { value: " UTC " }).length, 0);
  assert.equal(checkNode("JSXText", { value: " — " }).length, 0);
  assert.equal(checkNode("JSXText", { value: "  T14  " }).length, 0);
  assert.ok(isRawInterfaceText("Something went wrong"));
});

test("027: visible JSX attributes and inline expressions are protected", () => {
  const attribute = (name, value) => ({ name: { name }, value: { type: "Literal", value } });
  assert.equal(checkNode("JSXAttribute", attribute("placeholder", "Search player")).length, 1);
  assert.equal(checkNode("JSXAttribute", attribute("title", "Видалити гравця")).length, 1);
  assert.equal(checkNode("JSXAttribute", attribute("alt", "image")).length, 1);
  assert.equal(checkNode("JSXAttribute", attribute("className", "visual-card")).length, 0);
  assert.equal(checkNode("JSXAttribute", attribute("alt", "")).length, 0);
  const ternary = { expression: {
    type: "ConditionalExpression",
    consequent: { type: "Literal", value: "Ready" },
    alternate: { type: "Literal", value: "Not ready" },
  } };
  assert.equal(checkNode("JSXExpressionContainer", ternary).length, 2);
  const dynamic = { expression: { type: "MemberExpression" } };
  assert.equal(checkNode("JSXExpressionContainer", dynamic).length, 0);
});

test("027: mismatched interpolation tokens break parity checks", () => {
  const en = { notification: { success: "Saved {{name}} as {{role}}" } };
  const uk = { notification: { success: "Збережено {{name}} як {{role}}" } };
  assert.deepEqual(compareTranslationStrings(en, uk, "admin/common.json"), []);
  assert.deepEqual(translationPlaceholders(en.notification.success), ["name", "role"]);
  assert.equal(compareTranslationStrings(en,
    { notification: { success: "Збережено {{name}}" } }, "admin/common.json").length, 1);
});

test("027: the actual UA/EN JSON catalogs and rendered JSX pass static audits", () => {
  assert.deepEqual(runTranslationAudit(), []);
});

test("027: plain-text final plan footer comes from the JSON dictionary", () => {
  const t = { finalPlan: { title: "Final plan" } };
  const localized = getPlanBoardTranslations(t, ["en"], "en");
  assert.equal(localized.finalPlan.textExport.signature, "Developed by Lwowsky");
  const content = formatFinalPlanTxt({
    planByShift: {}, shifts: ["shift1"], selectedLanguages: ["uk", "en"], t, locale: "uk",
  });
  assert.match(content, /Розроблено Lwowsky/);
});
