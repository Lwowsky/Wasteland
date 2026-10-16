import { verifyAdminRequest, adminHasPermission } from "../../auth/adminAuth.js";
import { json } from "../../utils/response.js";
import {
  normalizeNicknameForRegistration,
  normalizeRegistrationBody,
  validateRegistrationBody,
  toRegistrationRecord,
} from "./data.js";
import { clearPublicCaches } from "../../utils/cache.js";
import { getAdminRegistrationPeriod } from "./period.js";
import { findDuplicateRegistration } from "../../db/registrationQueries.js";
import {
  prepareCreateRegistrationStatements,
} from "../../db/registrationWrites.js";

export async function handleAdminCreateRegistration(request, env) {
  const admin = await verifyAdminRequest(request, env);

  if (!admin.ok) {
    return json({ success: false, error: admin.error }, admin.status);
  }

  if (!adminHasPermission(admin, "edit_players")) {
    return json({ success: false, error: "FORBIDDEN" }, 403);
  }

  const period = await getAdminRegistrationPeriod(env);

  if (!period) {
    return json({ success: false, error: "NO_CURRENT_PERIOD" }, 400);
  }

  const data = normalizeRegistrationBody(await request.json());

  if (!validateRegistrationBody(data)) {
    return json({ success: false, error: "INVALID_DATA" }, 400);
  }

  const nicknameNormalized = normalizeNicknameForRegistration(data);
  const existing = await findDuplicateRegistration(
    env,
    period.id,
    nicknameNormalized,
  );

  if (existing) {
    return json({ success: false, error: "ALREADY_REGISTERED" }, 409);
  }

  const record = toRegistrationRecord(data, nicknameNormalized);
  const [insertResult] = await env.DB.batch(
    prepareCreateRegistrationStatements(env, period.id, record),
  );
  const registrationId = insertResult.meta.last_row_id;
  try {
    await clearPublicCaches(request, env);
  } catch {
    // DB transaction is already committed; stale caches expire automatically.
  }

  return json({ success: true, registrationId });
}
