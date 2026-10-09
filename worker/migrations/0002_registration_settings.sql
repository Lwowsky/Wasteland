PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS registration_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  public_registration INTEGER NOT NULL DEFAULT 1 CHECK (public_registration IN (0, 1)),
  max_players INTEGER NOT NULL DEFAULT 300,
  default_shift TEXT NOT NULL DEFAULT 'both' CHECK (default_shift IN ('shift1', 'shift2', 'both')),
  allow_captain INTEGER NOT NULL DEFAULT 1 CHECK (allow_captain IN (0, 1)),
  allow_extra_squads INTEGER NOT NULL DEFAULT 1 CHECK (allow_extra_squads IN (0, 1)),
  allow_ready_attack INTEGER NOT NULL DEFAULT 1 CHECK (allow_ready_attack IN (0, 1)),
  allow_comment INTEGER NOT NULL DEFAULT 1 CHECK (allow_comment IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO registration_settings (
  id,
  public_registration,
  max_players,
  default_shift,
  allow_captain,
  allow_extra_squads,
  allow_ready_attack,
  allow_comment
)
VALUES (1, 1, 300, 'both', 1, 1, 1, 1);
