import { json } from "../utils/response.js";
import { getContentAccessState, isContentAccessResource } from "../services/contentAccess.js";

export async function handleContentAccessStatus(request, env, resource) {
  if (!isContentAccessResource(resource)) {
    return json({ success: false, error: "INVALID_CONTENT_RESOURCE" }, 404);
  }
  return json({ success: true, ...await getContentAccessState(request, env, resource) });
}
