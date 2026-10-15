-- Keep the legacy single-key tables so existing sessions and passwords continue to work.
CREATE TABLE IF NOT EXISTS shared_consul_credentials (
 id TEXT PRIMARY KEY,
 label TEXT NOT NULL,
 secret_hash TEXT NOT NULL UNIQUE,
 encrypted_secret TEXT NOT NULL,
 iv TEXT NOT NULL,
 expires_at INTEGER,
 created_at INTEGER NOT NULL,
 revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS shared_consul_credentials_active ON shared_consul_credentials(revoked_at, expires_at);
CREATE TABLE IF NOT EXISTS shared_consul_sessions_v2 (
 token_hash TEXT PRIMARY KEY,
 credential_id TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL,
 FOREIGN KEY(credential_id) REFERENCES shared_consul_credentials(id)
);
CREATE INDEX IF NOT EXISTS shared_consul_sessions_v2_credential ON shared_consul_sessions_v2(credential_id);
