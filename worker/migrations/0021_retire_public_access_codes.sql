-- Stage 051: retire legacy code/session-based access to public players/plan.
-- The static share_links table is intentionally untouched.
-- Existing code mode is closed before the updated Worker is deployed.
UPDATE content_access_settings
SET mode = 'private', updated_at = CURRENT_TIMESTAMP
WHERE mode = 'code';

-- Revoke pre-static credentials; keep rows for backup/history compatibility.
UPDATE content_access_tokens
SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
WHERE revoked_at IS NULL;

-- No bearer session can grant public content access after Stage 051.
DELETE FROM content_access_sessions;
