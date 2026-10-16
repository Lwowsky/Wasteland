-- Monotonic public-data revisions. Kept OUTSIDE region backups and factory resets:
-- publishing must still work after a reset/restore of region data.
CREATE TABLE IF NOT EXISTS public_snapshot_sync (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL DEFAULT 1,
  dispatched_revision INTEGER NOT NULL DEFAULT 0,
  published_revision INTEGER NOT NULL DEFAULT 0,
  last_dispatch_ms INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO public_snapshot_sync (id, revision) VALUES (1, 1);
