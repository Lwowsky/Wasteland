PRAGMA foreign_keys = ON;

-- =========================================
-- REGISTRATION PERIODS
-- =========================================
CREATE TABLE
    IF NOT EXISTS registration_periods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('open', 'closed')),
        opens_at TEXT,
        closes_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_registration_periods_status ON registration_periods (status);

-- =========================================
-- PRIVATE REGISTRATIONS
-- =========================================
CREATE TABLE
    IF NOT EXISTS registrations (
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
        shift TEXT NOT NULL DEFAULT 'both',
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

CREATE INDEX IF NOT EXISTS idx_registrations_period ON registrations (period_id);

CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_registrations_troop_type ON registrations (troop_type);

CREATE INDEX IF NOT EXISTS idx_registrations_alliance ON registrations (alliance);

-- =========================================
-- PUBLIC PLAYERS
-- =========================================
CREATE TABLE
    IF NOT EXISTS public_players (
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
        shift TEXT NOT NULL DEFAULT 'both',
        extra_fighter_enabled INTEGER NOT NULL DEFAULT 0 CHECK (extra_fighter_enabled IN (0, 1)),
        extra_fighter_tier TEXT,
        extra_rider_enabled INTEGER NOT NULL DEFAULT 0 CHECK (extra_rider_enabled IN (0, 1)),
        extra_rider_tier TEXT,
        extra_shooter_enabled INTEGER NOT NULL DEFAULT 0 CHECK (extra_shooter_enabled IN (0, 1)),
        extra_shooter_tier TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (registration_id) REFERENCES registrations (id) ON DELETE CASCADE,
        FOREIGN KEY (period_id) REFERENCES registration_periods (id) ON DELETE CASCADE
    );

CREATE INDEX IF NOT EXISTS idx_public_players_period ON public_players (period_id);

CREATE INDEX IF NOT EXISTS idx_public_players_created ON public_players (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_players_troop_type ON public_players (troop_type);

CREATE INDEX IF NOT EXISTS idx_public_players_alliance ON public_players (alliance);

CREATE INDEX IF NOT EXISTS idx_public_players_tier ON public_players (tier);

-- =========================================
-- PUBLIC STATS
-- =========================================
CREATE TABLE
    IF NOT EXISTS stats (
        period_id INTEGER PRIMARY KEY,
        registered INTEGER NOT NULL DEFAULT 0,
        fighters INTEGER NOT NULL DEFAULT 0,
        riders INTEGER NOT NULL DEFAULT 0,
        shooters INTEGER NOT NULL DEFAULT 0,
        captains INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (period_id) REFERENCES registration_periods (id) ON DELETE CASCADE
    );