export const DEFAULT_WASTELAND_ANCHOR_ISO = "2026-10-03T10:00:00.000Z";
export const DEFAULT_WASTELAND_INTERVAL_DAYS = 14;
export const DEFAULT_WASTELAND_DURATION_HOURS = 24;
export const DEFAULT_REGISTRATION_CLOSE_MODE = "gameDayReset";
export const DEFAULT_REGISTRATION_CLOSE_BEFORE_HOURS = 34;
export const DEFAULT_REGISTRATION_OPEN_WEEKDAY_UTC = 5;
export const DEFAULT_REGISTRATION_OPEN_TIME_UTC = "00:00";

export const DEFAULT_REGISTRATION_CYCLE_SETTINGS = {
  cycleMode: "automatic",
  wastelandAnchorAt: DEFAULT_WASTELAND_ANCHOR_ISO,
  wastelandIntervalDays: DEFAULT_WASTELAND_INTERVAL_DAYS,
  wastelandDurationHours: DEFAULT_WASTELAND_DURATION_HOURS,
  registrationCloseMode: DEFAULT_REGISTRATION_CLOSE_MODE,
  registrationCloseBeforeHours: DEFAULT_REGISTRATION_CLOSE_BEFORE_HOURS,
  registrationOpenWeekdayUtc: DEFAULT_REGISTRATION_OPEN_WEEKDAY_UTC,
  registrationOpenTimeUtc: DEFAULT_REGISTRATION_OPEN_TIME_UTC,
  autoOpenRegistration: true,
  autoCloseRegistration: true,
};

export const REGISTRATION_FORM_FIELDS = [
  "nickname",
  "alliance",
  "troopType",
  "tier",
  "lairLevel",
  "marchSize",
  "rallySize",
  "shift",
  "readyAttack",
  "captain",
  "extraSquads",
  "comment",
];


export const REGISTRATION_TROOP_TYPES = ["fighter", "rider", "shooter"];

export const REGISTRATION_TIERS = Array.from(
  { length: 14 },
  (_, index) => `T${index + 1}`,
);

export const DEFAULT_AVAILABLE_SHIFTS = {
  shift1: true,
  shift2: true,
  shift3: false,
  shift4: false,
  flexible: true,
};

export const REGISTRATION_SHIFT_KEYS = Object.keys(
  DEFAULT_AVAILABLE_SHIFTS,
);

export const DEFAULT_AVAILABLE_TIERS = Object.fromEntries(
  REGISTRATION_TIERS.map((tier) => [tier, Number(tier.slice(1)) >= 9]),
);

export const DEFAULT_VISIBLE_FIELDS = Object.fromEntries(
  REGISTRATION_FORM_FIELDS.map((field) => [field, true]),
);

export const DEFAULT_REQUIRED_FIELDS = {
  nickname: true,
  alliance: true,
  troopType: true,
  tier: true,
  lairLevel: true,
  marchSize: true,
  rallySize: true,
  shift: true,
  readyAttack: false,
  captain: false,
  extraSquads: false,
  comment: false,
};
