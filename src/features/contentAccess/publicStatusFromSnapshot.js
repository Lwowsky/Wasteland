// This is UI-routing metadata, not authorization. GitHub Pages snapshots are
// public even when an administrator selects "code" or "private".
export function publicStatusFromSnapshot(resource, snapshot) {
  if (resource !== "players" || snapshot?.accessMode !== "public") {
    return null;
  }
  return { resource, mode: "public", allowed: true, reason: null };
}

