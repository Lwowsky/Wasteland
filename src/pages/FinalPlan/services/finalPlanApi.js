import { getPublicSnapshot, isPublicSnapshotEnabled } from "../../../features/players/publicSnapshot.js";
import { getContentAccessHeaders, getContentAccessStatus } from "../../../features/contentAccess/contentAccessApi.js";
import { requestJson } from "../../../utils/apiClient.js";

export async function getPublicFinalPlan(verifiedStatus = null) {
  const status = verifiedStatus?.resource === "final_plan" && verifiedStatus.allowed
    ? verifiedStatus : await getContentAccessStatus("final_plan");
  if (!status.allowed) throw new Error(status.reason || "CONTENT_ACCESS_REQUIRED");
  // Only PUBLIC plans can be loaded from GitHub Pages. Protected plans always
  // use server-validated sessions and must never be exported to public JSON.
  if (isPublicSnapshotEnabled() && status.mode === "public") {
    try {
      const snapshot = await getPublicSnapshot("final-plan.json", { requireNetwork: true, reuseRecentlyVerified: true });
      if (snapshot?.success === true && snapshot.accessMode === "public") return snapshot;
    } catch { /* Static host unavailable: use the authenticated API. */ }
  }
  return requestJson("/api/final-plan", {
    headers: getContentAccessHeaders("final_plan"),
    cache: "no-store",
  });
}
