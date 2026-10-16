import { json } from "../utils/response.js";
import { handlePlayers } from "./players.js";
import { handleStats } from "./stats.js";
import { handleRecent } from "./recent.js";
import {
  getPublicSnapshotRevision,
  hasPublicSnapshotAccess,
  acknowledgePublicSnapshot,
} from "../services/publicSnapshotSync.js";

// PUBLIC fields visible on the simplified /players table; never send the
// detailed march/rally/lair/extra-squad data used by the admin table.
export function publicPlayer(row) {
  return {
    id: row.id,
    nickname: row.nickname,
    alliance: row.alliance,
    troopType: row.troopType,
    tier: row.tier,
    shift: row.shift,
    captain: row.captain,
    createdAt: row.createdAt,
  };
}

export async function handlePublicSnapshot(request, env) {
  if (!hasPublicSnapshotAccess(request, env)) {
    return json({ error: "UNAUTHORIZED" }, 401, { "cache-control": "no-store" });
  }

  // Capture revision BEFORE fetching the snapshot. Changes committed during
  // these reads must lead to another publication after this one is acked.
  const revision = await getPublicSnapshotRevision(env);
  const [playersResponse, statsResponse, recentResponse] = await Promise.all([
    handlePlayers(env, new URL("https://internal.invalid/api/players?page=1&limit=500")),
    handleStats(env),
    handleRecent(env, new URL("https://internal.invalid/api/recent?limit=5")),
  ]);
  if (![playersResponse, statsResponse, recentResponse].every((response) => response.ok)) {
    return json({ error: "EXPORT_FAILED" }, 500);
  }
  const [players, stats, recent] = await Promise.all([
    playersResponse.json(), statsResponse.json(), recentResponse.json(),
  ]);
  return json({
    revision,
    summary: { ...stats, recentPlayers: recent.map(publicPlayer) },
    players: { ...players, players: (players.players || []).map(publicPlayer) },
  }, 200, { "cache-control": "no-store" });
}

export async function handlePublicSnapshotAck(request, env) {
  if (!hasPublicSnapshotAccess(request, env)) {
    return json({ error: "UNAUTHORIZED" }, 401, { "cache-control": "no-store" });
  }
  const body = await request.json().catch(() => ({}));
  const accepted = await acknowledgePublicSnapshot(env, Number(body.revision));
  if (!accepted) return json({ error: "INVALID_REVISION" }, 400);
  return json({ success: true }, 200, { "cache-control": "no-store" });
}
