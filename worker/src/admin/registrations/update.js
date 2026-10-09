import { verifyAdminRequest } from "../../auth/adminAuth.js";
import { json } from "../../utils/response.js";
import {
  normalizeNicknameForRegistration,
  normalizeRegistrationBody,
  validateRegistrationBody,
  toRegistrationRecord,
} from "./data.js";
import { parseObjectJson } from "../../utils/normalize.js";
import { finalizeRegistrationWrite } from "./afterWrite.js";
import {
  findDuplicateRegistration,
  findRegistrationById,
} from "../../db/registrationQueries.js";
import {
  preparePublicPlayerUpdate,
  prepareRegistrationUpdate,
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

  await prepareRegistrationUpdate(env, registrationId, record).run();
  await preparePublicPlayerUpdate(env, registrationId, record).run();

  await finalizeRegistrationWrite(request, env, existing.period_id);

  return json({ success: true });
}
