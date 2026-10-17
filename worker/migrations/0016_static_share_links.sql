-- New short share links are read-only capabilities for public-view data.
-- Unlike old content_access_tokens, these are NOT tied to a registration period.
-- Only SHA-256 hashes are stored; raw codes are returned just once to admin.
CREATE TABLE IF NOT EXISTS static_share_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource TEXT NOT NULL CHECK (resource IN ('players', 'final_plan')),
  token_hash TEXT NOT NULL UNIQUE,
  token_hint TEXT NOT NULL,
  expires_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_static_share_links_active
  ON static_share_links (resource, revoked_at, expires_at);
