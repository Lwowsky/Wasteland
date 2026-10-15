import { json } from "../utils/response.js";
import { handlePlayers } from "./players.js";
import { handleStats } from "./stats.js";
import { handleRecent } from "./recent.js";

// This endpoint is for a trusted GitHub Actions runner only. The snapshot itself
// must contain ONLY already-approved public display fields.
function permitted(request, env) {
  const configured = String(env.PUBLIC_SNAPSHOT_EXPORT_TOKEN || "");
  const supplied = request.headers.get("Authorization") || "";
  const expected = `Bearer ${configured}`;
  if (!configured || supplied.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function handlePublicSnapshot(request, env) {
  if (!permitted(request, env)) {
    return json({ error: "UNAUTHORIZED" }, 401, { "cache-control": "no-store" });
  }

  const [playersResponse, statsResponse, recentResponse] = await Promise.all([
    handlePlayers(env, new URL("https://internal.invalid/api/players?page=1&limit=500")),
    handleStats(env),
    handleRecent(env, new URL("https://internal.invalid/api/recent?limit=5")),
  ]);
  if (![playersResponse, statsResponse, recentResponse].every((r) => r.ok)) {
    return json({ error: "EXPORT_FAILED" }, 500);
  }
  const [playersData, statsData, recentData] = await Promise.all([
    playersResponse.json(), statsResponse.json(), recentResponse.json(),
  ]);
  // Never export other/admin tables, tokens, passwords, emails or audit logs.
  return json({
    summary: { ...statsData, recentPlayers: recentData },
    players: { ...playersData, players: playersData.players || [] },
  }, 200, { "cache-control": "no-store" });
}
