import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { REGISTRATION_FIELD_ICONS, TEMPLATE_ASSETS } from "../src/features/playerTemplates/templateAssets.js";

const file = (name) => readFileSync(resolve(name), "utf8");

test("034.2: template select, apply and save share one responsive toolbar", () => {
  const selector = file("src/features/playerTemplates/PlayerTemplateSelector.jsx");
  const section = file("src/pages/Registration/RegistrationSection.jsx");
  const css = file("src/features/playerTemplates/PlayerTemplateSelector.css");
  assert.match(selector, /registration-template__controls/);
  assert.match(selector, /registration-template__choice/);
  assert.match(selector, /registration-template__apply/);
  assert.match(selector, /registration-template__save/);
  assert.match(selector, /onClick=\{saveTemplate\}/);
  assert.match(section, /onSave=\{saveCurrentAsTemplate\}/);
  assert.match(section, /canSave=\{Boolean\(registrationData\.nickname\.trim\(\)\)\}/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) auto auto;/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.doesNotMatch(section, /registration-template-save__button/);
});

test("034.2: new saved template is immediately available without reloading", () => {
  const selector = file("src/features/playerTemplates/PlayerTemplateSelector.jsx");
  assert.match(selector, /\[templates, setTemplates\] = useState/);
  assert.match(selector, /onSave\(\);\s*setTemplates\(getPlayerTemplates\(\)\)/);
  assert.match(selector, /templates\.length > 0/);
});

test("034.2: registration field icons reuse existing artwork", () => {
  const player = file("src/features/registration/components/PlayerSection.jsx");
  const comment = file("src/pages/Registration/CommentSection.jsx");
  const css = file("src/features/registration/components/PlayerSection.css");
  for (const [name, path] of Object.entries(REGISTRATION_FIELD_ICONS)) {
    assert.ok(existsSync(resolve(`public${path}`)), `Missing ${name}: ${path}`);
  }
  for (const name of ["nickname", "alliance", "troopType", "tier", "lairLevel", "marchSize", "rallySize"]) {
    assert.match(player, new RegExp(`name="${name}"`));
  }
  assert.match(comment, /REGISTRATION_FIELD_ICONS\.comment/);
  for (const name of ["fighter", "rider", "shooter"]) {
    assert.ok(existsSync(resolve(`public${TEMPLATE_ASSETS[name]}`)));
  }
  assert.match(player, /<FieldIcon name="troopType" \/>/);
  assert.match(css, /\.form-field__icon/);
  const custom = file("src/pages/Registration/CustomFieldsSection.jsx");
  assert.match(custom, /registration-settings\/registration-fields-icon\.webp/);
});

test("034.2: public form no longer depends on lucide icons for troop, lair and comment", () => {
  const player = file("src/features/registration/components/PlayerSection.jsx");
  const comment = file("src/pages/Registration/CommentSection.jsx");
  assert.doesNotMatch(player, /<FlaskConical|<Swords|lucide-react/);
  assert.doesNotMatch(comment, /<MessageSquare|lucide-react/);
});

test("034.2: orphaned save-strip stylesheet can be deleted", () => {
  const section = file("src/pages/Registration/RegistrationSection.jsx");
  assert.doesNotMatch(section, /RegistrationTemplate\.css/);
  assert.equal(existsSync(resolve("src/pages/Registration/RegistrationTemplate.css")), false);
});
