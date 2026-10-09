PRAGMA foreign_keys = ON;

ALTER TABLE registration_periods
ADD COLUMN rules_snapshot_json TEXT NOT NULL DEFAULT '{}';
