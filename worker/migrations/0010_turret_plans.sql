PRAGMA foreign_keys = ON;

-- Working drafts are PRIVATE and never served by the public API.
CREATE TABLE IF NOT EXISTS turret_plan_drafts (
  period_id INTEGER PRIMARY KEY REFERENCES registration_periods(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  settings_json TEXT NOT NULL,
  assignments_json TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Published snapshots are immutable with respect to later player edits.
-- Keep the source draft privately so an administrator can restore it.
CREATE TABLE IF NOT EXISTS turret_plan_publications (
  period_id INTEGER PRIMARY KEY REFERENCES registration_periods(id) ON DELETE CASCADE,
  publication_revision INTEGER NOT NULL DEFAULT 1 CHECK (publication_revision >= 1),
  source_revision INTEGER NOT NULL,
  plan_json TEXT NOT NULL,
  settings_json TEXT NOT NULL,
  assignments_json TEXT NOT NULL,
  published_by TEXT NOT NULL,
  published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
