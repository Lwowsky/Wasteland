import { useCallback, useEffect, useRef, useState } from "react";

import {
  createAdminRegistration,
  deleteAdminRegistration,
  getAdminRegistrationChanges,
  getAdminRegistrations,
  updateAdminRegistration,
} from "../services/adminPlayersApi.js";
import {
  clearAdminPlayersCache,
  mergeAdminRegistrationChanges,
  readAdminPlayersCache,
  readAdminPlayersCheckAt,
  markAdminPlayersCheckAt,
  writeAdminPlayersCache,
  isAdminRosterPastDeadline,
} from "../services/adminPlayersCache.js";
import { ADMIN_PLAYERS_AUTO_CHECK_MS, shouldCheckAdminPlayers } from "../services/adminPlayersSyncPolicy.js";

// A local timer checks eligibility every 15s, but only one network request
// every 2 minutes. This avoids delaying fresh registrations after F5 without
// increasing Worker, D1 or Firestore quotas.
const LOCAL_TICK_MS = 15_000;
const MAX_DELTA_PAGES = 20;

export default function useAdminPlayersData({ enabled, canDelete, autoSync = false, cacheIdentity = "" }) {
  const [snapshot, setSnapshot] = useState(() => readAdminPlayersCache(cacheIdentity));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorKey, setErrorKey] = useState("");
  const [loaded, setLoaded] = useState(() => Boolean(readAdminPlayersCache(cacheIdentity)));
  const inflightRef = useRef(null);
  const generationRef = useRef(0);
  const activeRef = useRef(false);
  const lastAutoCheckAtRef = useRef(readAdminPlayersCheckAt(cacheIdentity));
  const snapshotRef = useRef(snapshot);

  const markChecked = useCallback((at = Date.now()) => {
    lastAutoCheckAtRef.current = at;
    markAdminPlayersCheckAt(cacheIdentity, at);
  }, [cacheIdentity]);

  useEffect(() => {
    lastAutoCheckAtRef.current = readAdminPlayersCheckAt(cacheIdentity);
  }, [cacheIdentity]);

  const replaceSnapshot = useCallback((next) => {
    snapshotRef.current = next;
    setSnapshot(next);
    setLoaded(true);
  }, []);

  const reload = useCallback(async () => {
    const generation = ++generationRef.current;
    const result = await getAdminRegistrations();
    markChecked(); // Fresh full snapshot already includes the latest changes.
    if (generation !== generationRef.current) return result;
    replaceSnapshot({
      players: result.registrations || [],
      period: result.period || null,
      cursor: Number(result.cursor || 0),
      nextOpensAt: result.nextOpensAt || null,
    });
    return result;
  }, [replaceSnapshot, markChecked]);

  const syncChanges = useCallback(async ({ afterWrite = false } = {}) => {
    if (inflightRef.current) {
      const previous = inflightRef.current;
      try { await previous; } catch { /* Retry below if explicitly requested. */ }
      if (!afterWrite) return;
    }
    // Save the attempted time before network access. A run of F5s after a
    // transient error must not repeatedly invoke authenticated Firestore+D1.
    markChecked();
    const promise = (async () => {
      const generation = generationRef.current;
      let current = snapshotRef.current;
      if (!current?.period?.id) {
        const nextOpenMs = Date.parse(current?.nextOpensAt || "");
        if (Number.isFinite(nextOpenMs) && Date.now() < nextOpenMs) return;
        await reload();
        return;
      }
      for (let page = 0; page < MAX_DELTA_PAGES; page += 1) {
        const data = await getAdminRegistrationChanges(current.period.id, current.cursor);
        if (generation !== generationRef.current) return; // A full reload superseded this poll.
        if (data.reset || Number(data.period?.id) !== Number(current.period.id) ||
            data.period?.cycleKey !== current.period.cycleKey ||
            data.period?.createdAt !== current.period.createdAt) {
          await reload();
          return;
        }
        if (Number(data.cursor) < current.cursor) throw new Error("STALE_DELTA_CURSOR");
        if (Number(data.cursor) === current.cursor && !(data.upserts || []).length && !(data.deletes || []).length) {
          return; // No changes; avoid unnecessary React render and sessionStorage write.
        }
        current = {
          players: mergeAdminRegistrationChanges(current.players, data),
          period: data.period,
          cursor: Number(data.cursor),
        };
        replaceSnapshot(current);
        if (!data.hasMore) return;
      }
      // A large import produced more changes than fit into 20 batches.
      // A full reload is safer than silently dropping rows.
      await reload();
    })();
    inflightRef.current = promise;
    try {
      await promise;
      setErrorKey("");
    } catch (error) {
      if (["AUTH_REQUIRED", "ADMIN_ACCESS_DENIED", "FORBIDDEN", "INVALID_SESSION"].includes(error?.message)) {
        clearAdminPlayersCache();
        snapshotRef.current = null;
        setSnapshot(null);
        setLoaded(false);
      }
      setErrorKey("load");
      throw error;
    } finally {
      if (inflightRef.current === promise) inflightRef.current = null;
    }
  }, [reload, replaceSnapshot, markChecked]);

  // A cycle reset/open/close in this browser is authoritative. The old
  // sessionStorage snapshot must disappear immediately instead of waiting for
  // the next 2-minute delta poll (or continuing to show an old turret plan).
  useEffect(() => {
    function invalidateCycleRoster() {
      generationRef.current += 1;
      clearAdminPlayersCache();
      snapshotRef.current = null;
      setSnapshot(null);
      setLoaded(false);
      setErrorKey("");
      // The enabled/loaded effect below makes ONE authoritative GET when this
      // tab needs players. Inactive admin tabs perform no background request.
    }
    window.addEventListener("registration-settings-updated", invalidateCycleRoster);
    function fromOtherTab(event) {
      if (event.key === "wasteland-registration-settings-updated") invalidateCycleRoster();
    }
    window.addEventListener("storage", fromOtherTab);
    return () => {
      window.removeEventListener("registration-settings-updated", invalidateCycleRoster);
      window.removeEventListener("storage", fromOtherTab);
    };
  }, []);

  // Browser cache is only consumed AFTER AdminRoute has authenticated the user.
  useEffect(() => {
    if (!cacheIdentity || !loaded || !snapshot) return;
    writeAdminPlayersCache(cacheIdentity, snapshot);
  }, [cacheIdentity, loaded, snapshot]);

  useEffect(() => {
    if (!enabled || loaded) return undefined;
    let active = true;
    async function load() {
      setLoading(true);
      setErrorKey("");
      try {
        const result = await getAdminRegistrations();
        if (active) {
          markChecked(); // Avoid an immediate duplicate delta after the initial GET.
          replaceSnapshot({
            players: result.registrations || [], period: result.period || null,
            cursor: Number(result.cursor || 0),
            nextOpensAt: result.nextOpensAt || null,
          });
        }
      } catch (error) {
        console.error("Load D1 registrations:", error);
        if (active) setErrorKey("load");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [enabled, loaded, replaceSnapshot, markChecked]);

  useEffect(() => {
    const active = enabled && autoSync && loaded;
    if (!active) {
      activeRef.current = false;
      return undefined;
    }
    function check() {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      // Drop Sunday's roster precisely at Monday 09:00 JST, even in an
      // already-open admin tab. One server read obtains next Friday's time.
      if (isAdminRosterPastDeadline(snapshotRef.current?.period, now)) {
        replaceSnapshot({ players: [], period: null, cursor: 0, nextOpensAt: null });
        reload().catch((error) => console.error("New-cycle roster refresh:", error));
        return;
      }
      const nextOpenMs = Date.parse(snapshotRef.current?.nextOpensAt || "");
      if (!snapshotRef.current?.period && Number.isFinite(nextOpenMs)) {
        if (now < nextOpenMs) return;
        // First opening check is a single GET, not a periodic poll storm.
        replaceSnapshot({ players: [], period: null, cursor: 0, nextOpensAt: null });
        reload().catch((error) => console.error("New registration cycle refresh:", error));
        return;
      }
      // sessionStorage is intentionally re-read, so a recent successful full
      // load or an F5 in the same tab cannot trigger another GET immediately.
      const latest = Math.max(lastAutoCheckAtRef.current, readAdminPlayersCheckAt(cacheIdentity));
      if (!shouldCheckAdminPlayers(latest, now, ADMIN_PLAYERS_AUTO_CHECK_MS)) return;
      markChecked(now);
      syncChanges().catch((error) => console.error("Incremental registrations sync:", error));
    }
    if (!activeRef.current) check();
    activeRef.current = true;
    const interval = window.setInterval(check, LOCAL_TICK_MS);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [enabled, autoSync, loaded, syncChanges, cacheIdentity, markChecked, replaceSnapshot, reload]);

  async function performWrite(write, error = "save") {
    setSaving(true);
    setErrorKey("");
    let result;
    try {
      result = await write();
    } catch (cause) {
      console.error("Write D1 registration:", cause);
      setErrorKey(error);
      setSaving(false);
      throw cause;
    }
    try {
      // The write already committed. A sync failure must NEVER be reported
      // as a failed save, or users might submit duplicate registrations.
      await syncChanges({ afterWrite: true });
    } catch (cause) {
      console.error("Saved registration; incremental refresh failed:", cause);
      setErrorKey("load");
    } finally {
      setSaving(false);
    }
    return result;
  }

  async function createPlayer(player) {
    return performWrite(() => createAdminRegistration(player));
  }

  async function updatePlayer(playerId, player) {
    return performWrite(() => updateAdminRegistration(playerId, player));
  }

  async function deletePlayer(player) {
    if (!canDelete) return;
    try { await performWrite(() => deleteAdminRegistration(player.id), "delete"); }
    catch { /* The table already displays the error; preserve existing API. */ }
  }

  return {
    // A backgrounded browser tab might not run timers at the deadline.
    // Never render an expired roster when it resumes or changes tabs.
    players: isAdminRosterPastDeadline(snapshot?.period) ? [] : snapshot?.players || [],
    period: isAdminRosterPastDeadline(snapshot?.period) ? null : snapshot?.period || null,
    loading: enabled && !loaded ? true : loading,
    saving,
    errorKey,
    reload,
    createPlayer,
    updatePlayer,
    deletePlayer,
  };
}
