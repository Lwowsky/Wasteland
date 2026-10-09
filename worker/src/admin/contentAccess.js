import { verifyAdminRequest } from "../auth/adminAuth.js";
import { clearPublicCaches } from "../utils/cache.js";
import { json } from "../utils/response.js";
import {
  CONTENT_ACCESS_RESOURCES,
  generateContentAccessToken,
  getContentAccessSummary,
  isContentAccessResource,
  revokeContentAccess,
  updateContentAccessSetting,
} from "../services/contentAccess.js";

function canManageContentAccess(admin) {
  return ["owner", "admin"].includes(admin?.role);
}

async function authorize(request, env) {
  const admin = await verifyAdminRequest(request, env);

  if (!admin.ok) {
    return {
      response: json({ success: false, error: admin.error }, admin.status),
      admin: null,
    };
  }

  if (!canManageContentAccess(admin)) {
    return {
      response: json({ success: false, error: "FORBIDDEN" }, 403),
      admin: null,
    };
  }

  return { response: null, admin };
}

function errorResponse(error) {
  const code = String(error?.message || "CONTENT_ACCESS_FAILED");
  const status = code === "NO_CURRENT_PERIOD" ? 409 : 400;

  return json({ success: false, error: code }, status);
}

export async function handleAdminContentAccessGet(request, env) {
  const auth = await authorize(request, env);

  if (auth.response) return auth.response;

  const entries = await Promise.all(
    CONTENT_ACCESS_RESOURCES.map(async (resource) => [
      resource,
      await getContentAccessSummary(env, resource),
    ]),
  );

  return json({
    success: true,
    resources: Object.fromEntries(entries),
  });
}

export async function handleAdminContentAccessPut(
  request,
  env,
  resource,
) {
  const auth = await authorize(request, env);

  if (auth.response) return auth.response;

  if (!isContentAccessResource(resource)) {
    return json({ success: false, error: "INVALID_CONTENT_RESOURCE" }, 404);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const summary = await updateContentAccessSetting(env, resource, body);

    if (resource === "players") {
      await clearPublicCaches(request);
    }

    return json({ success: true, resource: summary });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleAdminContentAccessGenerate(
  request,
  env,
  resource,
) {
  const auth = await authorize(request, env);

  if (auth.response) return auth.response;

  if (!isContentAccessResource(resource)) {
    return json({ success: false, error: "INVALID_CONTENT_RESOURCE" }, 404);
  }

  try {
    const generated = await generateContentAccessToken(env, resource);

    if (resource === "players") {
      await clearPublicCaches(request);
    }

    return json({
      success: true,
      token: generated.token,
      resource: generated.summary,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleAdminContentAccessRevoke(
  request,
  env,
  resource,
) {
  const auth = await authorize(request, env);

  if (auth.response) return auth.response;

  if (!isContentAccessResource(resource)) {
    return json({ success: false, error: "INVALID_CONTENT_RESOURCE" }, 404);
  }

  await revokeContentAccess(env, resource);

  if (resource === "players") {
    await clearPublicCaches(request);
  }

  return json({
    success: true,
    resource: await getContentAccessSummary(env, resource),
  });
}
