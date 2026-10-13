import { publicAsset } from "../../utils/publicAsset.js";

// Shared immutable identifiers, used by admin, public board and future algorithm.
export const TURRET_IDS = Object.freeze(["hub", "north", "west", "east", "south"]);
export const PLANNER_SHIFTS = Object.freeze(["shift1", "shift2", "shift3", "shift4"]);
export const TURRET_ICON_URLS = Object.freeze({
  hub: publicAsset("/images/turrets/tower-hub.webp"),
  north: publicAsset("/images/turrets/tower-turret.webp"),
  west: publicAsset("/images/turrets/tower-turret.webp"),
  east: publicAsset("/images/turrets/tower-turret.webp"),
  south: publicAsset("/images/turrets/tower-turret.webp"),
});
export const TIER_DEFAULTS = Object.freeze({
  T1: 0, T2: 0, T3: 0, T4: 0, T5: 0, T6: 0,
  T14: 300000, T13: 250000, T12: 200000, T11: 150000,
  T10: 100000, T9: 80000, T8: 60000, T7: 40000,
});
export const MAX_HELPERS_PER_TURRET = 29;
