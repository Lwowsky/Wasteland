import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildTimeZoneOptions } from "../src/pages/Settings/timeZoneOptions.js";
import { applyPlayerTemplateToRegistration } from "../src/pages/Registration/registrationForm.js";
import { SETTINGS_ICONS } from "../src/pages/Settings/settingsIconPaths.js";
import { REGISTRATION_DECORATION_ICONS } from "../src/features/playerTemplates/templateAssets.js";

const file = (name) => readFileSync(resolve(name), "utf8");

test("035: settings timezone list includes local, UTC and many IANA zones", () => {
  const options = buildTimeZoneOptions("Local device time");
  assert.equal(options[0].value, "local");
  assert.equal(options[1].value, "UTC");
  assert.ok(options.length > 20);
  assert.ok(options.some((option) => option.value === "Europe/Kyiv"));
  assert.ok(options.some((option) => option.value === "Asia/Tokyo"));
});

test("035: settings reset button uses the dedicated settings reset icon", () => {
  assert.equal(SETTINGS_ICONS.reset, "/images/admin/icons/settings/data-reset.webp");
  const general = file("src/pages/Settings/components/GeneralSettingsTab.jsx");
  assert.match(general, /SETTINGS_ICONS\.reset/);
});

test("035: applying a template matches alliance tags case-insensitively and keeps a saved custom alliance", () => {
  const base = {
    nickname: "",
    alliance: "",
    troopType: "",
    tier: "",
    lairLevel: "",
    marchSize: "",
    rallySize: "",
    shift: "",
    extraSquads: { fighter: { enabled: false, tier: "T10" }, rider: { enabled: false, tier: "T10" }, shooter: { enabled: false, tier: "T10" } },
  };
  const rules = { availableShifts: { shift1: true } };
  const availableTiers = { T12: true };
  const listed = applyPlayerTemplateToRegistration(base, {
    nickname: "Lwowsky",
    alliance: "yyy",
    troopType: "fighter",
    tier: "T12",
    shift: "shift1",
  }, {
    rules,
    availableTiers,
    alliances: [{ tag: "YYY", name: "YYY" }],
  });
  assert.equal(listed.alliance, "YYY");

  const manual = applyPlayerTemplateToRegistration(base, {
    nickname: "Lwowsky",
    alliance: "abc",
    troopType: "fighter",
    tier: "T12",
    shift: "shift1",
  }, {
    rules,
    availableTiers,
    alliances: [{ tag: "YYY", name: "YYY" }],
  });
  assert.equal(manual.alliance, "ABC");
});

test("035: required markers and invalid fields use original unobtrusive style", () => {
  const player = file("src/features/registration/components/PlayerSection.jsx");
  const comment = file("src/pages/Registration/CommentSection.jsx");
  const css = file("src/pages/Registration/Registration.css");
  assert.match(player, /className="form-field__required"/);
  assert.match(comment, /className="form-field__required"/);
  assert.match(css, /\.form-field__required \{/);
  assert.match(css, /color: #e84662/);
  assert.doesNotMatch(css, /\.registration \.registration-field--invalid::after \{/);
});


test("035.2: custom registration WEBPs exist and required icon appears only in missing-fields feedback", () => {
  assert.ok(existsSync(resolve(`public${REGISTRATION_DECORATION_ICONS.required}`)));
  const player = file("src/features/registration/components/PlayerSection.jsx");
  const comment = file("src/pages/Registration/CommentSection.jsx");
  const feedback = file("src/pages/Registration/RegistrationFeedback.jsx");
  assert.match(player, /aria-hidden="true">\*<\/span>/);
  assert.match(comment, /aria-hidden="true">\*<\/span>/);
  assert.match(feedback, /REGISTRATION_DECORATION_ICONS\.required/);
});
