import {
  applyRegistrationRulesSnapshot,
  buildRegistrationRulesSnapshot,
  parseRegistrationRulesSnapshot,
} from "../../services/registrationRules.js";

export function getPeriodRules(period, fallbackSettings = {}) {
  return parseRegistrationRulesSnapshot(
    period?.rules_snapshot_json,
    fallbackSettings,
  );
}

export function getEffectiveRegistrationSettings(settings, period) {
  if (!period) {
    return settings;
  }

  return applyRegistrationRulesSnapshot(settings, getPeriodRules(period, settings));
}

export async function updatePeriodRulesSnapshot(
  env,
  periodId,
  settings,
  section = "all",
) {
  if (!periodId) {
    return null;
  }

  const period = await env.DB.prepare(
    `SELECT * FROM registration_periods WHERE id = ? LIMIT 1`,
  )
    .bind(periodId)
    .first();

  if (!period) {
    return null;
  }

  const currentRules = getPeriodRules(period, settings);
  const nextRules = buildRegistrationRulesSnapshot(currentRules);
  const candidateRules = buildRegistrationRulesSnapshot(settings);

  if (section === "shifts") {
    nextRules.availableShifts = candidateRules.availableShifts;
  } else if (section === "tiers") {
    nextRules.availableTiers = candidateRules.availableTiers;
  } else if (section === "formFields") {
    nextRules.visibleFields = candidateRules.visibleFields;
    nextRules.requiredFields = candidateRules.requiredFields;
    nextRules.customFields = candidateRules.customFields;
  } else {
    Object.assign(nextRules, candidateRules);
  }

  await env.DB.prepare(
    `
      UPDATE registration_periods
      SET rules_snapshot_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
  )
    .bind(JSON.stringify(nextRules), periodId)
    .run();

  return nextRules;
}

