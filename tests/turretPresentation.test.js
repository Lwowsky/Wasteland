import test from "node:test";
import assert from "node:assert/strict";
import { formatMarch } from "../src/utils/formatMarch.js";
import { formatMediumDateTime } from "../src/utils/date.js";
import uk from "../src/i18n/locales/uk/admin/distribution.json" with { type: "json" };
import en from "../src/i18n/locales/en/admin/distribution.json" with { type: "json" };

test("march formatter supports both site languages and missing data", () => {
  assert.equal(formatMarch(1234567, "en"), "1,234,567");
  assert.equal(formatMarch(0), "0");
  assert.equal(formatMarch(null), "—");
  assert.equal(formatMarch(""), "—");
  assert.equal(formatMarch("not a number"), "—");
  assert.equal(formatMarch(1234567, "uk"), new Intl.NumberFormat("uk-UA").format(1234567));
});

test("publication timestamp displays as a readable locale-specific date", () => {
  for (const language of ["uk", "en"]) {
    const result = formatMediumDateTime("2026-10-10T00:00:00.000Z", language, "UTC");
    assert.ok(result.includes("2026"));
    assert.ok(!result.includes("T00:00:00"));
  }
});

test("tier limit zero has matching localized instructions", () => {
  assert.match(uk.limits.tierZeroHint, /0/);
  assert.match(en.limits.tierZeroHint, /0/);
  assert.ok(uk.limits.tierZeroHint.length > 12);
  assert.ok(en.limits.tierZeroHint.length > 12);
});
