import { verifyAdminRequest } from "../../auth/adminAuth.js";
import { json } from "../../utils/response.js";
import { getAdminRegistrationPeriod, toPeriodResponse } from "./period.js";
import { getRegistrationRows } from "../../db/registrationQueries.js";

export async function handleAdminRegistrations(request, env) {
  const admin = await verifyAdminRequest(request, env);

  if (!admin.ok) {
    return json({ success: false, error: admin.error }, admin.status);
  }

  const period = await getAdminRegistrationPeriod(env);

  if (!period) {
    return json({ registrations: [], total: 0, period: null });
  }

  const registrations = await getRegistrationRows(env, period.id);

  return json({
    registrations,
    total: registrations.length,
    period: toPeriodResponse(period),
    admin: {
      role: admin.role,
      displayName: admin.displayName,
    },
  });
}
