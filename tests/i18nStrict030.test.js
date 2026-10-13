import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { test } from "node:test";
import { catalogPaths, findUnresolvedTranslationAccesses, auditStaticTranslationAccesses } from "../scripts/audit-i18n-static-access.mjs";
import { createTranslationUsageReport } from "../scripts/audit-i18n-usage.mjs";
import { compareTranslationArrayShapes, runTranslationAudit } from "../scripts/audit-translations.mjs";

const root = process.cwd();
function dict(language, file) {
  return JSON.parse(fs.readFileSync(path.join(root, "src/i18n/locales", language, file), "utf8"));
}

test("030: static paths with missing intermediate levels fail; valid paths and string methods pass", () => {
  const keys = new Set(["admin.access.usersCount", "admin.access.cards.requests.title", "settings.templates.extraSquads"]);
  assert.deepEqual(findUnresolvedTranslationAccesses(
    "t.access.usersCount; t.access.cards.requests.title; t.settings.templates.extraSquads;",
    keys), []);
  const failures = findUnresolvedTranslationAccesses(
    "t.access.cards.usersCount; t.access.cards.requests.pending; t.settings.templates.extraSquadsText;", keys,
  );
  assert.equal(failures.length, 3);
  assert.match(failures[0], /access\.cards\.usersCount/);
  assert.deepEqual(findUnresolvedTranslationAccesses(
    't.settings.templates.extraSquads.replace("x", "y")', keys), []);
});

test("030: source translations for access cards and player templates are connected in both languages", () => {
  for (const language of ["uk", "en"]) {
    const access = dict(language, "admin/access.json");
    const settings = dict(language, "content/settings.json");
    assert.ok(access.usersCount && access.pendingCount);
    assert.ok(settings.templates.extraSquads && settings.templates.extraSquadsText);
    assert.equal(access.cards.usersCount, undefined);
    assert.equal(access.cards.requests.pending, undefined);
  }
  const view = fs.readFileSync(path.join(root, "src/pages/Admin/access/AccessOverviewCards.jsx"), "utf8");
  assert.match(view, /t\.access\.usersCount/);
  assert.match(view, /t\.access\.pendingCount/);
  assert.doesNotMatch(view, /t\.access\.cards\.usersCount/);
});

test("030: the production catalog has no missing static t/copy paths", () => {
  assert.ok(catalogPaths().size > 1000);
  assert.deepEqual(auditStaticTranslationAccesses(), []);
  assert.deepEqual(runTranslationAudit(), []);
});

test("030: unused catalog inventory is empty, computed shift labels remain protected", () => {
  const report = createTranslationUsageReport();
  assert.equal(report.entries.filter((entry) => entry.category === "review").length, 0);
  assert.equal(report.entries.filter((entry) => entry.category === "dynamic-protected").length, 12);
  for (const lang of ["uk", "en"]) {
    const limits = dict(lang, "admin/distribution.json").limits;
    for (const kind of ["addShift", "appliedShift", "capShift"]) {
      for (const number of [1, 2, 3, 4]) {
        assert.equal(typeof limits[kind + number], "string");
      }
    }
  }
});

test("030: weekday arrays must have equal lengths in Ukrainian and English", () => {
  const en = dict("en", "admin/registration.json");
  const uk = dict("uk", "admin/registration.json");
  assert.deepEqual(compareTranslationArrayShapes(en, uk, "admin/registration.json"), []);
  assert.equal(compareTranslationArrayShapes(
    { cycle: { weekdays: ["Monday", "Tuesday"] } },
    { cycle: { weekdays: ["Понеділок"] } }, "example.json",
  ).length, 1);
});
