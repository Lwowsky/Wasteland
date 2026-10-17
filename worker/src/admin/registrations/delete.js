import { verifyAdminRequest, adminHasPermission } from "../../auth/adminAuth.js";
import { json } from "../../utils/response.js";
import { finalizeRegistrationWrite } from "./afterWrite.js";
import { findRegistrationById } from "../../db/registrationQueries.js";
import { prepareDeleteRegistrationStatements } from "../../db/registrationWrites.js";

export async function handleAdminDeleteRegistration(
  request,
  env,
  registrationId,
) {
  const admin = await verifyAdminRequest(request, env);

  if (!admin.ok) {
    return json({ success: false, error: admin.error }, admin.status);
  }

  if (!adminHasPermission(admin, "delete_players")) {
    return json({ success: false, error: "FORBIDDEN" }, 403);
  }

  const registration = await findRegistrationById(env, registrationId);

  if (!registration) {
    return json({ success: false, error: "PLAYER_NOT_FOUND" }, 404);
  }

  await env.DB.batch(
    prepareDeleteRegistrationStatements(env, registrationId, registration),
  );
  await finalizeRegistrationWrite(request, env, registration.period_id);

  return json({ success: true });
}
