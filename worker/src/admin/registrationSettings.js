import { normalizeIso, normalizeText } from "../utils/normalize.js";
import { verifyAdminRequest, adminHasPermission } from "../auth/adminAuth.js";
import {
  ensureCurrentRegistrationPeriod,
  getPeriodRules,
  isPeriodOpen,
  remapPeriodShifts,
  updatePeriodRulesSnapshot,
} from "../db/periods.js";
import {
  getRegistrationSettings,
  saveRegistrationSettings,
} from "../db/registrationSettings.js";
import { rebuildStats } from "../db/stats.js";
import {
  DEFAULT_REGISTRATION_CLOSE_BEFORE_HOURS,
  DEFAULT_REGISTRATION_CLOSE_MODE,
  DEFAULT_REGISTRATION_OPEN_TIME_UTC,
  DEFAULT_REGISTRATION_OPEN_WEEKDAY_UTC,
  DEFAULT_WASTELAND_ANCHOR_ISO,
  DEFAULT_WASTELAND_DURATION_HOURS,
  DEFAULT_WASTELAND_INTERVAL_DAYS,
  getRegistrationCycleSchedule,
} from "../services/registrationCycle.js";
import {
  sanitizeAlliances,
  sanitizeAvailableShifts,
  sanitizeAvailableTiers,
  sanitizeCustomFields,
  sanitizeRequiredFields,
  sanitizeVisibleFields,
} from "../services/registrationRules.js";
import { clearPublicCaches } from "../utils/cache.js";
import { json } from "../utils/response.js";


function sanitizeAllianceRotation(value, alliances) {
  if (!Array.isArray(value)) {
    return alliances.map((alliance) => alliance.tag);
  }

  const allowed = new Set(alliances.map((alliance) => alliance.tag));
  const result = [];

  for (const item of value) {
    const tag = normalizeText(
      typeof item === "string"
        ? item
        : item?.tag ?? item?.allianceTag ?? item?.allianceName,
    ).toUpperCase();

    if (allowed.has(tag) && !result.includes(tag)) {
      result.push(tag);
    }
  }

  for (const alliance of alliances) {
    if (!result.includes(alliance.tag)) {
      result.push(alliance.tag);
    }
  }

  return result;
}

function sanitizeSettings(body, current = {}) {
  const visibleFields = sanitizeVisibleFields(
    body.visibleFields ?? current.visibleFields,
  );
  const requiredFields = sanitizeRequiredFields(
    body.requiredFields ?? current.requiredFields,
    visibleFields,
  );
  const alliances = sanitizeAlliances(body.alliances ?? current.alliances);
  const publicRegistration = Object.prototype.hasOwnProperty.call(
    body,
    "publicRegistration",
  )
    ? body.publicRegistration !== false
    : current.publicRegistration !== false;

  return {
    ...current,
    publicRegistration,
    maxPlayers: Number(current.maxPlayers ?? 300),
    cycleMode: body.cycleMode === "manual" ? "manual" : "automatic",
    wastelandAnchorAt:
      normalizeIso(body.wastelandAnchorAt) ||
      current.wastelandAnchorAt ||
      DEFAULT_WASTELAND_ANCHOR_ISO,
    wastelandIntervalDays: Math.max(
      1,
      Math.min(
        60,
        Number(
          body.wastelandIntervalDays ??
            current.wastelandIntervalDays ??
            DEFAULT_WASTELAND_INTERVAL_DAYS,
        ),
      ),
    ),
    wastelandDurationHours: Math.max(
      1,
      Math.min(
        72,
        Number(
          body.wastelandDurationHours ??
            current.wastelandDurationHours ??
            DEFAULT_WASTELAND_DURATION_HOURS,
        ),
      ),
    ),
    registrationCloseMode:
      body.registrationCloseMode === "hoursBeforeStart"
        ? "hoursBeforeStart"
        : DEFAULT_REGISTRATION_CLOSE_MODE,
    registrationCloseBeforeHours: Math.max(
      1,
      Math.min(
        336,
        Number(
          body.registrationCloseBeforeHours ??
            current.registrationCloseBeforeHours ??
            DEFAULT_REGISTRATION_CLOSE_BEFORE_HOURS,
        ),
      ),
    ),
    registrationOpenWeekdayUtc: Math.min(
      6,
      Math.max(
        0,
        Number(
          body.registrationOpenWeekdayUtc ??
            current.registrationOpenWeekdayUtc ??
            DEFAULT_REGISTRATION_OPEN_WEEKDAY_UTC,
        ),
      ),
    ),
    registrationOpenTimeUtc:
      normalizeText(body.registrationOpenTimeUtc) ||
      current.registrationOpenTimeUtc ||
      DEFAULT_REGISTRATION_OPEN_TIME_UTC,
    manualOpensAt:
      body.cycleMode === "manual"
        ? normalizeIso(
            Object.prototype.hasOwnProperty.call(body, "manualOpensAt")
              ? body.manualOpensAt
              : body.opensAt,
          )
        : "",
    manualClosesAt:
      body.cycleMode === "manual"
        ? normalizeIso(
            Object.prototype.hasOwnProperty.call(body, "manualClosesAt")
              ? body.manualClosesAt
              : body.closesAt,
          )
        : "",
    autoOpenRegistration: body.autoOpenRegistration !== false,
    autoCloseRegistration: body.autoCloseRegistration !== false,
    hostAlliance: normalizeText(body.hostAlliance ?? current.hostAlliance)
      .toUpperCase()
      .slice(0, 3),
    governor: normalizeText(body.governor ?? current.governor),
    captureRegion1: body.captureRegion1 === true,
    captureRegion2: body.captureRegion2 === true,
    availableShifts: sanitizeAvailableShifts(
      body.availableShifts ?? current.availableShifts,
    ),
    availableTiers: sanitizeAvailableTiers(
      body.availableTiers ?? current.availableTiers,
    ),
    visibleFields,
    requiredFields,
    customFields: sanitizeCustomFields(body.customFields ?? current.customFields),
    alliances,
    allianceRotation: sanitizeAllianceRotation(
      body.allianceRotation ?? current.allianceRotation,
      alliances,
    ),
  };
}

function buildResponseSettings(settings, period, schedule) {
  return {
    ...settings,
    periodId: period?.id ?? null,
    cycleNumber: period?.cycle_number ?? null,
    currentPeriodOpen: Boolean(period && isPeriodOpen(period)),
    currentPeriodRules: period ? getPeriodRules(period, settings) : null,
    opensAt: schedule.opensAt,
    closesAt: schedule.closesAt,
    nextWastelandAt: schedule.eventStartAt,
    nextWastelandEndsAt: schedule.eventEndAt,
  };
}

export async function handleAdminRegistrationSettingsGet(request, env) {
  const admin = await verifyAdminRequest(request, env);

  if (!admin.ok) {
    return json({ success: false, error: admin.error }, admin.status);
  }

  const settings = await getRegistrationSettings(env);
  const { period, schedule } = await ensureCurrentRegistrationPeriod(
    env,
    settings,
  );

  return json({
    success: true,
    settings: buildResponseSettings(settings, period, schedule),
  });
}

export async function handleAdminRegistrationSettingsPut(request, env) {
  const admin = await verifyAdminRequest(request, env);

  if (!admin.ok) {
    return json({ success: false, error: admin.error }, admin.status);
  }

  if (!adminHasPermission(admin, "edit_registration_settings")) {
    return json({ success: false, error: "FORBIDDEN" }, 403);
  }

  const body = await request.json();
  const applyToCurrentCycle = body._applyToCurrentCycle === true;
  const applySection = normalizeText(body._applySection);
  const shiftMapping = body._shiftMapping || {};

  const current = await getRegistrationSettings(env);
  const settings = sanitizeSettings(body, current);
  const schedule = getRegistrationCycleSchedule(settings);

  if (!schedule.opensAt || !schedule.closesAt) {
    return json(
      { success: false, error: "INVALID_REGISTRATION_PERIOD" },
      400,
    );
  }

  if (new Date(schedule.closesAt) <= new Date(schedule.opensAt)) {
    return json(
      { success: false, error: "INVALID_REGISTRATION_PERIOD" },
      400,
    );
  }

  await saveRegistrationSettings(env, settings);

  const { period } = await ensureCurrentRegistrationPeriod(env, settings);

  if (applyToCurrentCycle && period && isPeriodOpen(period)) {
    try {
      if (applySection === "shifts") {
        await remapPeriodShifts(
          env,
          period.id,
          shiftMapping,
          settings.availableShifts,
        );
      }

      await updatePeriodRulesSnapshot(
        env,
        period.id,
        settings,
        applySection || "all",
      );

      if (applySection === "shifts") {
        await rebuildStats(env, period.id);
      }
    } catch (error) {
      const message = String(error?.message || "");

      if (message.startsWith("SHIFT_MAPPING_REQUIRED:")) {
        return json(
          {
            success: false,
            error: "SHIFT_MAPPING_REQUIRED",
            shift: message.split(":")[1] || "",
          },
          409,
        );
      }

      throw error;
    }
  }

  const refreshedPeriod = period
    ? await env.DB.prepare(
        `SELECT * FROM registration_periods WHERE id = ? LIMIT 1`,
      )
        .bind(period.id)
        .first()
    : null;

  await clearPublicCaches(request, env);

  return json({
    success: true,
    settings: buildResponseSettings(
      settings,
      refreshedPeriod,
      schedule,
    ),
  });
}
