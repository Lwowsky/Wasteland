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
  clampInteger,
  generateAccessCode,
  generateSessionToken,
  getContentAccessSessionHeader,
  getTokenExpiryIso,
  mapContentAccessSetting,
  mapContentAccessToken,
  normalizeCodeCandidate,
  normalizeMode,
  normalizeResource,
  sha256,
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

async function getCurrentToken(env, resource, periodId) {
  if (!periodId) {
    return null;
  }

  return env.DB.prepare(
    `
      SELECT *
      FROM content_access_tokens
      WHERE resource = ?
        AND period_id = ?
        AND revoked_at IS NULL
      ORDER BY id DESC
      LIMIT 1
    `,
  )
    .bind(resource, periodId)
    .first();
}

export async function getContentAccessSummary(env, resource) {
  const setting = await getContentAccessSetting(env, resource);
  const period = await getCurrentContentPeriod(env);
  const token = period
    ? await getCurrentToken(env, resource, period.id)
    : null;

  const tokenSummary = mapContentAccessToken(token);

  const staticLinks = setting.mode === "link"
    ? await listStaticShareLinks(env, resource) : [];
  return {
    ...setting,
    staticLinks,
    period: mapPeriod(period),
    token: tokenSummary,
    tokenRequired:
      ["code", "link"].includes(setting?.mode) && !tokenSummary?.active,
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
    useLimit: clampInteger(payload.useLimit, current.useLimit, 0, 1000),
    sessionMinutes: clampInteger(
      payload.sessionMinutes,
      current.sessionMinutes,
      5,
      1440,
    ),
    tokenTtlMinutes: clampInteger(
      payload.tokenTtlMinutes,
      current.tokenTtlMinutes,
      0,
      10080,
    ),
  };

  // Public viewing is intentionally supported alongside link-only and closed.
  // Legacy one-time code mode stays read-only for compatibility.
  if (!["public", "private", "link"].includes(next.mode)) {
    throw new Error("CONTENT_ACCESS_MODE_DISABLED");
  }

  await env.DB.prepare(
    `
      UPDATE content_access_settings
      SET
        mode = ?,
        use_limit = ?,
        session_minutes = ?,
        token_ttl_minutes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE resource = ?
    `,
  )
    .bind(
      next.mode,
      next.useLimit,
      next.sessionMinutes,
      next.tokenTtlMinutes,
      normalizedResource,
    )
    .run();

  const period = await getCurrentContentPeriod(env);

  if (current.mode !== next.mode) {
    // This revokes previously granted private links/sessions and marks the
    // public JSON revision dirty. Avoid a redundant second D1 update.
    await revokeContentAccess(env, normalizedResource);
  } else if (period && ["code", "link"].includes(next.mode)) {
    const expiresAt = getTokenExpiryIso(next.tokenTtlMinutes);

    await env.DB.prepare(
      `
        UPDATE content_access_tokens
        SET use_limit = ?, expires_at = ?
        WHERE resource = ?
          AND period_id = ?
          AND revoked_at IS NULL
          AND token_hint NOT LIKE 'S:%'
      `,
    )
      .bind(next.useLimit, expiresAt, normalizedResource, period.id)
      .run();
  }

  if (next.mode === "link" && current.mode === "link") await markPublicSnapshotDirty(env);
  return getContentAccessSummary(env, normalizedResource);
}

export async function generateContentAccessToken(env, resource) {
  const setting = await getContentAccessSetting(env, resource);

  if (!setting || !["code", "link"].includes(setting.mode)) {
    throw new Error("CONTENT_ACCESS_MODE_HAS_NO_TOKEN");
  }

  const period = await getCurrentContentPeriod(env);
  if (!period && setting.mode === "code") {
    throw new Error("NO_CURRENT_PERIOD");
  }

  if (setting.mode === "code") await revokeContentAccess(env, resource);

  if (setting.mode === "link") {
    const created = await createStaticShareLink(env, resource, setting.tokenTtlMinutes);
    return { ...created, summary: await getContentAccessSummary(env, resource) };
  }

  const token = generateAccessCode();
  const tokenHash = await sha256(token);
  const tokenHint = token.slice(-4);
  const expiresAt = getTokenExpiryIso(setting.tokenTtlMinutes);

  const result = await env.DB.prepare(
    `
      INSERT INTO content_access_tokens (
        resource,
        period_id,
        token_kind,
        token_hash,
        token_hint,
        use_limit,
        expires_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
  )
    .bind(
      resource,
      period.id,
      setting.mode,
      tokenHash,
      tokenHint,
      setting.useLimit,
      expiresAt,
    )
    .run();

  return {
    token,
    tokenId: Number(result.meta.last_row_id),
    summary: await getContentAccessSummary(env, resource),
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
    env.DB.prepare(`UPDATE static_share_links SET revoked_at = COALESCE(revoked_at, ?)
      WHERE resource = ? AND revoked_at IS NULL`).bind(now, normalizedResource),
  ]);
  await markPublicSnapshotDirty(env);
}

async function hasValidSession(request, env, resource, periodId) {
  const session = getContentAccessSessionHeader(request);

  if (!session || !periodId) {
    return false;
  }

  const sessionHash = await sha256(session);
  const now = new Date().toISOString();

  const row = await env.DB.prepare(
    `
      SELECT id
      FROM content_access_sessions
      WHERE resource = ?
        AND period_id = ?
        AND session_hash = ?
        AND expires_at > ?
      LIMIT 1
    `,
  )
    .bind(resource, periodId, sessionHash, now)
    .first();

  return Boolean(row);
}

export async function getContentAccessState(request, env, resource) {
  const setting = await getContentAccessSetting(env, resource);
  const period = await getCurrentContentPeriod(env);

  if (!setting) {
    return {
      resource,
      mode: "private",
      allowed: false,
      reason: "INVALID_CONTENT_RESOURCE",
      period: mapPeriod(period),
    };
  }

  if (setting.mode === "public") {
    return {
      resource,
      mode: setting.mode,
      allowed: true,
      reason: null,
      period: mapPeriod(period),
    };
  }

  if (setting.mode === "private") {
    return {
      resource,
      mode: setting.mode,
      allowed: false,
      reason: "CONTENT_PRIVATE",
      period: mapPeriod(period),
    };
  }

  if (!period) {
    return {
      resource,
      mode: setting.mode,
      allowed: false,
      reason: "NO_CURRENT_PERIOD",
      period: null,
    };
  }

  const allowed = await hasValidSession(request, env, resource, period.id);

  return {
    resource,
    mode: setting.mode,
    allowed,
    reason: allowed ? null : "CONTENT_ACCESS_REQUIRED",
    period: mapPeriod(period),
  };
}

export async function activateContentAccess(env, resource, rawToken) {
  const normalizedResource = normalizeResource(resource);
  const setting = await getContentAccessSetting(env, normalizedResource);

  if (!normalizedResource || !setting) {
    throw new Error("INVALID_CONTENT_RESOURCE");
  }

  if (!["code", "link"].includes(setting.mode)) {
    throw new Error("CONTENT_ACCESS_NOT_REQUIRED");
  }

  const period = await getCurrentContentPeriod(env);

  if (!period) {
    throw new Error("NO_CURRENT_PERIOD");
  }

  const raw = String(rawToken || "").trim();

  if (!raw) {
    throw new Error("CONTENT_TOKEN_REQUIRED");
  }

  const rawHash = await sha256(raw);
  const normalizedCodeHash = await sha256(normalizeCodeCandidate(raw));
  const now = new Date().toISOString();

  const tokenRow = await env.DB.prepare(
    `
      SELECT *
      FROM content_access_tokens
      WHERE resource = ?
        AND period_id = ?
        AND token_kind = ?
        AND revoked_at IS NULL
        AND token_hash IN (?, ?)
      ORDER BY id DESC
      LIMIT 1
    `,
  )
    .bind(
      normalizedResource,
      period.id,
      setting.mode,
      rawHash,
      normalizedCodeHash,
    )
    .first();

  if (!tokenRow) {
    throw new Error("CONTENT_TOKEN_INVALID");
  }

  if (tokenRow.expires_at && tokenRow.expires_at <= now) {
    throw new Error("CONTENT_TOKEN_EXPIRED");
  }

  const useLimit = Number(tokenRow.use_limit || 0);

  if (useLimit > 0 && Number(tokenRow.used_count || 0) >= useLimit) {
    throw new Error("CONTENT_TOKEN_EXHAUSTED");
  }

  const update = await env.DB.prepare(
    `
      UPDATE content_access_tokens
      SET used_count = used_count + 1
      WHERE id = ?
        AND revoked_at IS NULL
        AND (use_limit = 0 OR used_count < use_limit)
    `,
  )
    .bind(tokenRow.id)
    .run();

  if (Number(update.meta?.changes || 0) !== 1) {
    throw new Error("CONTENT_TOKEN_EXHAUSTED");
  }

  const session = generateSessionToken();
  const sessionHash = await sha256(session);
  const sessionExpiresAt = new Date(
    Date.now() + setting.sessionMinutes * 60_000,
  ).toISOString();

  await env.DB.prepare(
    `
      INSERT INTO content_access_sessions (
        token_id,
        resource,
        period_id,
        session_hash,
        expires_at
      )
      VALUES (?, ?, ?, ?, ?)
    `,
  )
    .bind(
      tokenRow.id,
      normalizedResource,
      period.id,
      sessionHash,
      sessionExpiresAt,
    )
    .run();

  return {
    session,
    expiresAt: sessionExpiresAt,
    resource: normalizedResource,
    period: mapPeriod(period),
  };
}
