-- Track the currently visible period for idempotent, scheduled JSON expiry.
-- The +24h visibility policy lives in worker/src/db/periods.js.
ALTER TABLE public_snapshot_sync ADD COLUMN visible_period_key TEXT NOT NULL DEFAULT '';
