PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  site_name TEXT NOT NULL DEFAULT 'Wasteland King',
  brand_text TEXT NOT NULL DEFAULT 'Wasteland King',
  region_number INTEGER NOT NULL DEFAULT 987,
  region_name TEXT NOT NULL DEFAULT 'We are One',
  footer_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO site_settings (
  id,
  site_name,
  brand_text,
  region_number,
  region_name,
  footer_json
)
VALUES (1, 'Wasteland King', 'Wasteland King', 987, 'We are One', '{}');
