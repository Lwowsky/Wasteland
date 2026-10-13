function getTimeZoneOffsetLabel(timeZone) {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone,
      timeZoneName: "shortOffset",
      hour: "2-digit",
    }).formatToParts(new Date());
    const value = parts.find((part) => part.type === "timeZoneName")?.value || "";
    return value.replace("GMT", "UTC");
  } catch {
    return "";
  }
}

function formatTimeZoneName(timeZone) {
  return timeZone
    .replaceAll("_", " ")
    .split("/")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .join(" / ");
}

const FALLBACK_TIME_ZONES = [
  "UTC",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/New_York",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Hong_Kong",
  "Asia/Jerusalem",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/Berlin",
  "Europe/Kyiv",
  "Europe/London",
  "Europe/Paris",
  "Pacific/Auckland",
];

function getSupportedTimeZones() {
  try {
    if (typeof Intl.supportedValuesOf === "function") {
      return [...Intl.supportedValuesOf("timeZone"), ...FALLBACK_TIME_ZONES];
    }
  } catch {
    // Ignore and use fallback list.
  }

  return FALLBACK_TIME_ZONES;
}

export function buildTimeZoneOptions(localLabel = "Local device time") {
  const supported = Array.from(new Set(getSupportedTimeZones().filter(Boolean)));
  const canonical = supported.includes("UTC") ? supported : ["UTC", ...supported];

  const zones = canonical
    .filter((zone) => zone !== "UTC")
    .sort((left, right) => formatTimeZoneName(left).localeCompare(formatTimeZoneName(right), "en"))
    .map((zone) => {
      const offset = getTimeZoneOffsetLabel(zone);
      return {
        value: zone,
        label: `${formatTimeZoneName(zone)}${offset ? ` (${offset})` : ""}`,
      };
    });

  return [
    { value: "local", label: localLabel },
    { value: "UTC", label: "UTC" },
    ...zones,
  ];
}
