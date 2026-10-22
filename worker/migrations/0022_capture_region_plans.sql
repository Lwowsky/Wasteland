-- Stage 056: independent captured-region plans, never change existing home plans.
ALTER TABLE registration_settings ADD COLUMN capture_region_1_shifts INTEGER NOT NULL DEFAULT 2 CHECK (capture_region_1_shifts BETWEEN 1 AND 4);
ALTER TABLE registration_settings ADD COLUMN capture_region_2_shifts INTEGER NOT NULL DEFAULT 2 CHECK (capture_region_2_shifts BETWEEN 1 AND 4);
CREATE TABLE IF NOT EXISTS capture_region_plan_drafts (
  period_id INTEGER NOT NULL REFERENCES registration_periods(id) ON DELETE CASCADE,
  region_id TEXT NOT NULL CHECK (region_id IN ('region2', 'region3')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  settings_json TEXT NOT NULL, assignments_json TEXT NOT NULL,
  updated_by TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (period_id, region_id)
);
CREATE TABLE IF NOT EXISTS capture_region_plan_publications (
  period_id INTEGER NOT NULL REFERENCES registration_periods(id) ON DELETE CASCADE,
  region_id TEXT NOT NULL CHECK (region_id IN ('region2', 'region3')),
  publication_revision INTEGER NOT NULL DEFAULT 1 CHECK (publication_revision >= 1),
  source_revision INTEGER NOT NULL,
  plan_json TEXT NOT NULL, settings_json TEXT NOT NULL, assignments_json TEXT NOT NULL,
  published_by TEXT NOT NULL, published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (period_id, region_id)
);
