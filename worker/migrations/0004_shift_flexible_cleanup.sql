PRAGMA foreign_keys = OFF;

-- =========================================
-- REGISTRATION SETTINGS
-- Remove obsolete default_shift column
-- =========================================
CREATE TABLE
    registration_settings_new (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        public_registration INTEGER NOT NULL DEFAULT 1 CHECK (public_registration IN (0, 1)),
        max_players INTEGER NOT NULL DEFAULT 300,
        allow_captain INTEGER NOT NULL DEFAULT 1 CHECK (allow_captain IN (0, 1)),
        allow_extra_squads INTEGER NOT NULL DEFAULT 1 CHECK (allow_extra_squads IN (0, 1)),
        allow_ready_attack INTEGER NOT NULL DEFAULT 1 CHECK (allow_ready_attack IN (0, 1)),
        allow_comment INTEGER NOT NULL DEFAULT 1 CHECK (allow_comment IN (0, 1)),
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        host_alliance TEXT NOT NULL DEFAULT '',
        governor TEXT NOT NULL DEFAULT '',
        capture_region_1 INTEGER NOT NULL DEFAULT 0 CHECK (capture_region_1 IN (0, 1)),
        capture_region_2 INTEGER NOT NULL DEFAULT 0 CHECK (capture_region_2 IN (0, 1)),
        allow_shift_1 INTEGER NOT NULL DEFAULT 1 CHECK (allow_shift_1 IN (0, 1)),
        allow_shift_2 INTEGER NOT NULL DEFAULT 1 CHECK (allow_shift_2 IN (0, 1)),
        allow_shift_3 INTEGER NOT NULL DEFAULT 0 CHECK (allow_shift_3 IN (0, 1)),
        allow_shift_4 INTEGER NOT NULL DEFAULT 0 CHECK (allow_shift_4 IN (0, 1)),
        allow_shift_flexible INTEGER NOT NULL DEFAULT 1 CHECK (allow_shift_flexible IN (0, 1))
    );

INSERT INTO
    registration_settings_new (
        id,
        public_registration,
        max_players,
        allow_captain,
        allow_extra_squads,
        allow_ready_attack,
        allow_comment,
        updated_at,
        host_alliance,
        governor,
        capture_region_1,
        capture_region_2,
        allow_shift_1,
        allow_shift_2,
        allow_shift_3,
        allow_shift_4,
        allow_shift_flexible
    )
SELECT
    id,
    public_registration,
    max_players,
    allow_captain,
    allow_extra_squads,
    allow_ready_attack,
    allow_comment,
    updated_at,
    host_alliance,
    governor,
    capture_region_1,
    capture_region_2,
    allow_shift_1,
    allow_shift_2,
    allow_shift_3,
    allow_shift_4,
    allow_shift_flexible
FROM
    registration_settings;

DROP TABLE registration_settings;

ALTER TABLE registration_settings_new
RENAME TO registration_settings;

-- =========================================
-- REGISTRATIONS
-- Remove old "both" default and enforce enum
-- =========================================
CREATE TABLE
    registrations_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_id INTEGER NOT NULL,
        nickname TEXT NOT NULL,
        nickname_normalized TEXT NOT NULL,
        alliance TEXT NOT NULL,
        troop_type TEXT NOT NULL CHECK (troop_type IN ('fighter', 'rider', 'shooter')),
        tier TEXT NOT NULL,
        lair_level INTEGER NOT NULL DEFAULT 0,
        march_size INTEGER NOT NULL DEFAULT 0,
        rally_size INTEGER NOT NULL DEFAULT 0,
        ready_attack INTEGER NOT NULL DEFAULT 0 CHECK (ready_attack IN (0, 1)),
        captain INTEGER NOT NULL DEFAULT 0 CHECK (captain IN (0, 1)),
        shift TEXT NOT NULL CHECK (
            shift IN (
                'shift1',
                'shift2',
                'shift3',
                'shift4',
                'flexible'
            )
        ),
        extra_fighter_enabled INTEGER NOT NULL DEFAULT 0 CHECK (extra_fighter_enabled IN (0, 1)),
        extra_fighter_tier TEXT,
        extra_rider_enabled INTEGER NOT NULL DEFAULT 0 CHECK (extra_rider_enabled IN (0, 1)),
        extra_rider_tier TEXT,
        extra_shooter_enabled INTEGER NOT NULL DEFAULT 0 CHECK (extra_shooter_enabled IN (0, 1)),
        extra_shooter_tier TEXT,
        comment TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (period_id) REFERENCES registration_periods (id) ON DELETE CASCADE,
        UNIQUE (period_id, nickname_normalized)
    );

INSERT INTO
    registrations_new (
        id,
        period_id,
        nickname,
        nickname_normalized,
        alliance,
        troop_type,
        tier,
        lair_level,
        march_size,
        rally_size,
        ready_attack,
        captain,
        shift,
        extra_fighter_enabled,
        extra_fighter_tier,
        extra_rider_enabled,
        extra_rider_tier,
        extra_shooter_enabled,
        extra_shooter_tier,
        comment,
        status,
        created_at,
        updated_at
    )
SELECT
    id,
    period_id,
    nickname,
    nickname_normalized,
    alliance,
    troop_type,
    tier,
    lair_level,
    march_size,
    rally_size,
    ready_attack,
    captain,
    CASE
        WHEN shift = 'both' THEN 'flexible'
        ELSE shift
    END,
    extra_fighter_enabled,
    extra_fighter_tier,
    extra_rider_enabled,
    extra_rider_tier,
    extra_shooter_enabled,
    extra_shooter_tier,
    comment,
    status,
    created_at,
    updated_at
FROM
    registrations;

-- =========================================
-- PUBLIC PLAYERS
-- Remove old "both" default and enforce enum
-- =========================================
CREATE TABLE
    public_players_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        registration_id INTEGER NOT NULL UNIQUE,
        period_id INTEGER NOT NULL,
        nickname TEXT NOT NULL,
        alliance TEXT NOT NULL,
        troop_type TEXT NOT NULL CHECK (troop_type IN ('fighter', 'rider', 'shooter')),
        tier TEXT NOT NULL,
        lair_level INTEGER NOT NULL DEFAULT 0,
        march_size INTEGER NOT NULL DEFAULT 0,
        rally_size INTEGER NOT NULL DEFAULT 0,
        ready_attack INTEGER NOT NULL DEFAULT 0 CHECK (ready_attack IN (0, 1)),
        captain INTEGER NOT NULL DEFAULT 0 CHECK (captain IN (0, 1)),
        shift TEXT NOT NULL CHECK (
            shift IN (
                'shift1',
                'shift2',
                'shift3',
                'shift4',
                'flexible'
            )
        ),
        extra_fighter_enabled INTEGER NOT NULL DEFAULT 0 CHECK (extra_fighter_enabled IN (0, 1)),
        extra_fighter_tier TEXT,
        extra_rider_enabled INTEGER NOT NULL DEFAULT 0 CHECK (extra_rider_enabled IN (0, 1)),
        extra_rider_tier TEXT,
        extra_shooter_enabled INTEGER NOT NULL DEFAULT 0 CHECK (extra_shooter_enabled IN (0, 1)),
        extra_shooter_tier TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (registration_id) REFERENCES registrations_new (id) ON DELETE CASCADE,
        FOREIGN KEY (period_id) REFERENCES registration_periods (id) ON DELETE CASCADE
    );

INSERT INTO
    public_players_new (
        id,
        registration_id,
        period_id,
        nickname,
        alliance,
        troop_type,
        tier,
        lair_level,
        march_size,
        rally_size,
        ready_attack,
        captain,
        shift,
        extra_fighter_enabled,
        extra_fighter_tier,
        extra_rider_enabled,
        extra_rider_tier,
        extra_shooter_enabled,
        extra_shooter_tier,
        created_at,
        updated_at
    )
SELECT
    id,
    registration_id,
    period_id,
    nickname,
    alliance,
    troop_type,
    tier,
    lair_level,
    march_size,
    rally_size,
    ready_attack,
    captain,
    CASE
        WHEN shift = 'both' THEN 'flexible'
        ELSE shift
    END,
    extra_fighter_enabled,
    extra_fighter_tier,
    extra_rider_enabled,
    extra_rider_tier,
    extra_shooter_enabled,
    extra_shooter_tier,
    created_at,
    updated_at
FROM
    public_players;

-- =========================================
-- Replace old tables
-- =========================================
DROP TABLE public_players;

DROP TABLE registrations;

ALTER TABLE registrations_new
RENAME TO registrations;

ALTER TABLE public_players_new
RENAME TO public_players;

-- =========================================
-- Restore indexes
-- =========================================
CREATE INDEX IF NOT EXISTS idx_registrations_period ON registrations (period_id);

CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_registrations_troop_type ON registrations (troop_type);

CREATE INDEX IF NOT EXISTS idx_registrations_alliance ON registrations (alliance);

CREATE INDEX IF NOT EXISTS idx_public_players_period ON public_players (period_id);

CREATE INDEX IF NOT EXISTS idx_public_players_created ON public_players (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_players_troop_type ON public_players (troop_type);

CREATE INDEX IF NOT EXISTS idx_public_players_alliance ON public_players (alliance);

CREATE INDEX IF NOT EXISTS idx_public_players_tier ON public_players (tier);

PRAGMA foreign_keys = ON;