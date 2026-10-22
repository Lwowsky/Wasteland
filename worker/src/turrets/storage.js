import { normalizeCaptureRegion } from "../../../shared/captureRegions.js";

function sqlScope(region) {
  if (!normalizeCaptureRegion(region)) throw new PlanError("INVALID_CAPTURE_REGION");
  return region === "home" ? {
    draft: "turret_plan_drafts", published: "turret_plan_publications", clause: "period_id = ?", bind: (periodId) => [periodId],
    columns: "period_id", values: "?", conflict: "period_id",
  } : {
    draft: "capture_region_plan_drafts", published: "capture_region_plan_publications",
    clause: "period_id = ? AND region_id = ?", bind: (periodId) => [periodId, region],
    columns: "period_id, region_id", values: "?, ?", conflict: "period_id, region_id",
  };
}
import { PlanError } from "./validate.js";

export async function readPlanDraft(env, periodId, region = "home") {
  const t = sqlScope(region);
  const row = await env.DB.prepare(`SELECT revision, settings_json AS settingsJson,
    assignments_json AS assignmentsJson, updated_at AS updatedAt FROM ${t.draft} WHERE ${t.clause}`)
    .bind(...t.bind(periodId)).first();
  return row ? { revision: row.revision, settings: JSON.parse(row.settingsJson),
    assignments: JSON.parse(row.assignmentsJson), updatedAt: row.updatedAt } : null;
}

export async function readPublishedMeta(env, periodId, region = "home") {
  const t = sqlScope(region);
  return await env.DB.prepare(`SELECT publication_revision AS revision,
    source_revision AS sourceRevision, published_at AS publishedAt
    FROM ${t.published} WHERE ${t.clause}`).bind(...t.bind(periodId)).first() || null;
}

export async function readPublishedPlan(env, periodId, includePrivate = false, region = "home") {
  const t = sqlScope(region);
  const columns = includePrivate ? ", settings_json AS settingsJson, assignments_json AS assignmentsJson" : "";
  const row = await env.DB.prepare(`SELECT publication_revision AS publicationRevision,
    source_revision AS sourceRevision, plan_json AS planJson, published_at AS publishedAt ${columns}
    FROM ${t.published} WHERE ${t.clause}`).bind(...t.bind(periodId)).first();
  return row ? {
    revision: row.publicationRevision, sourceRevision: row.sourceRevision,
    publishedAt: row.publishedAt, plan: JSON.parse(row.planJson),
    ...(includePrivate ? { settings: JSON.parse(row.settingsJson), assignments: JSON.parse(row.assignmentsJson) } : {}),
  } : null;
}

export async function upsertDraft(env, periodId, expectedRevision, plan, uid, region = "home") {
  const t = sqlScope(region);
  const current = await env.DB.prepare(`SELECT revision FROM ${t.draft} WHERE ${t.clause}`)
    .bind(...t.bind(periodId)).first();
  if ((current?.revision ?? 0) !== expectedRevision) throw new PlanError("TURRET_DRAFT_CONFLICT", 409);
  const payload = [JSON.stringify(plan.settings), JSON.stringify(plan.assignments), uid];
  const result = !current ? await env.DB.prepare(`INSERT INTO ${t.draft}
    (${t.columns}, revision, settings_json, assignments_json, updated_by)
    VALUES (${t.values}, 1, ?, ?, ?) ON CONFLICT(${t.conflict}) DO NOTHING`)
    .bind(...t.bind(periodId), ...payload).run()
    : await env.DB.prepare(`UPDATE ${t.draft} SET revision = revision + 1,
      settings_json = ?, assignments_json = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE ${t.clause} AND revision = ?`).bind(...payload, ...t.bind(periodId), expectedRevision).run();
  if (result.meta?.changes !== 1) throw new PlanError("TURRET_DRAFT_CONFLICT", 409);
  return readPlanDraft(env, periodId, region);
}

export async function publishDraft(env, periodId, sourceRevision, plan, uid, region = "home") {
  const t = sqlScope(region);
  const result = await env.DB.prepare(`INSERT INTO ${t.published}
    (${t.columns}, publication_revision, source_revision, plan_json, settings_json, assignments_json, published_by)
    SELECT ${t.columns}, 1, revision, ?, ?, ?, ? FROM ${t.draft}
    WHERE ${t.clause} AND revision = ?
    ON CONFLICT(${t.conflict}) DO UPDATE SET
      publication_revision = ${t.published}.publication_revision + 1,
      source_revision = excluded.source_revision, plan_json = excluded.plan_json,
      settings_json = excluded.settings_json, assignments_json = excluded.assignments_json,
      published_by = excluded.published_by, published_at = CURRENT_TIMESTAMP`)
    .bind(JSON.stringify(plan.publicPlan), JSON.stringify(plan.settings), JSON.stringify(plan.assignments), uid,
      ...t.bind(periodId), sourceRevision).run();
  if (result.meta?.changes !== 1) throw new PlanError("TURRET_DRAFT_CONFLICT", 409);
  return readPublishedPlan(env, periodId, false, region);
}

/** Compose display-only published regions, never expose private drafts. */
export async function readPublishedPlanBundle(env, periodId, settings) {
  if (!periodId) return null;
  const [home, r1, r2] = await Promise.all([
    readPublishedPlan(env, periodId),
    settings?.captureRegion1 ? readPublishedPlan(env, periodId, false, "region2") : null,
    settings?.captureRegion2 ? readPublishedPlan(env, periodId, false, "region3") : null,
  ]);
  if (!home && !r1 && !r2) return null;
  const regions = Object.fromEntries([["region2", r1], ["region3", r2]]
    .filter(([, value]) => value).map(([id, value]) => [id, value.plan]));
  return {
    plan: { ...(home?.plan || {}), ...(Object.keys(regions).length ? { __regions: regions } : {}) },
    publishedAt: home?.publishedAt || r1?.publishedAt || r2?.publishedAt || null,
    revision: home?.revision ?? 0,
  };
}
