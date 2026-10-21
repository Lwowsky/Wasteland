import { Buffer } from "node:buffer";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { handleRegionBackupRestore } from "../worker/src/admin/regionBackup.js";
import {
  isValidRegionBackup,
  hasRestorableAccessRequests,
} from "../shared/regionBackupValidation.js";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function validBackup() {
  const tables = [
    "registration_settings",
    "site_settings",
    "registration_periods",
    "turret_plan_drafts",
    "turret_plan_publications",
    "registrations",
    "public_players",
    "stats",
    "alliance_rotation",
    "content_access_settings",
    "content_access_tokens",
  ];
  return {
    format: "wasteland-region-backup",
    version: 1,
    database: "region",
    d1: Object.fromEntries(tables.map((name) => [name, []])),
    firestore: { accessRequests: [] },
  };
}

test("054: complete v1 region backup is valid; older backup without site settings is compatible", () => {
  const backup = validBackup();
  assert.equal(isValidRegionBackup(backup), true);
  delete backup.d1.site_settings;
  assert.equal(isValidRegionBackup(backup), true);
});

test("054: reject incomplete or malformed backups before any destructive DB write", () => {
  const missing = validBackup();
  delete missing.d1.registrations;
  assert.equal(isValidRegionBackup(missing), false);
  const wrongTable = validBackup();
  wrongTable.d1.public_players = { length: 5 };
  assert.equal(isValidRegionBackup(wrongTable), false);
  const wrongRow = validBackup();
  wrongRow.d1.registrations = [null];
  assert.equal(isValidRegionBackup(wrongRow), false);
  const wrongFirestore = validBackup();
  wrongFirestore.firestore.accessRequests = "not-array";
  assert.equal(isValidRegionBackup(wrongFirestore), false);
  const wrongVersion = validBackup();
  wrongVersion.version = 100;
  assert.equal(isValidRegionBackup(wrongVersion), false);
  assert.equal(
    isValidRegionBackup({
      format: "wasteland-region-backup",
      version: 1,
      d1: {},
    }),
    false,
  );
});

test("054: absent Firestore collection never means an empty collection to restore", () => {
  const backup = validBackup();
  assert.equal(hasRestorableAccessRequests(backup), true);
  delete backup.firestore;
  assert.equal(isValidRegionBackup(backup), true);
  assert.equal(hasRestorableAccessRequests(backup), false);
});

test("054: archive excludes credentials from version control; do not zip local development root", () => {
  const ignored = read(".gitignore");
  for (const pattern of [
    ".dev.vars",
    ".env.*",
    ".wrangler/",
    "backup-before-*.sql",
    "dist",
  ]) {
    assert.ok(ignored.includes(pattern), `Missing ignore rule: ${pattern}`);
  }
});

test("054: backup/restore revokes historic link capabilities, legacy codes and publishes new revision", () => {
  const source = read("worker/src/admin/regionBackup.js");
  assert.match(source, /isValidRegionBackup\(body\.backup\)/);
  assert.match(
    source,
    /UPDATE static_share_links[\s\S]+?revoked_at = COALESCE/,
  );
  assert.match(
    source,
    /UPDATE content_access_tokens[\s\S]+?revoked_at = COALESCE/,
  );
  assert.match(source, /WHERE mode NOT IN \('public', 'private', 'link'\)/);
  assert.match(source, /hasRestorableAccessRequests\(body\.backup\)/);
  assert.match(
    source,
    /finally \{[\s\S]*?await clearPublicCaches\(request, env\)/,
  );
  assert.doesNotMatch(
    source,
    /body\.backup\.firestore\?\.accessRequests \|\| \[\]/,
  );
});

test("054: owner factory reset invalidates prior static share links when roster is cleared", () => {
  const source = read("worker/src/admin/factoryReset.js");
  assert.match(
    source,
    /if \(selection\.players \|\| selection\.cycles \|\| selection\.registrationSettings\) \{[\s\S]*?UPDATE static_share_links/,
  );
  assert.match(source, /await clearPublicCaches\(request, env\)/);
});

test("054: browser validates backup before confirm and saves rollback before replacing data", () => {
  const source = read("src/pages/Admin/settings/RegionBackupPanel.jsx");
  assert.match(source, /if \(!isValidRegionBackup\(payload\)\)/);
  const before = source.indexOf(
    'downloadRegionBackup(beforeRestore.backup, "before-restore")',
  );
  const after = source.indexOf("await restoreRegionBackup(");
  assert.ok(before !== -1 && after > before);
});

test("054: invalid backup cannot issue any database write through authenticated restore route", async () => {
  const previousFetch = globalThis.fetch;
  let databaseQueries = 0;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        fields: {
          role: { stringValue: "owner" },
          active: { booleanValue: true },
        },
      }),
      { status: 200 },
    );
  try {
    const tokenPayload = Buffer.from(
      JSON.stringify({ sub: "stage054-owner" }),
    ).toString("base64url");
    const request = new Request(
      "https://example.invalid/api/admin/region-backup/restore",
      {
        method: "POST",
        headers: { Authorization: `Bearer a.${tokenPayload}.sig` },
        body: JSON.stringify({
          confirmed: true,
          backup: { ...validBackup(), d1: {} },
        }),
      },
    );
    const env = {
      FIREBASE_PROJECT_ID: "test-project",
      DB: {
        prepare() {
          databaseQueries += 1;
          throw new Error("DATABASE_MUST_NOT_BE_TOUCHED");
        },
      },
    };
    const result = await handleRegionBackupRestore(request, env);
    assert.equal(result.status, 400);
    assert.equal((await result.json()).error, "INVALID_REGION_BACKUP");
    assert.equal(databaseQueries, 0);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
