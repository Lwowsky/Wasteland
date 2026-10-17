import { verifyAdminRequest, adminHasPermission } from "../../auth/adminAuth.js";
import { json } from "../../utils/response.js";
import { getAdminRegistrationPeriod, toPeriodResponse } from "./period.js";
import { getRegistrationRows, getRegistrationCursor, getRegistrationChanges } from "../../db/registrationQueries.js";

export async function handleAdminRegistrations(request, env) {
  const admin = await verifyAdminRequest(request, env);

  if (!admin.ok) {
    return json({ success: false, error: admin.error }, admin.status);
  }

  if (!adminHasPermission(admin, "view_players")) {
    return json({ success: false, error: "FORBIDDEN" }, 403);
  }

  const period = await getAdminRegistrationPeriod(env);

  if (!period) {
    return json({ registrations: [], total: 0, period: null, cursor: 0 }, 200, { "Cache-Control": "private, no-store" });
  }

  const cursor = await getRegistrationCursor(env, period.id);
  const registrations = await getRegistrationRows(env, period.id);

  return json({
    registrations,
    total: registrations.length,
    cursor,
    period: toPeriodResponse(period),
    admin: {
      role: admin.role,
      displayName: admin.displayName,
    },
  }, 200, { "Cache-Control": "private, no-store" });
}


export async function handleAdminRegistrationChanges(request, env) {
  const admin = await verifyAdminRequest(request, env);
  if (!admin.ok) return json({ success: false, error: admin.error }, admin.status);
  if (!adminHasPermission(admin, "view_players")) {
    return json({ success: false, error: "FORBIDDEN" }, 403);
  }
  const url = new URL(request.url);
  const afterText = url.searchParams.get("after") || "";
  const periodText = url.searchParams.get("periodId") || "";
  if (!/^(0|[1-9]\d*)$/.test(afterText) || !/^[1-9]\d*$/.test(periodText)) {
    return json({ success: false, error: "INVALID_CURSOR" }, 400);
  }
  const after = Number(afterText);
  const requestedPeriodId = Number(periodText);
  if (!Number.isSafeInteger(after) || !Number.isSafeInteger(requestedPeriodId)) {
    return json({ success: false, error: "INVALID_CURSOR" }, 400);
  }
  const period = await getAdminRegistrationPeriod(env);
  if (!period || Number(period.id) !== requestedPeriodId) {
    return json({ reset: true, period: toPeriodResponse(period), cursor: 0 }, 200, {
      "Cache-Control": "private, no-store",
    });
  }
  const changes = await getRegistrationChanges(env, period.id, after);
  return json({ ...changes, reset: false, period: toPeriodResponse(period) }, 200, {
    "Cache-Control": "private, no-store",
  });
}
