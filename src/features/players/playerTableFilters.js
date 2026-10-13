/** Shared filtering rules for the public and administrative player tables. */
export function normalizePlayerSearch(value) {
  return String(value || "").trim().toLowerCase();
}

export function matchesPlayerSearch(player, normalizedSearch) {
  if (!normalizedSearch) return true;
  return String(player.nickname || "").toLowerCase().includes(normalizedSearch) ||
    String(player.alliance || "").toLowerCase().includes(normalizedSearch);
}

export function matchesPlayerField(player, field, value) {
  return value === "all" || player[field] === value;
}

/** The caller determines whether a player is captain (public: readiness; admin: captain). */
export function matchesCaptainFilter(value, isCaptain) {
  return value === "all" ||
    (value === "yes" && isCaptain === true) ||
    (value === "no" && isCaptain !== true);
}
