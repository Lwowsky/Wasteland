import { countPublishedPlanPlayers } from "./publishedPlanCount.js";

// Pure validation for a published static snapshot. No API/D1/Worker reads.
export function auditPublishedSnapshot({ revision, summary, players, finalPlan }) {
  const errors = [];
  if (!Number.isSafeInteger(revision?.revision) || revision.revision < 1) errors.push("INVALID_REVISION");
  if (!summary || !Array.isArray(summary.recentPlayers) || summary.recentPlayers.length > 5) errors.push("INVALID_RECENT_PLAYERS");
  if (!players || !Array.isArray(players.players) ||
      !Number.isSafeInteger(players.total) || players.total !== players.players?.length) errors.push("INCOMPLETE_PLAYERS");
  const allowedPlayerFields = new Set(["id", "nickname", "alliance", "troopType", "tier", "shift", "captain", "createdAt"]);
  for (const row of [...(Array.isArray(players?.players) ? players.players : []),
    ...(Array.isArray(summary?.recentPlayers) ? summary.recentPlayers : [])]) {
    if (!row || typeof row !== "object" || Object.keys(row).some((key) => !allowedPlayerFields.has(key))) {
      errors.push("UNSAFE_PLAYER_FIELDS");
      break;
    }
  }
  if (!finalPlan || !["public", "link", "code", "private", "closed"].includes(finalPlan.accessMode)) {
    errors.push("INVALID_PLAN_ACCESS");
  } else if (!["public", "link"].includes(finalPlan.accessMode) && finalPlan.plan != null) {
    errors.push("PROTECTED_PLAN_EXPOSED");
  }
  const count = summary?.stats?.finalPlayers;
  if (count !== undefined && (!Number.isSafeInteger(count) || count < 0)) errors.push("INVALID_FINAL_COUNT");
  // When a plan is published, home statistics must count people, not placements.
  if (finalPlan?.plan && typeof count === "number" && countPublishedPlanPlayers(finalPlan.plan) !== count) {
    errors.push("FINAL_COUNT_MISMATCH");
  }
  return [...new Set(errors)];
}
