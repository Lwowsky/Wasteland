import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { executeImportTransaction } from "./importTransaction.js";
import { prepareCreateRegistrationStatements, prepareUpdateRegistrationStatements } from "../../db/registrationWrites.js";

// Real SQLite integration tests for the exact SQL sent to Cloudflare D1.
// The D1-compatible batch below reproduces D1's rollback-on-error guarantee.
function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE registration_periods (
      id INTEGER PRIMARY KEY, status TEXT NOT NULL DEFAULT 'open',
      closes_at TEXT, updated_at TEXT
    );
    CREATE TABLE registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_id INTEGER NOT NULL,
      nickname TEXT,
      nickname_normalized TEXT,
      alliance TEXT,
      troop_type TEXT,
      tier TEXT,
      lair_level INTEGER,
      march_size INTEGER,
      rally_size INTEGER,
      ready_attack INTEGER,
      captain INTEGER,
      shift TEXT,
      extra_fighter_enabled INTEGER,
      extra_fighter_tier TEXT,
      extra_rider_enabled INTEGER,
      extra_rider_tier TEXT,
      extra_shooter_enabled INTEGER,
      extra_shooter_tier TEXT,
      comment TEXT,
      custom_fields_json TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (period_id) REFERENCES registration_periods(id),
      UNIQUE(period_id, nickname_normalized)
    );
    CREATE TABLE public_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER NOT NULL UNIQUE,
      period_id INTEGER NOT NULL,
      nickname TEXT,
      alliance TEXT,
      troop_type TEXT,
      tier TEXT,
      lair_level INTEGER,
      march_size INTEGER,
      rally_size INTEGER,
      ready_attack INTEGER,
      captain INTEGER,
      shift TEXT,
      extra_fighter_enabled INTEGER,
      extra_fighter_tier TEXT,
      extra_rider_enabled INTEGER,
      extra_rider_tier TEXT,
      extra_shooter_enabled INTEGER,
      extra_shooter_tier TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (registration_id) REFERENCES registrations(id)
    );
    CREATE TABLE stats (
      period_id INTEGER PRIMARY KEY,
      registered INTEGER NOT NULL DEFAULT 0,
      fighters INTEGER NOT NULL DEFAULT 0,
      riders INTEGER NOT NULL DEFAULT 0,
      shooters INTEGER NOT NULL DEFAULT 0,
      captains INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE turret_plan_publications (period_id INTEGER PRIMARY KEY);
    CREATE TABLE turret_plan_drafts (period_id INTEGER PRIMARY KEY);
    INSERT INTO registration_periods (id, status) VALUES (1, 'open');
    INSERT INTO registrations (period_id, nickname, nickname_normalized, alliance, troop_type, tier, shift, captain)
      VALUES (1, 'Old', 'old', 'MIR', 'fighter', 'T10', 'shift1', 1);
    INSERT INTO public_players (registration_id, period_id, nickname, alliance, troop_type, tier, shift, captain)
      SELECT id, period_id, nickname, alliance, troop_type, tier, shift, captain FROM registrations;
    INSERT INTO stats (period_id, registered, fighters, captains) VALUES (1, 1, 1, 1);
    INSERT INTO turret_plan_publications (period_id) VALUES (1);
    INSERT INTO turret_plan_drafts (period_id) VALUES (1);
  `);

  const env = {
    DB: {
      prepare(sql) {
        const stmt = db.prepare(sql);
        return {
          bind(...args) {
            return {
              run() { const res = stmt.run(...args); return { meta: { changes: Number(res.changes) } }; },
              first() { return stmt.get(...args); },
              all() { return { results: stmt.all(...args) }; },
            };
          },
        };
      },
      async batch(statements) {
        db.exec("BEGIN IMMEDIATE");
        try {
          const results = statements.map((statement) => statement.run());
          db.exec("COMMIT");
          return results;
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      },
    },
  };
  const snapshot = () => ({
    players: db.prepare("SELECT nickname FROM registrations ORDER BY id").all().map((r) => r.nickname),
    public: db.prepare("SELECT nickname FROM public_players ORDER BY registration_id").all().map((r) => r.nickname),
    stats: { ...db.prepare("SELECT registered, fighters, captains FROM stats WHERE period_id=1").get() },
    published: db.prepare("SELECT COUNT(*) AS n FROM turret_plan_publications").get().n,
    drafts: db.prepare("SELECT COUNT(*) AS n FROM turret_plan_drafts").get().n,
    status: { ...db.prepare("SELECT status, closes_at FROM registration_periods WHERE id=1").get() },
  });
  return { db, env, snapshot };
}

function player(nickname, troopType = "fighter") {
  return {
    nickname, alliance: "MIR", troopType, tier: "T12", shift: "shift1",
    lairLevel: 12, marchSize: 100, rallySize: 0,
    readyAttack: true, captain: false,
    extraSquads: {}, comment: "", customFields: { tag: "test" },
  };
}

test("028B: add missing in one transaction, leaving old players and plans", async () => {
  const { db, env, snapshot } = setup();
  try {
    const result = await executeImportTransaction(env, 1, [player("Old"), player("New", "rider")], "skipExisting");
    assert.deepEqual(result, { imported: 1, skipped: 1 });
    const state = snapshot();
    assert.deepEqual(state.players, ["Old", "New"]);
    assert.deepEqual(state.public, ["Old", "New"]);
    assert.deepEqual(state.stats, { registered: 2, fighters: 1, captains: 1 });
    assert.equal(state.published, 1);
    assert.equal(state.drafts, 1);
    assert.equal(state.status.status, "open");
  } finally { db.close(); }
});

test("028B: replacement swaps player tables, invalidates stale turret plans and recalculates stats", async () => {
  const { db, env, snapshot } = setup();
  try {
    const result = await executeImportTransaction(env, 1, [player("Alpha", "rider"), player("Beta", "shooter")], "replacePeriod");
    assert.deepEqual(result, { imported: 2, skipped: 0 });
    const state = snapshot();
    assert.deepEqual(state.players, ["Alpha", "Beta"]);
    assert.deepEqual(state.public, ["Alpha", "Beta"]);
    assert.deepEqual(state.stats, { registered: 2, fighters: 0, captains: 0 });
    assert.equal(state.published, 0);
    assert.equal(state.drafts, 0);
    assert.equal(state.status.status, "open");
  } finally { db.close(); }
});

test("028B: failed public mirror insert rolls back old players, plans and stats", async () => {
  const { db, env, snapshot } = setup();
  try {
    const before = snapshot();
    db.exec(`CREATE TRIGGER reject_new BEFORE INSERT ON public_players
      WHEN NEW.nickname = 'New'
      BEGIN SELECT RAISE(ABORT, 'simulated D1 failure'); END;`);
    await assert.rejects(
      executeImportTransaction(env, 1, [player("New")], "replacePeriodAndClose"),
      /simulated D1 failure/,
    );
    assert.deepEqual(snapshot(), before);
  } finally { db.close(); }
});

test("028B: replacement and close commits both actions together", async () => {
  const { db, env, snapshot } = setup();
  try {
    const now = new Date("2026-10-12T01:02:03.000Z");
    const result = await executeImportTransaction(env, 1, [player("New")], "replacePeriodAndClose", now);
    assert.deepEqual(result, { imported: 1, skipped: 0 });
    assert.deepEqual(snapshot().players, ["New"]);
    assert.equal(snapshot().status.closes_at, now.toISOString());
    assert.equal(snapshot().status.status, "closed");
  } finally { db.close(); }
});

test("028B: failed insert (constraint) rolls back the replacement and its deletions", async () => {
  const { db, env, snapshot } = setup();
  try {
    const before = snapshot();
    // Emulates an unexpected race or an invalid duplicate body reaching the DB.
    await assert.rejects(
      executeImportTransaction(env, 1, [player("Same"), player("Same")], "replacePeriod"),
      /UNIQUE constraint failed/,
    );
    assert.deepEqual(snapshot(), before);
  } finally { db.close(); }
});

test("028B: 500 players use one insert and one transaction", async () => {
  const { db, env, snapshot } = setup();
  try {
    const players = Array.from({ length: 500 }, (_, index) => player(`P${index}`));
    const result = await executeImportTransaction(env, 1, players, "replacePeriod");
    assert.equal(result.imported, 500);
    assert.equal(snapshot().players.length, 500);
    assert.equal(snapshot().public.length, 500);
    assert.equal(snapshot().stats.registered, 500);
  } finally { db.close(); }
});

function record(nickname, troopType = "fighter") {
  return {
    nickname,
    nicknameNormalized: nickname?.toLowerCase() ?? null,
    alliance: "MIR", troopType, tier: "T12", shift: "shift1",
    lairLevel: 20, marchSize: 200, rallySize: 0,
    readyAttack: true, captain: false,
    extraSquads: {
      fighter: { enabled: false, tier: null },
      rider: { enabled: false, tier: null },
      shooter: { enabled: false, tier: null },
    },
    comment: "", customFields: {},
  };
}

test("028B: normal creation writes both tables and stats in one batch", async () => {
  const { db, env, snapshot } = setup();
  try {
    const results = await env.DB.batch(prepareCreateRegistrationStatements(env, 1, record("Created")));
    assert.equal(results[0].meta.changes, 1);
    assert.deepEqual(snapshot().players, ["Old", "Created"]);
    assert.deepEqual(snapshot().public, ["Old", "Created"]);
    assert.equal(snapshot().stats.registered, 2);
  } finally { db.close(); }
});

test("028B: normal creation with optional missing nickname still mirrors the correct row", async () => {
  const { db, env, snapshot } = setup();
  try {
    await env.DB.batch(prepareCreateRegistrationStatements(env, 1, record(null)));
    assert.deepEqual(snapshot().players, ["Old", null]);
    assert.deepEqual(snapshot().public, ["Old", null]);
  } finally { db.close(); }
});

test("028B: failed normal creation rolls back the private row", async () => {
  const { db, env, snapshot } = setup();
  try {
    const before = snapshot();
    db.exec(`CREATE TRIGGER reject_normal BEFORE INSERT ON public_players
      WHEN NEW.nickname = 'Created'
      BEGIN SELECT RAISE(ABORT, 'mirror broken'); END;`);
    await assert.rejects(
      env.DB.batch(prepareCreateRegistrationStatements(env, 1, record("Created"))),
      /mirror broken/,
    );
    assert.deepEqual(snapshot(), before);
  } finally { db.close(); }
});

test("028B: failed normal edit rolls back the private edit and statistics", async () => {
  const { db, env, snapshot } = setup();
  try {
    const before = snapshot();
    const id = db.prepare("SELECT id FROM registrations WHERE nickname='Old'").get().id;
    db.exec(`CREATE TRIGGER reject_edit BEFORE UPDATE ON public_players
      WHEN NEW.nickname = 'Edited'
      BEGIN SELECT RAISE(ABORT, 'edit mirror broken'); END;`);
    await assert.rejects(
      env.DB.batch(prepareUpdateRegistrationStatements(env, id, 1, record("Edited", "rider"))),
      /edit mirror broken/,
    );
    assert.deepEqual(snapshot(), before);
  } finally { db.close(); }
});

test("028B: successful edit updates private, public and stats together", async () => {
  const { db, env, snapshot } = setup();
  try {
    const id = db.prepare("SELECT id FROM registrations WHERE nickname='Old'").get().id;
    await env.DB.batch(prepareUpdateRegistrationStatements(env, id, 1, record("Edited", "shooter")));
    const state = snapshot();
    assert.deepEqual(state.players, ["Edited"]);
    assert.deepEqual(state.public, ["Edited"]);
    assert.equal(state.stats.fighters, 0);
    assert.equal(state.stats.registered, 1);
  } finally { db.close(); }
});
