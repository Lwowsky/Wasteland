PRAGMA foreign_keys = OFF;

-- =========================================================
-- REGISTRATION SETTINGS: persist frontend form rules
-- =========================================================
ALTER TABLE registration_settings
ADD COLUMN available_tiers_json TEXT NOT NULL DEFAULT '{"T1":false,"T2":false,"T3":false,"T4":false,"T5":false,"T6":false,"T7":false,"T8":true,"T9":true,"T10":true,"T11":true,"T12":true,"T13":true,"T14":true}';

ALTER TABLE registration_settings
ADD COLUMN visible_fields_json TEXT NOT NULL DEFAULT '{"nickname":true,"alliance":true,"troopType":true,"tier":true,"lairLevel":true,"marchSize":true,"rallySize":true,"shift":true,"readyAttack":true,"captain":true,"extraSquads":true,"comment":true}';

ALTER TABLE registration_settings
ADD COLUMN required_fields_json TEXT NOT NULL DEFAULT '{"nickname":true,"alliance":true,"troopType":true,"tier":true,"lairLevel":true,"marchSize":true,"rallySize":true,"shift":true,"readyAttack":false,"captain":false,"extraSquads":false,"comment":false}';

ALTER TABLE registration_settings
ADD COLUMN custom_fields_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE registration_settings
ADD COLUMN alliances_json TEXT NOT NULL DEFAULT '[]';

-- =========================================================
-- REGISTRATIONS: allow hidden/optional fields and store custom values
-- =========================================================
CREATE TABLE registrations_v6 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  period_id INTEGER NOT NULL,
  nickname TEXT,
  nickname_normalized TEXT,
  alliance TEXT,
  troop_type TEXT CHECK (troop_type IS NULL OR troop_type IN ('fighter', 'rider', 'shooter')),
  tier TEXT,
  lair_level INTEGER NOT NULL DEFAULT 0,
  march_size INTEGER NOT NULL DEFAULT 0,
  rally_size INTEGER NOT NULL DEFAULT 0,
  ready_attack INTEGER NOT NULL DEFAULT 0 CHECK (ready_attack IN (0, 1)),
  captain INTEGER NOT NULL DEFAULT 0 CHECK (captain IN (0, 1)),
  shift TEXT CHECK (shift IS NULL OR shift IN ('shift1', 'shift2', 'shift3', 'shift4', 'flexible')),
  extra_fighter_enabled INTEGER NOT NULL DEFAULT 0 CHECK (extra_fighter_enabled IN (0, 1)),
  extra_fighter_tier TEXT,
  extra_rider_enabled INTEGER NOT NULL DEFAULT 0 CHECK (extra_rider_enabled IN (0, 1)),
  extra_rider_tier TEXT,
  extra_shooter_enabled INTEGER NOT NULL DEFAULT 0 CHECK (extra_shooter_enabled IN (0, 1)),
  extra_shooter_tier TEXT,
  comment TEXT NOT NULL DEFAULT '',
  custom_fields_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (period_id) REFERENCES registration_periods (id) ON DELETE CASCADE,
  UNIQUE (period_id, nickname_normalized)
);

INSERT INTO registrations_v6 (
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
FROM registrations;

-- =========================================================
-- PUBLIC PLAYERS: mirror nullable built-in fields
-- =========================================================
CREATE TABLE public_players_v6 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registration_id INTEGER NOT NULL UNIQUE,
  period_id INTEGER NOT NULL,
  nickname TEXT,
  alliance TEXT,
  troop_type TEXT CHECK (troop_type IS NULL OR troop_type IN ('fighter', 'rider', 'shooter')),
  tier TEXT,
  lair_level INTEGER NOT NULL DEFAULT 0,
  march_size INTEGER NOT NULL DEFAULT 0,
  rally_size INTEGER NOT NULL DEFAULT 0,
  ready_attack INTEGER NOT NULL DEFAULT 0 CHECK (ready_attack IN (0, 1)),
  captain INTEGER NOT NULL DEFAULT 0 CHECK (captain IN (0, 1)),
  shift TEXT CHECK (shift IS NULL OR shift IN ('shift1', 'shift2', 'shift3', 'shift4', 'flexible')),
  extra_fighter_enabled INTEGER NOT NULL DEFAULT 0 CHECK (extra_fighter_enabled IN (0, 1)),
  extra_fighter_tier TEXT,
  extra_rider_enabled INTEGER NOT NULL DEFAULT 0 CHECK (extra_rider_enabled IN (0, 1)),
  extra_rider_tier TEXT,
  extra_shooter_enabled INTEGER NOT NULL DEFAULT 0 CHECK (extra_shooter_enabled IN (0, 1)),
  extra_shooter_tier TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (registration_id) REFERENCES registrations_v6 (id) ON DELETE CASCADE,
  FOREIGN KEY (period_id) REFERENCES registration_periods (id) ON DELETE CASCADE
);

INSERT INTO public_players_v6 (
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
  shift,
  extra_fighter_enabled,
  extra_fighter_tier,
  extra_rider_enabled,
  extra_rider_tier,
  extra_shooter_enabled,
  extra_shooter_tier,
  created_at,
  updated_at
FROM public_players;

DROP TABLE public_players;
DROP TABLE registrations;

ALTER TABLE registrations_v6 RENAME TO registrations;
ALTER TABLE public_players_v6 RENAME TO public_players;

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
