import test from "node:test";
import assert from "node:assert/strict";
import {
  addHelper, changeCaptain, createEmptyAssignments, normalizeAssignments,
  removeAssignedPlayer,
} from "../src/features/turrets/turretAssignments.js";
import { normalizePlannerSettings } from "../src/features/turrets/plannerSettings.js";
import { validateTurretDraft, PlanError } from "../worker/src/turrets/validate.js";
import { getRegistrationCycleSchedule } from "../shared/registrationCycle.js";
import { DEFAULT_REGISTRATION_CYCLE_SETTINGS } from "../shared/registrationConfig.js";
import { getRegistrationCycleKey } from "../worker/src/services/registrationCycle.js";
import { ensureCurrentRegistrationPeriod, startFreshRegistrationCycle } from "../worker/src/db/periods.js";

const roster = [
  { id: "1", nickname: "A", alliance: "YYY", shift: "shift1", captain: true, troopType: "fighter", tier: "T12", marchSize: 260, rallySize: 800 },
  { id: "2", nickname: "B", alliance: "YYY", shift: "shift1", captain: false, troopType: "fighter", tier: "T11", marchSize: 100, rallySize: 0 },
  { id: "3", nickname: "C", alliance: "YYY", shift: "shift2", captain: true, troopType: "fighter", tier: "T12", marchSize: 260, rallySize: 800 },
];
const settings = normalizePlannerSettings(null);

test("Stage 2H: one captain may serve two shifts and persists through normalization/D1 validation", () => {
  const first = changeCaptain(createEmptyAssignments(), "shift1", "hub", "1", roster, settings).assignments;
  const second = changeCaptain(first, "shift2", "north", "1", roster, settings).assignments;
  assert.ok(second);
  const normalized = normalizeAssignments(second, roster);
  assert.equal(normalized.shifts.shift1.hub.captainId, "1");
  assert.equal(normalized.shifts.shift2.north.captainId, "1");
  assert.equal(validateTurretDraft(settings, normalized, roster).count, 1);
  assert.equal(changeCaptain(second, "shift2", "west", "1", roster, settings).error, "unavailable");
});

test("Stage 2H: helper's cross-shift reuse requires manual action; duplicate same-shift rejected", () => {
  const disabledShift = { ...settings, respectShift: false };
  let state = changeCaptain(createEmptyAssignments(), "shift1", "hub", "1", roster, disabledShift).assignments;
  state = changeCaptain(state, "shift2", "north", "3", roster, disabledShift).assignments;
  state = addHelper(state, "shift1", "hub", "2", roster, disabledShift).assignments;
  assert.equal(state.shifts.shift2.north.helperIds.length, 0);
  state = addHelper(state, "shift2", "north", "2", roster, disabledShift).assignments;
  assert.ok(state);
  assert.equal(addHelper(state, "shift2", "north", "2", roster, disabledShift).error, "unavailable");
  assert.equal(validateTurretDraft(disabledShift, state, roster).count, 3);
  const removed = removeAssignedPlayer(state, "2");
  assert.deepEqual(removed.assignments.shifts.shift1.hub.helperIds, []);
  assert.deepEqual(removed.assignments.shifts.shift2.north.helperIds, []);
});

test("Stage 2H: a captain cannot simultaneously serve as a helper in another shift", () => {
  const relaxed = { ...settings, respectShift: false };
  let state = changeCaptain(createEmptyAssignments(), "shift1", "hub", "1", roster, relaxed).assignments;
  state = changeCaptain(state, "shift2", "north", "3", roster, relaxed).assignments;
  assert.equal(addHelper(state, "shift2", "north", "1", roster, relaxed).error, "unavailable");
  state.shifts.shift2.north.helperIds = ["1"];
  state.shifts.shift2.north.helperMarches = { "1": 100 };
  assert.throws(() => validateTurretDraft(relaxed, state, roster), PlanError);
});

function createCycleDb() {
  const state = { periods: [], resets: new Map(), next: 1, log: [] };
  function statement(sql, params = []) {
    return {
      bind(...args) { return statement(sql, args); },
      async first() {
        state.log.push({ sql, params, kind: "first" });
        if (sql.includes("registration_cycle_resets")) return state.resets.has(params[0]) ? { cycleKey: state.resets.get(params[0]) } : null;
        if (sql.includes("MAX(cycle_number)")) return { nextCycleNumber: state.next };
        if (sql.includes("FROM registration_periods") && sql.includes("cycle_key = ?")) return state.periods.find((p) => p.cycle_key === params[0]) || null;
        return null;
      },
      async run() { state.log.push({ sql, params, kind: "run" }); return { meta: { changes: 1 } }; },
    };
  }
  const DB = {
    prepare(sql) { return statement(sql.replace(/\s+/g, " ").trim()); },
    async batch(statements) {
      for (const query of statements) {
        const { sql, params } = await describe(query);
        if (sql.startsWith("INSERT INTO registration_periods")) {
          state.periods.push({
            id: state.next, cycle_number: state.next++, cycle_key: params[1],
            status: "open", opens_at: params[3], closes_at: params[4],
            wasteland_start_at: params[5], wasteland_end_at: params[6],
            rules_snapshot_json: params[7],
          });
        } else if (sql.startsWith("INSERT INTO registration_cycle_resets")) state.resets.set(params[0], params[1]);
        else if (sql.startsWith("UPDATE registration_periods")) state.periods.forEach((period) => { period.status = "closed"; });
      }
      return [];
    },
  };
  // Queries supplied through .bind() intentionally do not expose internals;
  // mock .batch() uses the intercepted bind results instead.
  async function describe(query) { return { sql: query.sql, params: query.params }; }
  DB.prepare = (raw) => {
    const sql = raw.replace(/\s+/g, " ").trim();
    const make = (params = []) => ({
      sql, params, bind(...values) { return make(values); },
      first: () => statement(sql, params).first(),
      run: () => statement(sql, params).run(),
    });
    return make();
  };
  return { DB, state };
}

test("Stage 2I: explicit new cycle gets a new identity without deleting prior registrations", async () => {
  const env = createCycleDb();
  const clock = Date.parse("2026-10-10T12:00:00Z");
  const schedule = getRegistrationCycleSchedule(DEFAULT_REGISTRATION_CYCLE_SETTINGS, clock);
  const key = getRegistrationCycleKey(DEFAULT_REGISTRATION_CYCLE_SETTINGS, schedule);
  env.state.periods.push({ id: 10, cycle_number: 10, cycle_key: key, status: "open",
    opens_at: schedule.opensAt, closes_at: schedule.closesAt,
    wasteland_start_at: schedule.eventStartAt, wasteland_end_at: schedule.eventEndAt,
    rules_snapshot_json: '{"initialized":true}' });
  env.state.next = 11;
  const fresh = await startFreshRegistrationCycle(env, DEFAULT_REGISTRATION_CYCLE_SETTINGS, clock);
  assert.equal(fresh.id, 11);
  assert.equal(env.state.periods.length, 2);
  assert.equal(env.state.periods[0].status, "closed");
  assert.equal(env.state.resets.get(key), fresh.cycle_key);
  const resolved = await ensureCurrentRegistrationPeriod(env, DEFAULT_REGISTRATION_CYCLE_SETTINGS, clock);
  assert.equal(resolved.period.id, 11);
  await assert.rejects(
    () => startFreshRegistrationCycle(env, DEFAULT_REGISTRATION_CYCLE_SETTINGS, Date.parse(schedule.eventStartAt)),
    /CYCLE_WINDOW_CLOSED/,
  );
});
