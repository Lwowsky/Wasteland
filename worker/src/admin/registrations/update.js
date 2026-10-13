import { verifyAdminRequest, adminHasPermission } from "../../auth/adminAuth.js";
import { json } from "../../utils/response.js";
import {
  normalizeNicknameForRegistration,
  normalizeRegistrationBody,
  validateRegistrationBody,
  toRegistrationRecord,
} from "./data.js";
import { parseObjectJson } from "../../utils/normalize.js";
import { clearPublicCaches } from "../../utils/cache.js";
import {
  findDuplicateRegistration,
  findRegistrationById,
} from "../../db/registrationQueries.js";
import {
  prepareUpdateRegistrationStatements,
} from "../../db/registrationWrites.js";

export async function handleAdminUpdateRegistration(
  request,
  env,
  registrationId,
) {
  const admin = await verifyAdminRequest(request, env);

  if (!admin.ok) {
    return json({ success: false, error: admin.error }, admin.status);
  }

  if (!adminHasPermission(admin, "edit_players")) {
    return json({ success: false, error: "FORBIDDEN" }, 403);
  }

  const existing = await findRegistrationById(env, registrationId);

  if (!existing) {
    return json({ success: false, error: "PLAYER_NOT_FOUND" }, 404);
  }

  const data = normalizeRegistrationBody(await request.json());

  if (!validateRegistrationBody(data)) {
    return json({ success: false, error: "INVALID_DATA" }, 400);
  }

  const nicknameNormalized = normalizeNicknameForRegistration(data);
  const duplicate = await findDuplicateRegistration(
    env,
    existing.period_id,
    nicknameNormalized,
    registrationId,
  );

  if (duplicate) {
    return json({ success: false, error: "ALREADY_REGISTERED" }, 409);
  }

  const customFields =
    data.customFields || parseObjectJson(existing.custom_fields_json);

  const record = toRegistrationRecord(
    data,
    nicknameNormalized,
    customFields,
  );

  await env.DB.batch(prepareUpdateRegistrationStatements(
    env, registrationId, existing.period_id, record,
  ));
  try {
    await clearPublicCaches(request);
  } catch {
    // Database changes cannot be undone by a cache invalidation failure.
  }

  return json({ success: true });
}
