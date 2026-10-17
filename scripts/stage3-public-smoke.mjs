// Read-only production smoke test. Fetches ONLY the public GitHub Pages JSON.
// Usage: node scripts/stage3-public-smoke.mjs https://<user>.github.io/Wasteland-Public-Data/data
const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/stage3-public-smoke.mjs https://<github-pages-site>/data");
  process.exit(2);
}
const base = new URL(input.endsWith("/") ? input : `${input}/`);
if (base.protocol !== "https:" || /workers\.dev$/i.test(base.hostname)) {
  console.error("Only HTTPS static publication URLs are allowed (not Workers).");
  process.exit(2);
}
const files = ["revision.json", "summary.json", "players.json", "final-plan.json", "site-settings.json", "registration-settings.json"];
let failures = 0;
const snapshots = {};
for (const file of files) {
  try {
    const response = await fetch(new URL(file, base), { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    snapshots[file] = json;
    console.log(`PASS ${file}: HTTP ${response.status}`);
  } catch (err) {
    failures += 1;
    console.error(`FAIL ${file}: ${err.message}`);
  }
}
if (snapshots["revision.json"]) {
  const revision = snapshots["revision.json"].revision;
  if (!Number.isSafeInteger(revision) || revision < 1) {
    failures += 1;
    console.error("FAIL: invalid publication revision");
  } else console.log(`Revision: ${revision}`);
}
const players = snapshots["players.json"];
if (players) {
  const list = players.players;
  if (!Array.isArray(list) || !Number.isSafeInteger(players.total) || players.total !== list.length) {
    failures += 1;
    console.error("FAIL: incomplete public player snapshot");
  } else {
    const safeFields = new Set(["id", "nickname", "alliance", "troopType", "tier", "shift", "captain", "createdAt"]);
    const unexpected = list.some((row) => Object.keys(row).some((field) => !safeFields.has(field)));
    if (unexpected) { failures += 1; console.error("FAIL: unapproved player fields exported"); }
    else console.log(`Players: ${players.total}, mode: ${players.accessMode}`);
  }
}
const summary = snapshots["summary.json"];
if (summary && !Array.isArray(summary.recentPlayers)) {
  failures += 1;
  console.error("FAIL: home page recentPlayers array missing");
} else if (summary) console.log(`Home preview: ${summary.recentPlayers.length} recent players`);
const plan = snapshots["final-plan.json"];
if (plan && !["public", "link", "code", "private", "closed"].includes(plan.accessMode)) {
  failures += 1;
  console.error("FAIL: unexpected final-plan access mode");
}
if (plan && !["public", "link"].includes(plan.accessMode) && plan.plan != null) {
  failures += 1;
  console.error("FAIL: protected plan leaked into static JSON");
}
console.log(failures ? `FAILED (${failures} issues)` : "STAGE3_PUBLIC_SMOKE_OK");
process.exitCode = failures ? 1 : 0;
