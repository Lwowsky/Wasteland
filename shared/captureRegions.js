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
