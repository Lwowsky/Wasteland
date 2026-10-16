import { getPublicSnapshot, isPublicSnapshotEnabled } from "../features/players/publicSnapshot.js";

// Only the exact PUBLIC response shapes already exposed by the Worker can be
// read from the static GitHub Pages mirror. Never cache admin responses here.
export function isPublicSiteSettings(value) {
  return Boolean(value?.success === true &&
    value.settings && typeof value.settings === "object" &&
    typeof value.settings.siteName === "string" &&
    Number.isInteger(Number(value.settings.regionNumber)));
}

export function isPublicRegistrationSettings(value) {
  return Boolean(value?.success === true &&
    typeof value.enabled === "boolean" &&
    value.settings && typeof value.settings === "object" &&
    value.period && typeof value.period === "object" &&
    typeof value.period.opensAt === "string" &&
    typeof value.period.closesAt === "string");
}

export async function getStaticPublicSettings(
  file,
  isValid,
  { enabled = isPublicSnapshotEnabled, load = getPublicSnapshot } = {},
) {
  if (!enabled()) return null;

  try {
    // A successful network response is required. An offline localStorage
    // copy is not reliable for time-sensitive registration settings.
    const snapshot = await load(file, { requireNetwork: true });
    return isValid(snapshot) ? snapshot : null;
  } catch {
    // During deployment, CDN delay or outage, use the original Worker API.
    return null;
  }
}
