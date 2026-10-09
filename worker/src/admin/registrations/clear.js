import { verifyAdminRequest } from "../../auth/adminAuth.js";
import { clearPublicCaches } from "../../utils/cache.js";
import { json } from "../../utils/response.js";
import { canManagePlayerData } from "./data.js";
import { getAdminRegistrationPeriod } from "./period.js";
import { getRegistrationCount } from "../../db/registrationQueries.js";
import { prepareClearPeriodStatements } from "../../db/registrationWrites.js";

export async function handleAdminClearRegistrations(request, env) {
  const admin = await verifyAdminRequest(request, env);

  if (!admin.ok) {
    return json({ success: false, error: admin.error }, admin.status);
  }

  if (!canManagePlayerData(admin)) {
    return json({ success: false, error: "FORBIDDEN" }, 403);
  }

  const period = await getAdminRegistrationPeriod(env);

  if (!period) {
    return json({ success: false, error: "NO_CURRENT_PERIOD" }, 400);
  }

  const cleared = await getRegistrationCount(env, period.id);

  await env.DB.batch(prepareClearPeriodStatements(env, period.id));
  await clearPublicCaches(request);

  return json({
    success: true,
    cleared,
    periodId: period.id,
  });
}
