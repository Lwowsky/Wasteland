import { json } from "../utils/response.js";
import { fetchAllPublicPlayers } from "./fetchAllPublicPlayers.js";
import { handlePlayers } from "./players.js";
import { handleStats } from "./stats.js";
import { handleRecent } from "./recent.js";
import { handlePublicSiteSettings } from "./siteSettings.js";
import { handlePublicRegistrationSettings } from "./registrationSettings.js";
import { getContentAccessSetting } from "../services/contentAccess.js";
import { getPublicDisplayPeriod } from "../db/periods.js";
import { getRegistrationSettings } from "../db/registrationSettings.js";
import { readPublishedPlan } from "../turrets/storage.js";
import { countPublishedPlanPlayers } from "./publishedPlanCount.js";
import { auditPublishedSnapshot } from "./snapshotAudit.js";
import { isSnapshotPublic } from "./snapshotVisibility.js";
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

// Explicit allowlist: never spread the internal D1/API player payload into a
// static GitHub Pages file. A future private field must not become public by accident.
export function buildSafeSnapshotPlayers(players, accessMode, shareLinks, expose) {
  const rows = expose && Array.isArray(players?.players)
    ? players.players.map(publicPlayer)
    : [];
  return {
    page: 1,
    limit: Math.max(rows.length, 1),
    total: rows.length,
    pages: rows.length ? 1 : 0,
    accessMode,
    shareLinks: Array.isArray(shareLinks) ? shareLinks.map(({ hash, expiresAt }) => ({ hash, expiresAt })) : [],
    players: rows,
  };
}

// The home page intentionally shows up to five recent registrations from the
// current cycle in ALL player-table access modes. This is a separate public
// preview, not permission to expose the protected /players table.
export function getPublicRecentRegistrations(rows) {
  return Array.isArray(rows) ? rows.slice(0, 5).map(publicPlayer) : [];
}

export async function handlePublicSnapshot(request, env) {
  if (!hasPublicSnapshotAccess(request, env)) {
    return json({ error: "UNAUTHORIZED" }, 401, { "cache-control": "no-store" });
  }

  // Capture revision BEFORE fetching the snapshot. Changes committed during
  // these reads must lead to another publication after this one is acked.
  const revision = await getPublicSnapshotRevision(env);
  const [playersResponse, statsResponse, recentResponse, siteSettingsResponse, registrationSettingsResponse, accessSetting] = await Promise.all([
    fetchAllPublicPlayers(env, handlePlayers),
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
  // Export only the whitelisted public-view plan in public or link mode.
  // In link mode these data are intentionally NOT secret: the static JSON is public.
  const registration = await getRegistrationSettings(env);
  const period = await getPublicDisplayPeriod(env, registration);
  const publishedForStats = period ? await readPublishedPlan(env, period.id) : null;
  const published = ["public", "link"].includes(finalAccess.mode) ? publishedForStats : null;
  // Re-check immediately before exporting: an admin may have closed access
  // while the database reads above were in progress.
  const [latestPlayersAccess, latestPlanAccess] = await Promise.all([
    getContentAccessSetting(env, "players"),
    getContentAccessSetting(env, "final_plan"),
  ]);
  const exposePlayers = isSnapshotPublic(accessSetting, latestPlayersAccess) ||
    (accessSetting.mode === "link" && latestPlayersAccess.mode === "link");
  const exposePlan = isSnapshotPublic(finalAccess, latestPlanAccess) ||
    (finalAccess.mode === "link" && latestPlanAccess.mode === "link");
  const links = await Promise.all(["players", "final_plan"].map(async (resource) => {
    const rows = await env.DB.prepare(`SELECT token_hash, expires_at FROM static_share_links
      WHERE resource = ? AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > ?)`).bind(resource, new Date().toISOString()).all();
    return [resource, (rows.results || []).map((row) => ({ hash: row.token_hash, expiresAt: row.expires_at }))];
  }));
  const payload = {
    revision,
    finalPlan: {
      success: true, accessMode: latestPlanAccess.mode, shareLinks: Object.fromEntries(links).final_plan, periodId: period?.id ?? null,
      plan: exposePlan ? (published?.plan ?? null) : null,
      publishedAt: exposePlan ? (published?.publishedAt ?? null) : null,
      revision: exposePlan ? (published?.revision ?? null) : null,
    },
    summary: { ...stats, finalPlayers: countPublishedPlanPlayers(publishedForStats?.plan), recentPlayers: getPublicRecentRegistrations(recent) },
    // Identical to the pre-existing PUBLIC API response shapes. Never copy
    // admin-only settings, secrets, codes, or authorization sessions.
    siteSettings,
    registrationSettings,
    // Public-view fields only; short share codes and admin credentials are NEVER exported.
    // The Pages JSON itself remains publicly readable in every access mode.
    players: buildSafeSnapshotPlayers(
      players,
      latestPlayersAccess.mode,
      Object.fromEntries(links).players,
      exposePlayers,
    ),
  };
  // Validate export before publishing. Failure keeps the previous Pages revision.
  const issues = auditPublishedSnapshot({
    revision: { revision },
    summary: { stats: { finalPlayers: payload.summary.finalPlayers }, recentPlayers: payload.summary.recentPlayers },
    players: payload.players,
    finalPlan: payload.finalPlan,
  });
  if (issues.length) {
    console.error("PUBLIC_SNAPSHOT_VALIDATION_FAILED", issues.join(","));
    return json({ error: "INVALID_PUBLIC_SNAPSHOT" }, 500, { "cache-control": "no-store" });
  }
  return json(payload, 200, { "cache-control": "no-store" });
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
