import { getContentAccessHeaders } from "../../../features/contentAccess/contentAccessApi.js";
import { requestJson } from "../../../utils/apiClient.js";

export function getPublicFinalPlan() {
  return requestJson("/api/final-plan", {
    headers: getContentAccessHeaders("final_plan"),
    cache: "no-store",
  });
}
