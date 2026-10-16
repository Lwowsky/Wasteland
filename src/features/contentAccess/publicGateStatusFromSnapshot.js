// Public metadata controls only which gate to display. It never authorizes
// access to a protected resource. Active sessions must be checked by Worker.
export function publicGateStatusFromSnapshot(resource, snapshot, hasSession = false) {
  if (!['players', 'final_plan'].includes(resource) || !snapshot || typeof snapshot !== 'object') return null;
  if (snapshot.success !== true) return null;
  const mode = snapshot.accessMode;
  if (mode === 'public') {
    return { resource, mode, allowed: true, reason: null };
  }
  if (!['code', 'link', 'private'].includes(mode) || hasSession) return null;
  return {
    resource,
    mode,
    allowed: false,
    reason: mode === 'private' ? 'CONTENT_PRIVATE' : 'CONTENT_ACCESS_REQUIRED',
  };
}
