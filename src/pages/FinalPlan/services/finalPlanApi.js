import { getPublicSnapshot, isPublicSnapshotEnabled } from "../../../features/players/publicSnapshot.js";
import { getContentAccessStatus, getPublicContentAccessHint, unlockStaticShareSnapshot } from "../../../features/contentAccess/contentAccessApi.js";
import { requestJson } from "../../../utils/apiClient.js";
import { isSnapshotForActivePeriod } from "../../../../shared/registrationCycle.js";

export async function getPublicFinalPlan(verifiedStatus = null) {
  const status = verifiedStatus?.resource === "final_plan" && verifiedStatus.allowed
    ? verifiedStatus
    : isPublicSnapshotEnabled()
      ? await getPublicContentAccessHint("final_plan")
      : await getContentAccessStatus("final_plan");
  if (!status?.allowed) throw new Error(status?.reason || "CONTENT_ACCESS_REQUIRED");
  // Public plans load as plain JSON; link-only plans load as sealed JSON.
  // Closed plans have no unauthenticated read path.
  if (isPublicSnapshotEnabled() && (status.mode === "public" || status.staticLink)) {
    try {
      const snapshot = await getPublicSnapshot("final-plan.json", { requireNetwork: true, reuseRecentlyVerified: true });
      if (snapshot?.success !== true ||
          !isSnapshotForActivePeriod(snapshot, status?.periodId)) throw new Error("INVALID_SNAPSHOT");
      if (status.staticLink && snapshot.accessMode === "link") {
        return await unlockStaticShareSnapshot("final_plan", snapshot);
      }
      if (status.mode === "public" && snapshot.accessMode === "public") return snapshot;
    } catch {
      // Public snapshots are the only read path when enabled. Never fall
      // back to Worker/D1 on a CDN outage or repeated refreshes.
      throw new Error("SNAPSHOT_UNAVAILABLE");
    }
    throw new Error("SNAPSHOT_UNAVAILABLE");
  }
  return requestJson("/api/final-plan", { cache: "no-store" });
}
