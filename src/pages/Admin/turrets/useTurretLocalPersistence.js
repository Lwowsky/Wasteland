import { useEffect, useMemo, useState } from "react";
import {
  isTurretPlanDirty, writeTurretWorkspace,
} from "../../../features/turrets/localTurretWorkspace.js";

/** Every in-browser edit is synchronously written to localStorage; zero API calls. */
export default function useTurretLocalPersistence({
  periodId, userId, settings, raw, committed, revision,
  fingerprint, ready, editable,
}) {
  const [storageError, setStorageError] = useState(false);
  const dirty = useMemo(() => isTurretPlanDirty(settings, raw, committed),
    [settings, raw, committed]);

  useEffect(() => {
    if (!ready || !editable) return;
    const ok = writeTurretWorkspace(periodId, userId, {
      settings, assignments: raw, baseRevision: revision, dirty,
      rosterFingerprint: fingerprint || "",
    });
    // Report storage errors asynchronously; the effect itself only synchronizes storage.
    let active = true;
    queueMicrotask(() => { if (active) setStorageError(!ok); });
    return () => { active = false; };
  }, [periodId, userId, settings, raw, committed, revision, dirty, fingerprint, ready, editable]);

  return { storageError, dirty };
}
