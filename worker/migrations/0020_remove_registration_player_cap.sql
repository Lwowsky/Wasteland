-- Stage 049: remove obsolete registration max_players setting.
-- This column never enforced a registration cap in the current Worker.
-- Keep historical migrations unchanged for fresh installs.
-- BACK UP D1 before applying in production.
ALTER TABLE registration_settings DROP COLUMN max_players;
