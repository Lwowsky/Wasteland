import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { auditDraftLocales } from "../scripts/audit-stage059-locales.mjs";

const root = path.resolve(import.meta.dirname, "..");

test("059: Russian and Polish active catalogs have all files, keys and placeholders", () => {
  const { errors, summaries } = auditDraftLocales();
  assert.deepEqual(errors, []);
  assert.equal(summaries.ru.total, summaries.pl.total);
  assert.ok(summaries.ru.translated > 1500);
  assert.equal(summaries.ru.pendingCount, 0);
  assert.ok(summaries.pl.translated > 1500);
  assert.equal(summaries.pl.pendingCount, 0);
});

test("059: RU/PL are enabled only with complete imported catalogs", () => {
  const config = fs.readFileSync(path.join(root, "src/config/site.js"), "utf8");
  const index = fs.readFileSync(path.join(root, "src/i18n/index.js"), "utf8");
  const { summaries } = auditDraftLocales();
  for (const lang of ["ru", "pl"]) {
    assert.equal(summaries[lang].pendingCount, 0);
    assert.ok(config.includes(`${lang}: {`), `${lang} must be enabled in site configuration`);
    assert.ok(index.includes(`from "./locales/${lang}/`), `${lang} locale must be imported`);
  }
});
