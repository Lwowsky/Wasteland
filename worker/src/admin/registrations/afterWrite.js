import { clearPublicCaches } from "../../utils/cache.js";

export async function finalizeRegistrationWrite(request, env) {
  await clearPublicCaches(request, env);
}
