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
  writeAdminPlayersCache,
} from "../services/adminPlayersCache.js";

// Poll only while the table is visible, never every 10 seconds.
// 10 admins * 8 hours * (3600 / 30) = 9600 small checks per day, not
// 9600 scans of the full player table. Auth + cursor checks still cost money.
const CHANGE_CHECK_INTERVAL_MS = 30_000;
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
  const snapshotRef = useRef(snapshot);

  const replaceSnapshot = useCallback((next) => {
    snapshotRef.current = next;
    setSnapshot(next);
    setLoaded(true);
  }, []);

  const reload = useCallback(async () => {
    const generation = ++generationRef.current;
    const result = await getAdminRegistrations();
    if (generation !== generationRef.current) return result;
    replaceSnapshot({
      players: result.registrations || [],
      period: result.period || null,
      cursor: Number(result.cursor || 0),
    });
    return result;
  }, [replaceSnapshot]);

  const syncChanges = useCallback(async ({ afterWrite = false } = {}) => {
    if (inflightRef.current) {
      const previous = inflightRef.current;
      try { await previous; } catch { /* Retry below if explicitly requested. */ }
      if (!afterWrite) return;
    }
    const promise = (async () => {
      const generation = generationRef.current;
      let current = snapshotRef.current;
      if (!current?.period?.id) {
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
  }, [reload, replaceSnapshot]);

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
        if (active) replaceSnapshot({
          players: result.registrations || [], period: result.period || null,
          cursor: Number(result.cursor || 0),
        });
      } catch (error) {
        console.error("Load D1 registrations:", error);
        if (active) setErrorKey("load");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [enabled, loaded, replaceSnapshot]);

  useEffect(() => {
    const active = enabled && autoSync && loaded;
    if (!active) {
      activeRef.current = false;
      return undefined;
    }
    function check() {
      if (document.visibilityState === "hidden") return;
      syncChanges().catch((error) => console.error("Incremental registrations sync:", error));
    }
    if (!activeRef.current) check();
    activeRef.current = true;
    const interval = window.setInterval(check, CHANGE_CHECK_INTERVAL_MS);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [enabled, autoSync, loaded, syncChanges]);

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
    players: snapshot?.players || [],
    period: snapshot?.period || null,
    loading: enabled && !loaded ? true : loading,
    saving,
    errorKey,
    reload,
    createPlayer,
    updatePlayer,
    deletePlayer,
  };
}
