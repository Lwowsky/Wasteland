-- New links store recoverable codes encrypted with a Worker-only AES-GCM secret.
-- Old rows have NULL encrypted_token, continue to work, and cannot be recovered.
ALTER TABLE static_share_links ADD COLUMN encrypted_token TEXT;
