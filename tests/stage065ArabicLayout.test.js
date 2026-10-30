import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("065: Arabic keeps HTML RTL semantics but app layout stays LTR", () => {
  const layout = read("src/layouts/MainLayout.jsx");
  assert.match(layout, /document\.documentElement\.dir = language === "ar" \? "rtl" : "ltr"/);
  assert.match(layout, /className="app" dir="ltr"/);
  assert.match(read("src/main.jsx"), /import "\.\/styles\/arabic-ui\.css"/);
});

test("065: Arabic styles isolate translated text instead of flipping UI grids", () => {
  const css = read("src/styles/arabic-ui.css");
  assert.match(css, /:root\[lang="ar"\] :is\(\.app, \.site-modal-backdrop\)/);
  assert.match(css, /direction: ltr/);
  assert.match(css, /:not\(:has\(> \*\)\)/);
  assert.match(css, /unicode-bidi: isolate/);
  assert.match(css, /home-nav-card__content/);
  assert.doesNotMatch(css, /transform:\s*scaleX\(-1\)/);
});

test("065: Arabic controls preserve numeric and identifier reading order", () => {
  const css = read("src/styles/arabic-ui.css");
  assert.match(css, /input\[type="number"\]/);
  assert.match(css, /input\[type="email"\]/);
  assert.match(css, /input\[type="password"\]/);
  assert.match(css, /textarea:not\(\[dir\]\)/);
});

test("065: previously reported ESLint unused import is removed", () => {
  const safetyTest = read("tests/stage058LanguageMenuSafety.test.js");
  assert.match(safetyTest, /import \{ SUPPORTED_LANGUAGES \}/);
  assert.doesNotMatch(safetyTest, /import \{ LANGUAGES,/);
});
