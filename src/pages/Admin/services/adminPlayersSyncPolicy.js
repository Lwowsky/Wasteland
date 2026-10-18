// One automatic delta check at most once per 2 minutes per authenticated tab.
// This is deliberately a low-frequency safety net, NOT a manual refresh button.
// Active admin table remains automatically updated, even with no user clicks.
export const ADMIN_PLAYERS_AUTO_CHECK_MS = 2 * 60 * 1000;

export function shouldCheckAdminPlayers(lastAttemptAt, now = Date.now(), interval = ADMIN_PLAYERS_AUTO_CHECK_MS) {
  if (!Number.isFinite(now) || !Number.isFinite(interval) || interval <= 0) return false;
  if (!Number.isFinite(lastAttemptAt) || lastAttemptAt <= 0) return true;
  // Clock rollback: allow one check and reset the saved timestamp.
  if (lastAttemptAt > now) return true;
  return now - lastAttemptAt >= interval;
}
