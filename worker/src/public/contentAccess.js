import { json } from "../utils/response.js";
import {
  activateContentAccess,
  getContentAccessState,
  isContentAccessResource,
} from "../services/contentAccess.js";

function statusForError(error) {
  const code = String(error?.message || "CONTENT_ACCESS_FAILED");

  if (code === "NO_CURRENT_PERIOD") return 409;
  if (code === "CONTENT_TOKEN_EXHAUSTED") return 410;
  if (code === "CONTENT_TOKEN_EXPIRED") return 410;
  if (code === "CONTENT_TOKEN_INVALID") return 403;
  if (code === "CONTENT_TOKEN_REQUIRED") return 400;
  if (code === "CONTENT_ACCESS_NOT_REQUIRED") return 409;
  if (code === "INVALID_CONTENT_RESOURCE") return 404;

  return 400;
}

export async function handleContentAccessStatus(request, env, resource) {
  if (!isContentAccessResource(resource)) {
    return json({ success: false, error: "INVALID_CONTENT_RESOURCE" }, 404);
  }

  const state = await getContentAccessState(request, env, resource);

  return json({
    success: true,
    ...state,
  });
}

export async function handleContentAccessActivation(request, env) {
  const body = await request.json().catch(() => ({}));
  const resource = String(body.resource || "");

  if (!isContentAccessResource(resource)) {
    return json({ success: false, error: "INVALID_CONTENT_RESOURCE" }, 404);
  }

  try {
    const result = await activateContentAccess(env, resource, body.token);

    return json({
      success: true,
      ...result,
    });
  } catch (error) {
    return json(
      {
        success: false,
        error: String(error?.message || "CONTENT_ACCESS_FAILED"),
      },
      statusForError(error),
    );
  }
}
