import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  CONTENT_ACCESS_MODES,
  normalizeMode,
  mapContentAccessSetting,
} from "../worker/src/services/contentAccessUtils.js";

const read = (name) =>
  readFileSync(new URL(`../${name}`, import.meta.url), "utf8");

test("051: only public, closed, and link-only modes exist; legacy DB codes fail closed", () => {
  assert.deepEqual(CONTENT_ACCESS_MODES, ["public", "private", "link"]);
  assert.equal(normalizeMode("code"), "private");
  assert.equal(normalizeMode("weird"), "private");

  assert.equal(
    mapContentAccessSetting({ resource: "players", mode: "code" }).mode,
    "private",
  );

  assert.equal(
    mapContentAccessSetting({ resource: "final_plan", mode: "link" }).mode,
    "link",
  );
});

test("051: public Worker endpoints cannot be unlocked by an old code/session header", () => {
  const worker = read("worker/src/index.js");
  const service = read("worker/src/services/contentAccess.js");
  const publicHandler = read("worker/src/public/contentAccess.js");

  assert.doesNotMatch(worker, /content-access\/activate/);
  assert.doesNotMatch(publicHandler, /Activation|activateContentAccess/);

  assert.doesNotMatch(read("worker/src/config/headers.js"), /X-Content-Access/);

  assert.doesNotMatch(read("wrangler.jsonc"), /ACCESS_ACTIVATION_RATE_LIMIT/);

  assert.doesNotMatch(
    service,
    /hasValidSession|X-Content-Access|activateContentAccess|generateAccessCode/,
  );

  assert.match(service, /allowed:\s*setting\.mode\s*===\s*"public"/);

  assert.match(
    service,
    /setting\.mode\s*===\s*"private"\s*\?\s*"CONTENT_PRIVATE"\s*:\s*"CONTENT_ACCESS_REQUIRED"/,
  );

  assert.match(
    service,
    /if\s*\(\s*payload\.mode\s*!==\s*undefined\s*&&\s*!\[\s*"public"\s*,\s*"private"\s*,\s*"link"\s*\]\.includes\(\s*payload\.mode\s*\)/,
  );
});

test("051: static share links still use an encrypted snapshot without API activation", () => {
  const api = read("src/features/contentAccess/contentAccessApi.js");
  const gate = read("src/features/contentAccess/ContentAccessGate.jsx");
  const staticShares = read("worker/src/services/staticShareLinks.js");
  const panel = read("src/pages/Admin/settings/ContentAccessEditor.jsx");

  assert.match(api, /openSnapshotFromLink\(/);
  assert.match(api, /staticLink:\s*true/);

  assert.doesNotMatch(api, /content-access\/activate|X-Content-Access/);

  assert.doesNotMatch(gate, /submitCode|activateContentAccess|invalid-code-v1/);

  assert.doesNotMatch(panel, /draft\.mode\s*===\s*"code"/);
  assert.match(panel, /staticLinks/);
  assert.match(staticShares, /encryptShareCode/);
  assert.match(staticShares, /decryptShareCode/);
});

test("051: migration closes legacy code modes and leaves existing static share links intact", () => {
  const migration = read(
    "worker/migrations/0021_retire_public_access_codes.sql",
  );

  assert.match(migration, /SET mode = 'private'/);
  assert.match(migration, /WHERE mode = 'code'/);
  assert.match(migration, /DELETE FROM content_access_sessions/);

  assert.doesNotMatch(
    migration,
    /(?:DELETE FROM|UPDATE|DROP TABLE) static_share_links/,
  );
});

test("051: login keys for consuls and Firebase admin authorization remain wired", () => {
  const worker = read("worker/src/index.js");

  assert.match(worker, /shared-consul\/login/);
  assert.match(worker, /verifySensitiveTurnstile/);
  assert.match(worker, /handleAdminContentAccessGet/);
  assert.match(worker, /handleAdminContentAccessPut/);
});
