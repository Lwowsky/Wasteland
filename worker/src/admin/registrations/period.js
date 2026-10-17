import { getAdminWorkingPeriod } from "../../db/periods.js";
import { getRegistrationSettings } from "../../db/registrationSettings.js";

export async function getAdminRegistrationPeriod(env) {
  const settings = await getRegistrationSettings(env);
  return getAdminWorkingPeriod(env, settings);
}

export function toPeriodResponse(period) {
  if (!period) {
    return null;
  }

  return {
    id: period.id,
    createdAt: period.created_at ?? null,
    cycleNumber: period.cycle_number ?? null,
    cycleKey: period.cycle_key ?? null,
    opensAt: period.opens_at ?? null,
    closesAt: period.closes_at ?? null,
    wastelandStartAt: period.wasteland_start_at ?? null,
    wastelandEndAt: period.wasteland_end_at ?? null,
  };
}
