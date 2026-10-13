PRAGMA foreign_keys = ON;

-- =========================================================
-- REGISTRATION PERIODS: cycle identity and Wasteland dates
-- =========================================================
ALTER TABLE registration_periods
ADD COLUMN cycle_number INTEGER;

ALTER TABLE registration_periods
ADD COLUMN cycle_key TEXT;

ALTER TABLE registration_periods
ADD COLUMN wasteland_start_at TEXT;

ALTER TABLE registration_periods
ADD COLUMN wasteland_end_at TEXT;

UPDATE registration_periods
SET cycle_number = id
WHERE cycle_number IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_registration_periods_cycle_key
ON registration_periods (cycle_key)
WHERE cycle_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_registration_periods_cycle_number
ON registration_periods (cycle_number);

CREATE INDEX IF NOT EXISTS idx_registration_periods_closes_at
ON registration_periods (closes_at);

-- =========================================================
-- REGISTRATION SETTINGS: automatic/manual cycle configuration
-- =========================================================
ALTER TABLE registration_settings
ADD COLUMN cycle_mode TEXT NOT NULL DEFAULT 'automatic'
CHECK (cycle_mode IN ('automatic', 'manual'));

ALTER TABLE registration_settings
ADD COLUMN wasteland_anchor_at TEXT NOT NULL DEFAULT '2026-10-03T10:00:00.000Z';

ALTER TABLE registration_settings
ADD COLUMN wasteland_interval_days INTEGER NOT NULL DEFAULT 14;

ALTER TABLE registration_settings
ADD COLUMN wasteland_duration_hours INTEGER NOT NULL DEFAULT 24;

ALTER TABLE registration_settings
ADD COLUMN registration_close_mode TEXT NOT NULL DEFAULT 'gameDayReset'
CHECK (registration_close_mode IN ('gameDayReset', 'hoursBeforeStart'));

ALTER TABLE registration_settings
ADD COLUMN registration_close_before_hours INTEGER NOT NULL DEFAULT 34;

ALTER TABLE registration_settings
ADD COLUMN registration_open_weekday_utc INTEGER NOT NULL DEFAULT 5;

ALTER TABLE registration_settings
ADD COLUMN registration_open_time_utc TEXT NOT NULL DEFAULT '00:00';

ALTER TABLE registration_settings
ADD COLUMN manual_opens_at TEXT;

ALTER TABLE registration_settings
ADD COLUMN manual_closes_at TEXT;

ALTER TABLE registration_settings
ADD COLUMN auto_open_registration INTEGER NOT NULL DEFAULT 1
CHECK (auto_open_registration IN (0, 1));

ALTER TABLE registration_settings
ADD COLUMN auto_close_registration INTEGER NOT NULL DEFAULT 1
CHECK (auto_close_registration IN (0, 1));
