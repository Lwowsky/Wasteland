import { auth } from "../../../config/firebaseAuth.js";
import { requestJson } from "../../../utils/apiClient.js";

async function getAdminToken() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("AUTH_REQUIRED");
  }

  return user.getIdToken();
}

export async function adminRequest(
  path,
  options = {},
  fallbackError = "ADMIN_API_REQUEST_FAILED",
) {
  const token = await getAdminToken();

  return requestJson(
    path,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    },
    fallbackError,
  );
}
