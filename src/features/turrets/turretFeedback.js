/** Safe message resolution for all turret actions (including automatic actions).
 * Some namespaces deliberately have no `messages` map. */
export function resolveTurretFeedback(distribution, key, autoStats = null) {
  if (!key) return "";
  const template = distribution?.server?.messages?.[key] ??
    distribution?.manual?.messages?.[key] ??
    distribution?.planner?.messages?.[key] ??
    distribution?.auto?.messages?.[key] ?? "";
  const fields = {
    captains: autoStats?.captainsAdded,
    helpers: autoStats?.helpersAdded,
    released: autoStats?.helpersReleased,
    reserve: autoStats?.unassigned,
    moved: autoStats?.helpersMoved,
    same: autoStats?.helpersSameTurret,
    returned: autoStats?.helpersToReserve,
    newFromReserve: autoStats?.helpersNewFromReserve,
    conflicts: autoStats?.remainingConflicts,
  };
  const message = String(template).replace(/\{\{(captains|helpers|released|reserve|moved|same|returned|newFromReserve|conflicts)\}\}/g,
    (_, name) => String(fields[name] ?? 0));
  if (autoStats?.resizedHelpers > 0 && ["autoFilled", "autoTowerFilled"].includes(key)) {
    const note = distribution?.auto?.marchesAdjusted;
    return note ? `${message} ${note.replace("{{count}}", String(autoStats.resizedHelpers))}` : message;
  }
  return message;
}
