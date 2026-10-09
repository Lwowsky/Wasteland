import { verifyAdminRequest } from "../../auth/adminAuth.js";
import { json } from "../../utils/response.js";
import {
  normalizeNicknameForRegistration,
  normalizeRegistrationBody,
  validateRegistrationBody,
  toRegistrationRecord,
} from "./data.js";
import { finalizeRegistrationWrite } from "./afterWrite.js";
import { getAdminRegistrationPeriod } from "./period.js";
import { findDuplicateRegistration } from "../../db/registrationQueries.js";
import {
  preparePublicPlayerInsert,
  prepareRegistrationInsert,
} from "../../db/registrationWrites.js";

export async function handleAdminCreateRegistration(request, env) {
  const admin = await verifyAdminRequest(request, env);

  if (!admin.ok) {
    return json({ success: false, error: admin.error }, admin.status);
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
  const result = await prepareRegistrationInsert(env, period.id, record).run();
  const registrationId = result.meta.last_row_id;

  await preparePublicPlayerInsert(
    env,
    registrationId,
    period.id,
    record,
  ).run();

  await finalizeRegistrationWrite(request, env, period.id);

  return json({ success: true, registrationId });
}
