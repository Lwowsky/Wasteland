// Match the legacy site ids. Every region owns the same five towers and 1-4 shifts.
export const CAPTURE_REGIONS = ["home", "region2", "region3"];
export function normalizeCaptureRegion(region) {
  return CAPTURE_REGIONS.includes(region) ? region : null;
}
export function isCaptureRegionEnabled(settings, region) {
  return region === "home" || (region === "region2" && settings?.captureRegion1 === true) ||
    (region === "region3" && settings?.captureRegion2 === true);
}
export function captureRegionShifts(settings, region) {
  if (region === "home") return null;
  const count = Number(region === "region2" ? settings?.captureRegion1Shifts : settings?.captureRegion2Shifts);
  return ["shift1", "shift2", "shift3", "shift4"].slice(0, Number.isInteger(count) && count >= 1 && count <= 4 ? count : 2);
}


/** Region capture is opt-in via the existing registration "readyAttack" flag.
 * Home planning keeps the complete registration roster. */
export function hasOptedIntoRegionCapture(player) {
  return player?.readyAttack === true || player?.readiness?.attack === true;
}

export function filterCaptureRegionRegistrations(registrations, region) {
  const rows = Array.isArray(registrations) ? registrations : [];
  return region === "home" ? rows : rows.filter(hasOptedIntoRegionCapture);
}

/** Do not silently remove previously assigned captains or helpers from a
 * captured-region draft when their registration opt-in changes. Incumbents
 * remain visible for manual review, but automatic distribution won't select
 * them for a *new* placement. */
export function selectCapturePlanRegistrations(registrations, region, assignments) {
  const rows = filterCaptureRegionRegistrations(registrations, region);
  if (region === "home") return rows;
  const retained = new Set();
  for (const towers of Object.values(assignments?.shifts || {})) {
    for (const slot of Object.values(towers || {})) {
      if (slot?.captainId != null) retained.add(String(slot.captainId));
      for (const id of slot?.helperIds || []) retained.add(String(id));
    }
  }
  if (!retained.size) return rows;
  const opted = new Set(rows.map((row) => String(row.id)));
  return [...rows, ...(Array.isArray(registrations) ? registrations : []).filter((row) =>
    retained.has(String(row?.id)) && !opted.has(String(row?.id)))];
}
