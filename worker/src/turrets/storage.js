import { PlanError } from "./validate.js";

export async function readPlanDraft(env, periodId) {
  const row = await env.DB.prepare(
    `SELECT revision, settings_json AS settingsJson, assignments_json AS assignmentsJson,
       updated_at AS updatedAt FROM turret_plan_drafts WHERE period_id = ?`,
  ).bind(periodId).first();
  return row ? {
    revision: row.revision,
    settings: JSON.parse(row.settingsJson),
    assignments: JSON.parse(row.assignmentsJson),
    updatedAt: row.updatedAt,
  } : null;
}

export async function readPublishedMeta(env, periodId) {
  const row = await env.DB.prepare(`SELECT publication_revision AS revision,
    source_revision AS sourceRevision, published_at AS publishedAt
    FROM turret_plan_publications WHERE period_id = ?`).bind(periodId).first();
  return row || null;
}

export async function readPublishedPlan(env, periodId, includePrivate = false) {
  const columns = includePrivate ? ", settings_json AS settingsJson, assignments_json AS assignmentsJson" : "";
  const row = await env.DB.prepare(
    `SELECT publication_revision AS publicationRevision, source_revision AS sourceRevision,
       plan_json AS planJson, published_at AS publishedAt ${columns}
     FROM turret_plan_publications WHERE period_id = ?`,
  ).bind(periodId).first();
  if (!row) return null;
  return {
    revision: row.publicationRevision,
    sourceRevision: row.sourceRevision,
    publishedAt: row.publishedAt,
    plan: JSON.parse(row.planJson),
    ...(includePrivate ? {
      settings: JSON.parse(row.settingsJson),
      assignments: JSON.parse(row.assignmentsJson),
    } : {}),
  };
}

export async function upsertDraft(env, periodId, expectedRevision, plan, uid) {
  const current = await env.DB.prepare(`SELECT revision FROM turret_plan_drafts WHERE period_id = ?`)
    .bind(periodId).first();
  if ((current?.revision ?? 0) !== expectedRevision) throw new PlanError("TURRET_DRAFT_CONFLICT", 409);
  const payload = [JSON.stringify(plan.settings), JSON.stringify(plan.assignments), uid];
  let result;
  if (!current) {
    result = await env.DB.prepare(`INSERT INTO turret_plan_drafts
      (period_id, revision, settings_json, assignments_json, updated_by)
      VALUES (?, 1, ?, ?, ?) ON CONFLICT(period_id) DO NOTHING`)
      .bind(periodId, ...payload).run();
  } else {
    result = await env.DB.prepare(`UPDATE turret_plan_drafts SET revision = revision + 1,
      settings_json = ?, assignments_json = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE period_id = ? AND revision = ?`).bind(...payload, periodId, expectedRevision).run();
  }
  if (result.meta?.changes !== 1) throw new PlanError("TURRET_DRAFT_CONFLICT", 409);
  return readPlanDraft(env, periodId);
}

export async function publishDraft(env, periodId, sourceRevision, plan, uid) {
  // Atomic compare against the source draft revision; a concurrent edit cannot be published accidentally.
  const result = await env.DB.prepare(`INSERT INTO turret_plan_publications
    (period_id, publication_revision, source_revision, plan_json, settings_json,
     assignments_json, published_by)
    SELECT period_id, 1, revision, ?, ?, ?, ? FROM turret_plan_drafts
    WHERE period_id = ? AND revision = ?
    ON CONFLICT(period_id) DO UPDATE SET
      publication_revision = turret_plan_publications.publication_revision + 1,
      source_revision = excluded.source_revision, plan_json = excluded.plan_json,
      settings_json = excluded.settings_json, assignments_json = excluded.assignments_json,
      published_by = excluded.published_by, published_at = CURRENT_TIMESTAMP`)
    .bind(JSON.stringify(plan.publicPlan), JSON.stringify(plan.settings),
      JSON.stringify(plan.assignments), uid, periodId, sourceRevision).run();
  if (result.meta?.changes !== 1) throw new PlanError("TURRET_DRAFT_CONFLICT", 409);
  return readPublishedPlan(env, periodId);
}
