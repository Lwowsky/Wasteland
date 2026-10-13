import { verifyAdminRequest, adminHasPermission } from "../../auth/adminAuth.js";
import { json } from "../../utils/response.js";
import {
  IMPORT_MODES,
  normalizeNicknameForRegistration,
  normalizeRegistrationBody,
  validateRegistrationBody,
} from "./data.js";
import { getAdminRegistrationPeriod } from "./period.js";
import { executeImportTransaction } from "./importTransaction.js";
import { clearPublicCaches } from "../../utils/cache.js";

export async function handleAdminImportRegistrations(request, env) {
  const admin = await verifyAdminRequest(request, env);
  if (!admin.ok) return json({ success: false, error: admin.error }, admin.status);
  if (!adminHasPermission(admin, "import_players")) {
    return json({ success: false, error: "IMPORT_ACCESS_DENIED" }, 403);
  }

  const period = await getAdminRegistrationPeriod(env);
  if (!period) return json({ success: false, error: "NO_CURRENT_PERIOD" }, 400);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: "INVALID_IMPORT_DATA" }, 400);
  }
  const sourcePlayers = Array.isArray(body?.players) ? body.players : [];
  const mode = String(body?.mode || "skipExisting");
  if (!IMPORT_MODES.has(mode)) {
    return json({ success: false, error: "INVALID_IMPORT_MODE" }, 400);
  }
  if (sourcePlayers.length === 0 || sourcePlayers.length > 500) {
    return json({ success: false, error: "INVALID_IMPORT_SIZE" }, 400);
  }

  const players = sourcePlayers.map(normalizeRegistrationBody);
  const invalidRows = [];
  const seenNicknames = new Set();
  players.forEach((player, index) => {
    const nickname = normalizeNicknameForRegistration(player);
    if (!validateRegistrationBody(player) || !nickname || seenNicknames.has(nickname)) {
      invalidRows.push(index + 1);
    } else {
      seenNicknames.add(nickname);
    }
  });
  if (invalidRows.length > 0) {
    return json({ success: false, error: "INVALID_IMPORT_ROWS", rows: invalidRows }, 400);
  }

  // Protect D1 from accidentally uploading very large custom JSON values.
  const bytes = new TextEncoder().encode(JSON.stringify(players)).byteLength;
  if (bytes > 1024 * 1024) {
    return json({ success: false, error: "IMPORT_PAYLOAD_TOO_LARGE" }, 413);
  }

  // One atomic D1 batch: old data is restored automatically on a failure.
  // The unique nickname index handles concurrent imports safely.
  const result = await executeImportTransaction(env, period.id, players, mode);
  try {
    await clearPublicCaches(request);
  } catch {
    // The transaction has committed. Cache invalidation is best effort and
    // never turns a successful write into a misleading failed-import response.
  }

  const replacing = mode !== "skipExisting";
  return json({
    success: true,
    imported: result.imported,
    skipped: result.skipped,
    replaced: replacing,
    registrationClosed: mode === "replacePeriodAndClose",
    periodId: period.id,
  });
}
