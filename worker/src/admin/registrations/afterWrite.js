import { rebuildStats } from "../../db/stats.js";
import { clearPublicCaches } from "../../utils/cache.js";

export async function finalizeRegistrationWrite(request, env, periodId) {
  await rebuildStats(env, periodId);
  await clearPublicCaches(request, env);
}
