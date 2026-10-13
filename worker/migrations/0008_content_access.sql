PRAGMA foreign_keys = ON;

-- =========================================================
-- Public content access settings
-- =========================================================
CREATE TABLE IF NOT EXISTS content_access_settings (
  resource TEXT PRIMARY KEY
    CHECK (resource IN ('players', 'final_plan')),
  mode TEXT NOT NULL DEFAULT 'public'
    CHECK (mode IN ('public', 'private', 'code', 'link')),
  use_limit INTEGER NOT NULL DEFAULT 1
    CHECK (use_limit >= 0),
  session_minutes INTEGER NOT NULL DEFAULT 30
    CHECK (session_minutes >= 5),
  token_ttl_minutes INTEGER NOT NULL DEFAULT 0
    CHECK (token_ttl_minutes >= 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO content_access_settings (
  resource,
  mode,
  use_limit,
  session_minutes,
  token_ttl_minutes
)
VALUES
  ('players', 'public', 1, 30, 0),
  ('final_plan', 'public', 1, 30, 0);

-- A generated code/link belongs to one registration cycle. When the cycle is
-- removed, its credentials disappear automatically.
CREATE TABLE IF NOT EXISTS content_access_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource TEXT NOT NULL
    CHECK (resource IN ('players', 'final_plan')),
  period_id INTEGER NOT NULL,
  token_kind TEXT NOT NULL
    CHECK (token_kind IN ('code', 'link')),
  token_hash TEXT NOT NULL UNIQUE,
  token_hint TEXT NOT NULL DEFAULT '',
  use_limit INTEGER NOT NULL DEFAULT 1
    CHECK (use_limit >= 0),
  used_count INTEGER NOT NULL DEFAULT 0
    CHECK (used_count >= 0),
  expires_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (period_id) REFERENCES registration_periods (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_content_access_tokens_resource_period
ON content_access_tokens (resource, period_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_access_tokens_hash
ON content_access_tokens (token_hash);

-- One successful activation creates a short-lived session. Refreshing the same
-- page does not consume another use of a one-time code.
CREATE TABLE IF NOT EXISTS content_access_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_id INTEGER NOT NULL,
  resource TEXT NOT NULL
    CHECK (resource IN ('players', 'final_plan')),
  period_id INTEGER NOT NULL,
  session_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (token_id) REFERENCES content_access_tokens (id) ON DELETE CASCADE,
  FOREIGN KEY (period_id) REFERENCES registration_periods (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_content_access_sessions_lookup
ON content_access_sessions (resource, period_id, session_hash, expires_at);
