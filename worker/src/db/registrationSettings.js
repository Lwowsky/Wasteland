import { normalizeIso, normalizeText } from "../utils/normalize.js";
import { DEFAULT_REGISTRATION_CYCLE_SETTINGS } from "../../../shared/registrationConfig.js";
import {
  DEFAULT_AVAILABLE_SHIFTS,
  DEFAULT_AVAILABLE_TIERS,
  DEFAULT_REQUIRED_FIELDS,
  DEFAULT_VISIBLE_FIELDS,
  parseJsonArray,
  parseJsonObject,
  sanitizeAlliances,
  sanitizeAvailableShifts,
  sanitizeAvailableTiers,
  sanitizeCustomFields,
  sanitizeRequiredFields,
  sanitizeVisibleFields,
} from "../services/registrationRules.js";

const DEFAULT_SETTINGS = {
  publicRegistration: true,
  maxPlayers: 300,
  ...DEFAULT_REGISTRATION_CYCLE_SETTINGS,
  manualOpensAt: "",
  manualClosesAt: "",
  hostAlliance: "",
  governor: "",
  captureRegion1: false,
  captureRegion2: false,
  alliances: [],
  allianceRotation: [],
  availableShifts: DEFAULT_AVAILABLE_SHIFTS,
  availableTiers: DEFAULT_AVAILABLE_TIERS,
  visibleFields: DEFAULT_VISIBLE_FIELDS,
  requiredFields: DEFAULT_REQUIRED_FIELDS,
  customFields: [],
};

export function createDefaultRegistrationSettings() {
  return {
    ...DEFAULT_SETTINGS,
    alliances: [],
    allianceRotation: [],
    availableShifts: { ...DEFAULT_AVAILABLE_SHIFTS },
    availableTiers: { ...DEFAULT_AVAILABLE_TIERS },
    visibleFields: { ...DEFAULT_VISIBLE_FIELDS },
    requiredFields: { ...DEFAULT_REQUIRED_FIELDS },
    customFields: [],
  };
}

function toBool(value) {
  return value === 1 || value === true;
}


export async function getAllianceRotation(env) {
  const result = await env.DB.prepare(
    `
      SELECT alliance_name AS allianceName
      FROM alliance_rotation
      WHERE active = 1
      ORDER BY position ASC, id ASC
    `,
  ).all();

  return result.results
    .map((row) => normalizeText(row.allianceName).toUpperCase())
    .filter(Boolean);
}

export async function saveAllianceRotation(env, rotation = []) {
  const cleanRotation = Array.isArray(rotation)
    ? [...new Set(rotation.map((item) => normalizeText(
        typeof item === "string"
          ? item
          : item?.tag ?? item?.allianceTag ?? item?.allianceName,
      ).toUpperCase()).filter(Boolean))]
    : [];

  const statements = [env.DB.prepare(`DELETE FROM alliance_rotation`)];

  cleanRotation.forEach((tag, position) => {
    statements.push(
      env.DB.prepare(
        `
          INSERT INTO alliance_rotation (
            alliance_name,
            position,
            active,
            updated_at
          )
          VALUES (?, ?, 1, CURRENT_TIMESTAMP)
        `,
      ).bind(tag, position),
    );
  });

  await env.DB.batch(statements);
}

export async function getRegistrationSettings(env) {
  const row = await env.DB.prepare(
    `
      SELECT
        public_registration AS publicRegistration,
        max_players AS maxPlayers,
        cycle_mode AS cycleMode,
        wasteland_anchor_at AS wastelandAnchorAt,
        wasteland_interval_days AS wastelandIntervalDays,
        wasteland_duration_hours AS wastelandDurationHours,
        registration_close_mode AS registrationCloseMode,
        registration_close_before_hours AS registrationCloseBeforeHours,
        registration_open_weekday_utc AS registrationOpenWeekdayUtc,
        registration_open_time_utc AS registrationOpenTimeUtc,
        manual_opens_at AS manualOpensAt,
        manual_closes_at AS manualClosesAt,
        auto_open_registration AS autoOpenRegistration,
        auto_close_registration AS autoCloseRegistration,
        host_alliance AS hostAlliance,
        governor,
        capture_region_1 AS captureRegion1,
        capture_region_2 AS captureRegion2,
        allow_shift_1 AS allowShift1,
        allow_shift_2 AS allowShift2,
        allow_shift_3 AS allowShift3,
        allow_shift_4 AS allowShift4,
        allow_shift_flexible AS allowShiftFlexible,
        available_tiers_json AS availableTiersJson,
        visible_fields_json AS visibleFieldsJson,
        required_fields_json AS requiredFieldsJson,
        custom_fields_json AS customFieldsJson,
        alliances_json AS alliancesJson,
        updated_at AS updatedAt
      FROM registration_settings
      WHERE id = 1
      LIMIT 1
    `,
  ).first();

  const allianceRotation = await getAllianceRotation(env);

  if (!row) {
    return {
      ...createDefaultRegistrationSettings(),
      allianceRotation,
      updatedAt: null,
    };
  }

  const visibleFields = sanitizeVisibleFields(
    parseJsonObject(row.visibleFieldsJson, DEFAULT_VISIBLE_FIELDS),
  );
  const requiredFields = sanitizeRequiredFields(
    parseJsonObject(row.requiredFieldsJson, DEFAULT_REQUIRED_FIELDS),
    visibleFields,
  );

  return {
    publicRegistration: toBool(row.publicRegistration),
    maxPlayers: Number(row.maxPlayers ?? DEFAULT_SETTINGS.maxPlayers),
    cycleMode: row.cycleMode === "manual" ? "manual" : "automatic",
    wastelandAnchorAt:
      normalizeIso(row.wastelandAnchorAt) || DEFAULT_SETTINGS.wastelandAnchorAt,
    wastelandIntervalDays: Number(
      row.wastelandIntervalDays ?? DEFAULT_SETTINGS.wastelandIntervalDays,
    ),
    wastelandDurationHours: Number(
      row.wastelandDurationHours ?? DEFAULT_SETTINGS.wastelandDurationHours,
    ),
    registrationCloseMode:
      row.registrationCloseMode === "hoursBeforeStart"
        ? "hoursBeforeStart"
        : "gameDayReset",
    registrationCloseBeforeHours: Number(
      row.registrationCloseBeforeHours ??
        DEFAULT_SETTINGS.registrationCloseBeforeHours,
    ),
    registrationOpenWeekdayUtc: Number(
      row.registrationOpenWeekdayUtc ??
        DEFAULT_SETTINGS.registrationOpenWeekdayUtc,
    ),
    registrationOpenTimeUtc:
      normalizeText(row.registrationOpenTimeUtc) ||
      DEFAULT_SETTINGS.registrationOpenTimeUtc,
    manualOpensAt: normalizeIso(row.manualOpensAt),
    manualClosesAt: normalizeIso(row.manualClosesAt),
    autoOpenRegistration: toBool(row.autoOpenRegistration),
    autoCloseRegistration: toBool(row.autoCloseRegistration),
    hostAlliance: normalizeText(row.hostAlliance).toUpperCase(),
    governor: normalizeText(row.governor),
    captureRegion1: toBool(row.captureRegion1),
    captureRegion2: toBool(row.captureRegion2),
    alliances: sanitizeAlliances(parseJsonArray(row.alliancesJson)),
    allianceRotation,
    availableShifts: sanitizeAvailableShifts({
      shift1: toBool(row.allowShift1),
      shift2: toBool(row.allowShift2),
      shift3: toBool(row.allowShift3),
      shift4: toBool(row.allowShift4),
      flexible: toBool(row.allowShiftFlexible),
    }),
    availableTiers: sanitizeAvailableTiers(
      parseJsonObject(row.availableTiersJson, DEFAULT_AVAILABLE_TIERS),
    ),
    visibleFields,
    requiredFields,
    customFields: sanitizeCustomFields(parseJsonArray(row.customFieldsJson)),
    updatedAt: row.updatedAt || null,
  };
}

export async function saveRegistrationSettings(env, settings) {
  const visibleFields = sanitizeVisibleFields(settings.visibleFields);
  const requiredFields = sanitizeRequiredFields(
    settings.requiredFields,
    visibleFields,
  );
  const availableTiers = sanitizeAvailableTiers(settings.availableTiers);
  const customFields = sanitizeCustomFields(settings.customFields);
  const alliances = sanitizeAlliances(settings.alliances);

  await env.DB.prepare(
    `
      INSERT INTO registration_settings (
        id,
        public_registration,
        max_players,
        cycle_mode,
        wasteland_anchor_at,
        wasteland_interval_days,
        wasteland_duration_hours,
        registration_close_mode,
        registration_close_before_hours,
        registration_open_weekday_utc,
        registration_open_time_utc,
        manual_opens_at,
        manual_closes_at,
        auto_open_registration,
        auto_close_registration,
        host_alliance,
        governor,
        capture_region_1,
        capture_region_2,
        allow_shift_1,
        allow_shift_2,
        allow_shift_3,
        allow_shift_4,
        allow_shift_flexible,
        available_tiers_json,
        visible_fields_json,
        required_fields_json,
        custom_fields_json,
        alliances_json,
        updated_at
      )
      VALUES (
        1,
        ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT(id) DO UPDATE SET
        public_registration = excluded.public_registration,
        max_players = excluded.max_players,
        cycle_mode = excluded.cycle_mode,
        wasteland_anchor_at = excluded.wasteland_anchor_at,
        wasteland_interval_days = excluded.wasteland_interval_days,
        wasteland_duration_hours = excluded.wasteland_duration_hours,
        registration_close_mode = excluded.registration_close_mode,
        registration_close_before_hours = excluded.registration_close_before_hours,
        registration_open_weekday_utc = excluded.registration_open_weekday_utc,
        registration_open_time_utc = excluded.registration_open_time_utc,
        manual_opens_at = excluded.manual_opens_at,
        manual_closes_at = excluded.manual_closes_at,
        auto_open_registration = excluded.auto_open_registration,
        auto_close_registration = excluded.auto_close_registration,
        host_alliance = excluded.host_alliance,
        governor = excluded.governor,
        capture_region_1 = excluded.capture_region_1,
        capture_region_2 = excluded.capture_region_2,
        allow_shift_1 = excluded.allow_shift_1,
        allow_shift_2 = excluded.allow_shift_2,
        allow_shift_3 = excluded.allow_shift_3,
        allow_shift_4 = excluded.allow_shift_4,
        allow_shift_flexible = excluded.allow_shift_flexible,
        available_tiers_json = excluded.available_tiers_json,
        visible_fields_json = excluded.visible_fields_json,
        required_fields_json = excluded.required_fields_json,
        custom_fields_json = excluded.custom_fields_json,
        alliances_json = excluded.alliances_json,
        updated_at = CURRENT_TIMESTAMP
    `,
  )
    .bind(
      settings.publicRegistration === false ? 0 : 1,
      Number(settings.maxPlayers ?? DEFAULT_SETTINGS.maxPlayers),
      settings.cycleMode === "manual" ? "manual" : "automatic",
      normalizeIso(settings.wastelandAnchorAt) || DEFAULT_SETTINGS.wastelandAnchorAt,
      Number(settings.wastelandIntervalDays || DEFAULT_SETTINGS.wastelandIntervalDays),
      Number(settings.wastelandDurationHours || DEFAULT_SETTINGS.wastelandDurationHours),
      settings.registrationCloseMode === "hoursBeforeStart"
        ? "hoursBeforeStart"
        : "gameDayReset",
      Number(
        settings.registrationCloseBeforeHours ||
          DEFAULT_SETTINGS.registrationCloseBeforeHours,
      ),
      Number.isFinite(Number(settings.registrationOpenWeekdayUtc))
        ? Number(settings.registrationOpenWeekdayUtc)
        : DEFAULT_SETTINGS.registrationOpenWeekdayUtc,
      normalizeText(settings.registrationOpenTimeUtc) ||
        DEFAULT_SETTINGS.registrationOpenTimeUtc,
      normalizeIso(settings.manualOpensAt),
      normalizeIso(settings.manualClosesAt),
      settings.autoOpenRegistration !== false ? 1 : 0,
      settings.autoCloseRegistration !== false ? 1 : 0,
      normalizeText(settings.hostAlliance).toUpperCase(),
      normalizeText(settings.governor),
      settings.captureRegion1 ? 1 : 0,
      settings.captureRegion2 ? 1 : 0,
      settings.availableShifts?.shift1 ? 1 : 0,
      settings.availableShifts?.shift2 ? 1 : 0,
      settings.availableShifts?.shift3 ? 1 : 0,
      settings.availableShifts?.shift4 ? 1 : 0,
      settings.availableShifts?.flexible ? 1 : 0,
      JSON.stringify(availableTiers),
      JSON.stringify(visibleFields),
      JSON.stringify(requiredFields),
      JSON.stringify(customFields),
      JSON.stringify(alliances),
    )
    .run();

  await saveAllianceRotation(env, settings.allianceRotation || []);
}
