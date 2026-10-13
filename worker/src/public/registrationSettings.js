import {
  ensureCurrentRegistrationPeriod,
  getEffectiveRegistrationSettings,
  isPeriodOpen,
} from "../db/periods.js";
import { getRegistrationSettings } from "../db/registrationSettings.js";
import { json } from "../utils/response.js";

export async function handlePublicRegistrationSettings(env) {
  const globalSettings = await getRegistrationSettings(env);
  const { period, schedule } = await ensureCurrentRegistrationPeriod(
    env,
    globalSettings,
  );
  const settings = getEffectiveRegistrationSettings(globalSettings, period);

  const registered = period
    ? await env.DB.prepare(
        `
          SELECT registered
          FROM stats
          WHERE period_id = ?
          LIMIT 1
        `,
      )
        .bind(period.id)
        .first()
    : null;

  const registeredCount = Number(registered?.registered ?? 0);
  const enabled = Boolean(period && isPeriodOpen(period));

  return json({
    success: true,
    enabled,
    reason: enabled ? null : "REGISTRATION_CLOSED",
    registered: registeredCount,
    remaining: null,
    period: {
      id: period?.id ?? null,
      cycleNumber: period?.cycle_number ?? null,
      opensAt: schedule.opensAt,
      closesAt: schedule.closesAt,
      wastelandStartsAt: schedule.eventStartAt,
      wastelandEndsAt: schedule.eventEndAt,
    },
    settings: {
      ...settings,
      opensAt: schedule.opensAt,
      closesAt: schedule.closesAt,
      nextWastelandAt: schedule.eventStartAt,
      nextWastelandEndsAt: schedule.eventEndAt,
    },
  });
}
