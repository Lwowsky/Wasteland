import { getPublicSnapshot, isPublicSnapshotEnabled } from "../../../features/players/publicSnapshot.js";
import { getContentAccessHeaders } from "../../../features/contentAccess/contentAccessApi.js";
import { requestJson } from "../../../utils/apiClient.js";

export async function getPublicFinalPlan() {
  // Only PUBLIC plans can be loaded from GitHub Pages. Protected plans always
  // use server-validated sessions and must never be exported to public JSON.
  if (isPublicSnapshotEnabled()) {
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
