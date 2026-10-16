// This is UI-routing metadata, not authorization. GitHub Pages snapshots are
// public even when an administrator selects "code" or "private".
export function publicStatusFromSnapshot(resource, snapshot) {
  if (!["players", "final_plan"].includes(resource) || snapshot?.accessMode !== "public") {
    return null;
  }
  return { resource, mode: "public", allowed: true, reason: null };
}

