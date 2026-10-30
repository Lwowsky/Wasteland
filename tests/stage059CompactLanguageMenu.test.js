import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LANGUAGES, SUPPORTED_LANGUAGES } from "../src/config/site.js";

const source = (filename) => readFileSync(new URL(`../${filename}`, import.meta.url), "utf8");

test("059 menu: every active locale uses native language names consistently", () => {
  for (const locale of SUPPORTED_LANGUAGES) {
    const copy = JSON.parse(source(`src/i18n/locales/${locale}/ui/header.json`));
    for (const code of SUPPORTED_LANGUAGES) {
      assert.equal(copy.languageOptions[code].label, LANGUAGES[code].nativeLabel);
    }
  }
});

test("059 menu: one compact collapsed selector reveals a two-column native-name grid", () => {
  const jsx = source("src/components/BurgerMenu/BurgerMenu.jsx");
  const css = source("src/components/BurgerMenu/BurgerMenu.css");
  assert.match(jsx, /<details className="burger-menu__language-picker">/);
  assert.match(jsx, /<summary className="burger-menu__language-current">/);
  assert.match(jsx, /LANGUAGES\[language\]\?\.nativeLabel/);
  assert.match(jsx, /LANGUAGES\[languageCode\]\?\.nativeLabel/);
  assert.doesNotMatch(jsx, /option\.description/);
  assert.match(jsx, /SUPPORTED_LANGUAGES\.map/);
  assert.match(jsx, /aria-pressed=\{active\}/);
  assert.match(jsx, /getClientRects\(\)\.length > 0/);
  assert.match(css, /\.burger-menu__language-list\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.burger-menu__language-current\s*\{[^}]*min-height:\s*48px/s);
});
