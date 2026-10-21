import { getPublicDisplayPeriod } from "../db/periods.js";
import { getRegistrationSettings } from "../db/registrationSettings.js";
import { markPublicSnapshotDirty } from "./publicSnapshotSync.js";
import {
  createStaticShareLink,
  deleteInactiveStaticShareLink,
  listStaticShareLinks,
  revokeStaticShareLink,
} from "./staticShareLinks.js";

import {
  mapContentAccessSetting,
  normalizeMode,
  normalizeResource,
} from "./contentAccessUtils.js";

export {
  CONTENT_ACCESS_MODES,
  CONTENT_ACCESS_RESOURCES,
} from "./contentAccessUtils.js";

function mapPeriod(period) {
  if (!period) {
    return null;
  }

  return {
    id: Number(period.id),
    cycleNumber: period.cycle_number ?? null,
    cycleKey: period.cycle_key ?? null,
    opensAt: period.opens_at ?? null,
    closesAt: period.closes_at ?? null,
    wastelandStartAt: period.wasteland_start_at ?? null,
    wastelandEndAt: period.wasteland_end_at ?? null,
  };
}

export function isContentAccessResource(resource) {
  return Boolean(normalizeResource(resource));
}

export async function getCurrentContentPeriod(env) {
  const settings = await getRegistrationSettings(env);
  return getPublicDisplayPeriod(env, settings);
}

export async function getContentAccessSetting(env, resource) {
  const normalizedResource = normalizeResource(resource);

  if (!normalizedResource) {
    return null;
  }

  let row = await env.DB.prepare(
    `
      SELECT *
      FROM content_access_settings
      WHERE resource = ?
      LIMIT 1
    `,
  )
    .bind(normalizedResource)
    .first();

  if (!row) {
    await env.DB.prepare(
      `
        INSERT OR IGNORE INTO content_access_settings (
          resource,
          mode,
          use_limit,
          session_minutes,
          token_ttl_minutes
        )
        VALUES (?, 'private', 1, 30, 0)
      `,
    )
      .bind(normalizedResource)
      .run();

    row = await env.DB.prepare(
      `SELECT * FROM content_access_settings WHERE resource = ? LIMIT 1`,
    )
      .bind(normalizedResource)
      .first();
  }

  return mapContentAccessSetting(row);
}

export async function getContentAccessSummary(env, resource) {
  const setting = await getContentAccessSetting(env, resource);
  if (!setting) return null;
  const period = await getCurrentContentPeriod(env);
  const staticLinks =
    setting.mode === "link" ? await listStaticShareLinks(env, resource) : [];
  return {
    ...setting,
    staticLinks,
    period: mapPeriod(period),
  };
}

export async function updateContentAccessSetting(env, resource, payload = {}) {
  const normalizedResource = normalizeResource(resource);

  if (!normalizedResource) {
    throw new Error("INVALID_CONTENT_RESOURCE");
  }

  const current = await getContentAccessSetting(env, normalizedResource);
  const next = {
    mode: normalizeMode(payload.mode, current.mode),
    tokenTtlMinutes: Number.isInteger(Number(payload.tokenTtlMinutes))
      ? Math.min(10080, Math.max(0, Number(payload.tokenTtlMinutes)))
      : current.tokenTtlMinutes,
  };

  // Reject unsupported values instead of silently converting a legacy code
  // request to closed mode. Existing DB rows are normalized to closed on read.
  if (
    payload.mode !== undefined &&
    !["public", "private", "link"].includes(payload.mode)
  ) {
    throw new Error("CONTENT_ACCESS_MODE_DISABLED");
  }

  await env.DB.prepare(
    `
      UPDATE content_access_settings
      SET mode = ?, token_ttl_minutes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE resource = ?
    `,
  )
    .bind(next.mode, next.tokenTtlMinutes, normalizedResource)
    .run();

  if (current.mode !== next.mode) {
    // Revoke old access, including all static shares, and request publication
    // of a fresh, mode-specific public snapshot.
    await revokeContentAccess(env, normalizedResource);
  } else if (next.mode === "link") {
    await markPublicSnapshotDirty(env);
  }

  return getContentAccessSummary(env, normalizedResource);
}

export async function generateContentAccessToken(env, resource) {
  const normalizedResource = normalizeResource(resource);
  if (!normalizedResource) throw new Error("INVALID_CONTENT_RESOURCE");
  const setting = await getContentAccessSetting(env, normalizedResource);
  if (!setting || setting.mode !== "link") {
    throw new Error("CONTENT_ACCESS_MODE_HAS_NO_TOKEN");
  }
  const created = await createStaticShareLink(
    env,
    normalizedResource,
    setting.tokenTtlMinutes,
  );
  return {
    ...created,
    summary: await getContentAccessSummary(env, normalizedResource),
  };
}

export async function deleteSingleInactiveStaticLink(env, resource, id) {
  const normalizedResource = normalizeResource(resource);
  if (!normalizedResource) throw new Error("INVALID_CONTENT_RESOURCE");
  await deleteInactiveStaticShareLink(env, normalizedResource, id);
  return getContentAccessSummary(env, normalizedResource);
}

export async function revokeSingleStaticLink(env, resource, id) {
  const normalizedResource = normalizeResource(resource);
  if (!normalizedResource) throw new Error("INVALID_CONTENT_RESOURCE");
  await revokeStaticShareLink(env, normalizedResource, id);
  return getContentAccessSummary(env, normalizedResource);
}

export async function revokeContentAccess(env, resource) {
  const normalizedResource = normalizeResource(resource);

  if (!normalizedResource) {
    return;
  }

  const now = new Date().toISOString();

  await env.DB.batch([
    env.DB.prepare(
      `
        UPDATE content_access_tokens
        SET revoked_at = COALESCE(revoked_at, ?)
        WHERE resource = ?
          AND revoked_at IS NULL
          AND token_hint NOT LIKE 'S:%'
      `,
    ).bind(now, normalizedResource),
    env.DB.prepare(
      `DELETE FROM content_access_sessions WHERE resource = ?`,
    ).bind(normalizedResource),
    env.DB.prepare(
      `UPDATE static_share_links SET revoked_at = COALESCE(revoked_at, ?)
      WHERE resource = ? AND revoked_at IS NULL`,
    ).bind(now, normalizedResource),
  ]);
  await markPublicSnapshotDirty(env);
}

export async function getContentAccessState(_request, env, resource) {
  const setting = await getContentAccessSetting(env, resource);
  const period = await getCurrentContentPeriod(env);
  if (!setting)
    return {
      resource,
      mode: "private",
      allowed: false,
      reason: "INVALID_CONTENT_RESOURCE",
      period: mapPeriod(period),
    };
  // Static share links never create an API session. Only an explicitly public
  // resource can be read over the unauthenticated Worker endpoints.
  return {
    resource,
    mode: setting.mode,
    allowed: setting.mode === "public",
    reason:
      setting.mode === "public"
        ? null
        : setting.mode === "private"
          ? "CONTENT_PRIVATE"
          : "CONTENT_ACCESS_REQUIRED",
    period: mapPeriod(period),
  };
}
