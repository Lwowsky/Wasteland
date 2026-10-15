-- Rotating a key immediately invalidates all sessions issued for the previous key.
CREATE TABLE IF NOT EXISTS shared_consul_keys (
 id INTEGER PRIMARY KEY CHECK (id = 1),
 secret_hash TEXT NOT NULL,
 generation INTEGER NOT NULL DEFAULT 1,
 expires_at INTEGER,
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS shared_consul_sessions (
 token_hash TEXT PRIMARY KEY,
 generation INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS shared_consul_sessions_expiry ON shared_consul_sessions(expires_at);
