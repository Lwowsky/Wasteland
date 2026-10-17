-- Stage 2H-I: Explicit new cycle within an existing scheduled Wasteland window.
-- Old registrations remain keyed to their old registration_periods.id and are
-- removed by the existing 30-day retention maintenance process.
CREATE TABLE IF NOT EXISTS registration_cycle_resets (
  schedule_key TEXT PRIMARY KEY,
  active_cycle_key TEXT NOT NULL UNIQUE,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
