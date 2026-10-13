PRAGMA foreign_keys = ON;

ALTER TABLE registration_settings
ADD COLUMN host_alliance TEXT NOT NULL DEFAULT '';

ALTER TABLE registration_settings
ADD COLUMN governor TEXT NOT NULL DEFAULT '';

ALTER TABLE registration_settings
ADD COLUMN capture_region_1 INTEGER NOT NULL DEFAULT 0 CHECK (capture_region_1 IN (0, 1));

ALTER TABLE registration_settings
ADD COLUMN capture_region_2 INTEGER NOT NULL DEFAULT 0 CHECK (capture_region_2 IN (0, 1));

ALTER TABLE registration_settings
ADD COLUMN allow_shift_1 INTEGER NOT NULL DEFAULT 1 CHECK (allow_shift_1 IN (0, 1));

ALTER TABLE registration_settings
ADD COLUMN allow_shift_2 INTEGER NOT NULL DEFAULT 1 CHECK (allow_shift_2 IN (0, 1));

ALTER TABLE registration_settings
ADD COLUMN allow_shift_3 INTEGER NOT NULL DEFAULT 0 CHECK (allow_shift_3 IN (0, 1));

ALTER TABLE registration_settings
ADD COLUMN allow_shift_4 INTEGER NOT NULL DEFAULT 0 CHECK (allow_shift_4 IN (0, 1));

ALTER TABLE registration_settings
ADD COLUMN allow_shift_flexible INTEGER NOT NULL DEFAULT 1 CHECK (allow_shift_flexible IN (0, 1));

CREATE TABLE
    IF NOT EXISTS alliance_rotation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alliance_name TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_alliance_rotation_position ON alliance_rotation (position);

UPDATE registrations
SET
    shift = 'flexible'
WHERE
    shift = 'both';

UPDATE public_players
SET
    shift = 'flexible'
WHERE
    shift = 'both';