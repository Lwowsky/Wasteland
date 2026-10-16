import { json } from "../utils/response.js";
import { handlePlayers } from "./players.js";
import { handleStats } from "./stats.js";
import { handleRecent } from "./recent.js";
import { handlePublicSiteSettings } from "./siteSettings.js";
import { handlePublicRegistrationSettings } from "./registrationSettings.js";
import { getContentAccessSetting } from "../services/contentAccess.js";
import { getPublicDisplayPeriod } from "../db/periods.js";
import { getRegistrationSettings } from "../db/registrationSettings.js";
import { readPublishedPlan } from "../turrets/storage.js";
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
  const [playersResponse, statsResponse, recentResponse, siteSettingsResponse, registrationSettingsResponse, accessSetting] = await Promise.all([
    handlePlayers(env, new URL("https://internal.invalid/api/players?page=1&limit=500")),
    handleStats(env),
    handleRecent(env, new URL("https://internal.invalid/api/recent?limit=5")),
    handlePublicSiteSettings(env),
    handlePublicRegistrationSettings(env),
    getContentAccessSetting(env, "players"),
  ]);
  if (![playersResponse, statsResponse, recentResponse, siteSettingsResponse, registrationSettingsResponse].every((response) => response.ok)) {
    return json({ error: "EXPORT_FAILED" }, 500);
  }
  const [players, stats, recent, siteSettings, registrationSettings] = await Promise.all([
    playersResponse.json(), statsResponse.json(), recentResponse.json(),
    siteSettingsResponse.json(), registrationSettingsResponse.json(),
  ]);
  const finalAccess = await getContentAccessSetting(env, "final_plan");
  // Never export protected plan contents. Public mode is only a display hint.
  const registration = await getRegistrationSettings(env);
  const period = await getPublicDisplayPeriod(env, registration);
  const published = finalAccess.mode === "public" && period
    ? await readPublishedPlan(env, period.id) : null;
  return json({
    revision,
    finalPlan: {
      success: true, accessMode: finalAccess.mode, periodId: period?.id ?? null,
      plan: published?.plan ?? null, publishedAt: published?.publishedAt ?? null,
      revision: published?.revision ?? null,
    },
    summary: { ...stats, recentPlayers: accessSetting.mode === "public" ? recent.map(publicPlayer) : [] },
    // Identical to the pre-existing PUBLIC API response shapes. Never copy
    // admin-only settings, secrets, codes, or authorization sessions.
    siteSettings,
    registrationSettings,
    // PUBLIC metadata only: never export code/link tokens or sessions.
    // The Pages JSON itself remains publicly readable in every access mode.
    players: {
      ...players,
      accessMode: accessSetting.mode,
      players: accessSetting.mode === "public" ? (players.players || []).map(publicPlayer) : [],
      total: accessSetting.mode === "public" ? players.total : 0,
      pages: accessSetting.mode === "public" ? players.pages : 0,
    },
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
