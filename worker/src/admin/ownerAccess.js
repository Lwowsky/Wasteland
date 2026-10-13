import { json } from "../utils/response.js";

export function ownerDenied(admin) {
  return json(
    {
      success: false,
      error: admin.ok ? "OWNER_REQUIRED" : admin.error,
    },
    admin.ok ? 403 : admin.status,
  );
}
