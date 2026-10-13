import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
let DatabaseSync;
try { ({ DatabaseSync } = await import("node:sqlite")); } catch { /* Optional Node feature. */ }
import { createEmptyAssignments } from "../src/features/turrets/turretAssignments.js";
import { validateTurretDraft, createPublicPlan, PlanError } from "../worker/src/turrets/validate.js";
import { readPlanDraft, readPublishedPlan, upsertDraft, publishDraft } from "../worker/src/turrets/storage.js";

function player(id, extras = {}) {
  return { id, nickname: `Player-${id}`, alliance: "ZLO", tier: "T12",
    troopType: "fighter", shift: "shift1", captain: false,
    marchSize: 100, rallySize: 400, secretEmail: "private@example.org",
    comment: "NOT PUBLIC", customFields: { secret: "NOT PUBLIC" }, ...extras };
}
const roster = [player(1, { captain: true }), player(2), player(3, { troopType: "rider" })];
const settings = { onlyCaptains: true, sameTroopType: true, respectShift: true };
function withCaptain() {
  const plan = createEmptyAssignments();
  plan.shifts.shift1.hub.captainId = "1";
  return plan;
}
function withHelper() {
  const plan = withCaptain();
  plan.shifts.shift1.hub.helperIds = ["2"];
  plan.shifts.shift1.hub.helperMarches = { "2": 80 };
  return plan;
}
function throwsCode(action, code) {
  assert.throws(action, (e) => e instanceof PlanError && e.message === code);
}

test("turret server: accepts a valid plan and canonicalizes settings", () => {
  const validated = validateTurretDraft(settings, withHelper(), roster);
  assert.equal(validated.count, 2);
  assert.equal(validated.assignments.shifts.shift1.hub.helperMarches["2"], 80);
  assert.equal(validated.settings.mode, "balanced");
});
test("turret server: duplicate player cannot occupy multiple turret slots", () => {
  const draft = withHelper();
  draft.shifts.shift2.north.captainId = "2";
  throwsCode(() => validateTurretDraft(settings, draft, roster), "INVALID_TURRET_CAPTAIN");
});
test("turret server: rejects stale and unregistered player ids", () => {
  const draft = withCaptain();
  draft.shifts.shift1.hub.helperIds = ["999"];
  draft.shifts.shift1.hub.helperMarches = { "999": 20 };
  throwsCode(() => validateTurretDraft(settings, draft, roster), "INVALID_TURRET_HELPER");
});
test("turret server: rejects troop and shift mismatches", () => {
  const draft = withCaptain();
  draft.shifts.shift1.hub.helperIds = ["3"];
  draft.shifts.shift1.hub.helperMarches = { "3": 80 };
  throwsCode(() => validateTurretDraft(settings, draft, roster), "INVALID_TURRET_HELPER");
  draft.shifts.shift1.hub.captainId = null;
  throwsCode(() => validateTurretDraft(settings, draft, roster), "TURRET_CAPACITY_EXCEEDED");
});
test("turret server: rejects capacity overflow, invalid marches and helper count", () => {
  const draft = withHelper();
  draft.shifts.shift1.hub.helperMarches["2"] = 9999;
  throwsCode(() => validateTurretDraft(settings, draft, roster), "INVALID_TURRET_HELPER");
  draft.shifts.shift1.hub.helperMarches["2"] = 80;
  const tiny = [player(1, { captain: true, rallySize: 70 }), player(2)];
  throwsCode(() => validateTurretDraft(settings, draft, tiny), "TURRET_CAPACITY_EXCEEDED");
});
test("turret server: permits empty drafts and captain alone", () => {
  assert.equal(validateTurretDraft(settings, createEmptyAssignments(), roster).count, 0);
  assert.equal(validateTurretDraft(settings, withCaptain(), roster).count, 1);
});
test("turret server: rejects unrecognized shifts and invalid draft versions", () => {
  const draft = withCaptain();
  draft.shifts.shift3 = {};
  throwsCode(() => validateTurretDraft(settings, draft, roster), "INVALID_TURRET_DRAFT");
  draft.version = 15;
  throwsCode(() => validateTurretDraft(settings, draft, roster), "INVALID_TURRET_DRAFT");
});
test("turret server: publication snapshot leaks no private registration fields", () => {
  const publicPlan = createPublicPlan(withHelper(), roster);
  assert.equal(publicPlan.shift1.hub.captain.nickname, "Player-1");
  assert.equal(publicPlan.shift1.hub.players[0].marchSize, 80);
  const text = JSON.stringify(publicPlan);
  for (const secret of ["secretEmail", "private@example.org", "customFields", "NOT PUBLIC", "comment"]) {
    assert.equal(text.includes(secret), false, secret);
  }
});

function createTestDb() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON; CREATE TABLE registration_periods(id INTEGER PRIMARY KEY);");
  sqlite.exec("INSERT INTO registration_periods(id) VALUES (1);");
  sqlite.exec(readFileSync(new URL("../worker/migrations/0010_turret_plans.sql", import.meta.url), "utf8"));
  const db = { prepare(sql) {
    const statement = sqlite.prepare(sql);
    return { bind(...values) {
      return { first: async () => statement.get(...values) || null,
        all: async () => ({ results: statement.all(...values) }),
        run: async () => ({ meta: { changes: statement.run(...values).changes } }) };
    } };
  } };
  return { DB: db, sqlite };
}

test("turret D1: revision guard protects against overwriting another admin's draft", { skip: !DatabaseSync }, async () => {
  const env = createTestDb();
  const valid = validateTurretDraft(settings, withHelper(), roster);
  assert.equal((await upsertDraft(env, 1, 0, valid, "owner")).revision, 1);
  assert.equal((await upsertDraft(env, 1, 1, valid, "admin")).revision, 2);
  await assert.rejects(upsertDraft(env, 1, 1, valid, "other"),
    (e) => e.message === "TURRET_DRAFT_CONFLICT" && e.status === 409);
  const draft = await readPlanDraft(env, 1);
  assert.equal(draft.revision, 2);
  assert.equal(draft.assignments.shifts.shift1.hub.captainId, "1");
  env.sqlite.close();
});

test("turret D1: published snapshot survives draft edits and checks revision", { skip: !DatabaseSync }, async () => {
  const env = createTestDb();
  const valid = validateTurretDraft(settings, withHelper(), roster);
  const draft = await upsertDraft(env, 1, 0, valid, "owner");
  await assert.rejects(publishDraft(env, 1, draft.revision + 1, {
    ...valid, publicPlan: createPublicPlan(valid.assignments, roster),
  }, "owner"), (e) => e.message === "TURRET_DRAFT_CONFLICT");
  const published = await publishDraft(env, 1, draft.revision, {
    ...valid, publicPlan: createPublicPlan(valid.assignments, roster),
  }, "owner");
  assert.equal(published.revision, 1);
  const edited = validateTurretDraft(settings, createEmptyAssignments(), roster);
  await upsertDraft(env, 1, 1, edited, "admin");
  const publicPlan = await readPublishedPlan(env, 1);
  assert.equal(publicPlan.plan.shift1.hub.players.length, 1);
  assert.equal("assignments" in publicPlan, false);
  assert.equal("settings" in publicPlan, false);
  const privatePlan = await readPublishedPlan(env, 1, true);
  assert.equal(privatePlan.assignments.shifts.shift1.hub.captainId, "1");
  env.sqlite.close();
});

test("turret D1: deleting a registration cycle removes draft and publication", { skip: !DatabaseSync }, async () => {
  const env = createTestDb();
  const valid = validateTurretDraft(settings, withCaptain(), roster);
  await upsertDraft(env, 1, 0, valid, "owner");
  await publishDraft(env, 1, 1, { ...valid, publicPlan: createPublicPlan(valid.assignments, roster) }, "owner");
  env.sqlite.exec("DELETE FROM registration_periods WHERE id=1;");
  assert.equal(await readPlanDraft(env, 1), null);
  assert.equal(await readPublishedPlan(env, 1), null);
  env.sqlite.close();
});
