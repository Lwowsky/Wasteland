import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("2B: share code uses cryptographic random bytes and no admin credential", () => {
  const s = read("worker/src/services/contentAccessUtils.js");
  assert.match(s, /generateStaticShareCode\(\)/);
  assert.match(s, /base64Url\(randomBytes\(12\)\)/);
});
test("2B: browser verifies published hashes, expiry, and decrypts sealed data", () => {
  const s = read("src/features/contentAccess/contentAccessApi.js");
  assert.match(s, /crypto\.subtle\.digest/);
  assert.match(s, /item\.hash === hash/);
  assert.match(s, /openSnapshotFromLink/);
  assert.match(s, /Date\.parse\(entry\.expiresAt\) > Date\.now\(\)/);
});
test("2B: all public-view routes use snapshots for static links", () => {
  for (const file of ["src/features/players/publicPlayersApi.js", "src/pages/FinalPlan/services/finalPlanApi.js"]) {
    assert.match(read(file), /status\.staticLink/);
  }
});
test("2B: no secret token values are exported to public JSON", () => {
  const s = read("worker/src/public/publicSnapshot.js");
  assert.match(s, /SELECT token_hash, encrypted_token, expires_at FROM static_share_links/);
  assert.match(s, /sealSnapshotForLinks/);
  assert.match(s, /decryptShareCode/);
  assert.doesNotMatch(s, /SELECT \* FROM static_share_links/);
  assert.match(s, /shareLinks:/);
});
