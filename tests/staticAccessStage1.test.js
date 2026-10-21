import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("static access hint fails closed rather than falling back to Worker", () => {
  const code = read("src/features/contentAccess/contentAccessApi.js");
  assert.match(code, /reason: "SNAPSHOT_UNAVAILABLE"/);
});

test("public final plan never falls back to Worker after snapshot error", () => {
  const code = read("src/pages/FinalPlan/services/finalPlanApi.js");
  assert.doesNotMatch(code, /Static host unavailable: use the authenticated API/);
  assert.match(code, /throw new Error\("SNAPSHOT_UNAVAILABLE"\)/);
});

test("admin cannot select or generate new password codes", () => {
  const code = read("src/pages/Admin/settings/ContentAccessEditor.jsx");
  assert.doesNotMatch(code, /<option value="code"/);
  assert.doesNotMatch(code, /generateCode|draft.mode === "code"/);
  assert.match(code, /<option value="public">/);
  assert.match(code, /<option value="private">/);
  assert.match(code, /draft.mode === "link" && \(/);
});
