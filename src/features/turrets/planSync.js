import { isTurretPlanDirty } from "./localTurretWorkspace.js";

/** The only D1 draft write decision: a clean local copy must not cause a PUT. */
export async function saveChangedTurretPlan({ periodId, revision, settings, assignments, committed }, saveRequest) {
  if (!isTurretPlanDirty(settings, assignments, committed)) return { revision, draft: null };
  const result = await saveRequest({ periodId: Number(periodId), revision, settings, assignments });
  if (!Number.isSafeInteger(result?.draft?.revision) || result.draft.revision <= revision) {
    throw new Error("TURRET_BAD_SAVE_RESPONSE");
  }
  return { revision: result.draft.revision, draft: result.draft };
}
