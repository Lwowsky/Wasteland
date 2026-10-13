/** A changed registration roster is not by itself a reason to disable its own review button. */
export function canReviewTurretRoster({ rosterChanged, stale, conflicts, remoteConflict, busy, ready }) {
  return Boolean(ready && rosterChanged && !stale && !conflicts && !remoteConflict && !busy);
}
