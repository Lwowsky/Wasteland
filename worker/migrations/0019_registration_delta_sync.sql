-- Admin-only incremental synchronization of private registrations.
-- A monotonic sequence is used instead of updated_at seconds, so changes made
-- within the same second and deleted rows cannot be missed.
-- Do not export registration_changes in public snapshots or region backups.
CREATE TABLE IF NOT EXISTS registration_changes (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  period_id INTEGER NOT NULL,
  registration_id INTEGER NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('upsert', 'delete')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_registration_changes_period_seq
  ON registration_changes (period_id, seq);

CREATE TRIGGER IF NOT EXISTS trg_registration_changes_insert
AFTER INSERT ON registrations
BEGIN
  INSERT INTO registration_changes (period_id, registration_id, operation)
  VALUES (NEW.period_id, NEW.id, 'upsert');
END;

CREATE TRIGGER IF NOT EXISTS trg_registration_changes_update
AFTER UPDATE ON registrations
BEGIN
  INSERT INTO registration_changes (period_id, registration_id, operation)
  VALUES (NEW.period_id, NEW.id, 'upsert');
END;

CREATE TRIGGER IF NOT EXISTS trg_registration_changes_delete
AFTER DELETE ON registrations
BEGIN
  INSERT INTO registration_changes (period_id, registration_id, operation)
  VALUES (OLD.period_id, OLD.id, 'delete');
END;
