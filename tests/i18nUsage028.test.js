import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  flattenCatalog,
  inspectTranslationUsage,
  createTranslationUsageReport,
} from "../scripts/audit-i18n-usage.mjs";
import { runTranslationAudit } from "../scripts/audit-translations.mjs";

const LOCALES = ["uk", "en"];
const OBSOLETE = {
  "admin/access.json": ["requestsCount", "actions.openRequests", "errors.changeRole", "errors.changeStatus"],
  "admin/distribution.json": ["localNote"],
  "admin/players.json": ["stats.flexiblePlayers"],
  "admin/registration.json": ["savedSection"],
  "admin/settings.json": ["export.excelText", "export.optionsTitle"],
  "content/finalPlan.json": ["formats.png", "formats.txt", "textExport.captain"],
};

function loadLocale(language, name) {
  return JSON.parse(fs.readFileSync(path.join("src", "i18n", "locales", language, name), "utf8"));
}

function findKey(data, fullKey) {
  return fullKey.split(".").reduce((node, key) => node?.[key], data);
}

test("028: catalog scanner enumerates nested leaves without altering the catalog", () => {
  const source = { heading: "Hello", nested: { save: "Save", reset: "Reset" } };
  assert.deepEqual(flattenCatalog(source).map(({ key }) => key),
    ["heading", "nested.save", "nested.reset"]);
  assert.equal(source.nested.save, "Save");
});

test("028: generated shift labels are protected from false unused-key deletion", () => {
  const source = {
    limits: { addShift1: "First", appliedShift2: "Second", capShift4: "Fourth", obsolete: "Old" },
  };
  // Mimics computed keys like t[`add${capitalizedShift}`].
  const usage = inspectTranslationUsage(source, "const value = t[`add${suffix}`];", "admin/distribution.json");
  assert.deepEqual(usage.dynamic.sort(),
    ["limits.addShift1", "limits.appliedShift2", "limits.capShift4"].sort());
  assert.deepEqual(usage.candidates, ["limits.obsolete"]);
});

test("028: obsolete keys were removed symmetrically from UA and EN JSON", () => {
  for (const language of LOCALES) {
    for (const [file, keys] of Object.entries(OBSOLETE)) {
      const catalog = loadLocale(language, file);
      for (const key of keys) {
        assert.equal(findKey(catalog, key), undefined, `${language}/${file}: ${key}`);
      }
    }
  }
  assert.deepEqual(runTranslationAudit(), []);
});

test("028: static audit distinguishes possible candidates from dynamic shift translations", () => {
  const report = createTranslationUsageReport();
  assert.ok(report.totalKeys > 1000);
  assert.ok(report.entries.some((item) => item.category === "dynamic-protected" &&
    item.key === "limits.addShift4"));
  assert.ok(!report.entries.some((item) => item.category === "review" &&
    item.key === "limits.capShift3"));
  for (const [file, keys] of Object.entries(OBSOLETE)) {
    for (const key of keys) {
      assert.ok(!report.entries.some((item) => item.file === file && item.key === key));
    }
  }
});
