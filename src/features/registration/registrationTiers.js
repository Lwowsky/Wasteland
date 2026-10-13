import { REGISTRATION_TIERS } from "../../../shared/registrationConfig.js";

export { REGISTRATION_TIERS };

export function getEnabledRegistrationTiers(availableTiers) {
  return REGISTRATION_TIERS.filter(
    (tier) => availableTiers?.[tier] === true,
  );
}
