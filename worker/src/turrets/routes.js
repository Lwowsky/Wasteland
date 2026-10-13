import { verifyAdminRequest, adminHasPermission } from "../auth/adminAuth.js";
import { getAdminWorkingPeriod, getPublicDisplayPeriod } from "../db/periods.js";
import { getRegistrationSettings } from "../db/registrationSettings.js";
import { getRegistrationRows } from "../db/registrationQueries.js";
import { getContentAccessState } from "../services/contentAccess.js";
import { json } from "../utils/response.js";
import { readPlanDraft, readPublishedMeta, readPublishedPlan, publishDraft, upsertDraft } from "./storage.js";
import { createPublicPlan, PlanError, validateTurretDraft } from "./validate.js";
import { getActivePlannerShifts } from "../../../src/features/turrets/plannerShifts.js";

const error = (code, status) => json({ success: false, error: code }, status);
const numberId = (value) => Number.isSafeInteger(value) && value > 0;

async function authorize(request, env, mode = "read") {
  const admin = await verifyAdminRequest(request, env);
  if (!admin.ok) return { failure: error(admin.error, admin.status) };
  const requiredPermission = mode === "publish"
    ? "publish_final_plan"
    : mode === "edit" ? "edit_distribution" : "view_distribution";
  if (!adminHasPermission(admin, requiredPermission)) {
    return { failure: error("FORBIDDEN", 403) };
  }
  const settings = await getRegistrationSettings(env);
  const period = await getAdminWorkingPeriod(env, settings);
  return { admin, period, registrationSettings: settings };
}

async function readBody(request) {
  const raw = await request.text();
  if (raw.length > 200_000) throw new PlanError("TURRET_PAYLOAD_TOO_LARGE", 413);
  try { return JSON.parse(raw); }
  catch { throw new PlanError("INVALID_TURRET_DRAFT"); }
}

function assertPeriod(body, period) {
  if (!period || !numberId(body?.periodId) || body.periodId !== Number(period.id)) {
    throw new PlanError("TURRET_PERIOD_CHANGED", 409);
  }
}

function expectedRevision(body) {
  if (!Number.isSafeInteger(body?.revision) || body.revision < 0) {
    throw new PlanError("INVALID_TURRET_REVISION");
  }
  return body.revision;
}

function handleFailure(e) {
  if (!(e instanceof PlanError)) console.error("Turret plan:", e);
  return error(e instanceof PlanError ? e.message : "TURRET_PLAN_SERVER_ERROR",
    e instanceof PlanError ? e.status : 500);
}

export async function handleAdminTurretPlanGet(request, env) {
  const { failure, period } = await authorize(request, env);
  if (failure) return failure;
  if (!period) return json({ success: true, periodId: null, draft: null, published: null });
  const [draft, published] = await Promise.all([
    readPlanDraft(env, period.id), readPublishedMeta(env, period.id),
  ]);
  return json({ success: true, periodId: period.id, draft,
    published: published ? { revision: published.revision, sourceRevision: published.sourceRevision,
      publishedAt: published.publishedAt } : null }, 200, { "Cache-Control": "no-store" });
}

export async function handleAdminTurretDraftPut(request, env) {
  const { failure, admin, period } = await authorize(request, env, "edit");
  if (failure) return failure;
  try {
    const body = await readBody(request);
    assertPeriod(body, period);
    const revision = expectedRevision(body);
    const players = await getRegistrationRows(env, period.id);
    const valid = validateTurretDraft(body.settings, body.assignments, players);
    const draft = await upsertDraft(env, period.id, revision, valid, admin.uid);
    return json({ success: true, draft }, 200, { "Cache-Control": "no-store" });
  } catch (e) { return handleFailure(e); }
}

export async function handleAdminTurretPublish(request, env) {
  const { failure, admin, period, registrationSettings } = await authorize(request, env, "publish");
  if (failure) return failure;
  try {
    const body = await readBody(request);
    assertPeriod(body, period);
    const revision = expectedRevision(body);
    const draft = await readPlanDraft(env, period.id);
    if (!draft || draft.revision !== revision) throw new PlanError("TURRET_DRAFT_CONFLICT", 409);
    const players = await getRegistrationRows(env, period.id);
    const validated = validateTurretDraft(draft.settings, draft.assignments, players);
    if (validated.count === 0) throw new PlanError("TURRET_PLAN_EMPTY");
    const published = await publishDraft(env, period.id, revision, {
      ...validated, publicPlan: createPublicPlan(validated.assignments, players,
        getActivePlannerShifts(registrationSettings.availableShifts), validated.settings.planLanguages),
    }, admin.uid);
    return json({ success: true, published: {
      revision: published.revision, sourceRevision: published.sourceRevision,
      publishedAt: published.publishedAt,
    } }, 200, { "Cache-Control": "no-store" });
  } catch (e) { return handleFailure(e); }
}

export async function handleAdminTurretRestore(request, env) {
  const { failure, admin, period } = await authorize(request, env, "publish");
  if (failure) return failure;
  try {
    const body = await readBody(request);
    assertPeriod(body, period);
    const revision = expectedRevision(body);
    const published = await readPublishedPlan(env, period.id, true);
    if (!published) throw new PlanError("TURRET_NO_PUBLICATION", 404);
    const players = await getRegistrationRows(env, period.id);
    const validated = validateTurretDraft(published.settings, published.assignments, players);
    const draft = await upsertDraft(env, period.id, revision, validated, admin.uid);
    return json({ success: true, draft }, 200, { "Cache-Control": "no-store" });
  } catch (e) { return handleFailure(e); }
}

export async function handlePublicFinalPlan(request, env) {
  const access = await getContentAccessState(request, env, "final_plan");
  if (!access.allowed) return error(access.reason || "CONTENT_ACCESS_REQUIRED", 403);
  const settings = await getRegistrationSettings(env);
  const period = await getPublicDisplayPeriod(env, settings);
  const published = period ? await readPublishedPlan(env, period.id) : null;
  return json({ success: true, periodId: period?.id ?? null,
    plan: published?.plan ?? null,
    publishedAt: published?.publishedAt ?? null,
    revision: published?.revision ?? null,
  }, 200, { "Cache-Control": "no-store" });
}
