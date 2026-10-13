import { useCallback, useEffect, useState } from "react";

import {
  createAdminRegistration,
  deleteAdminRegistration,
  getAdminRegistrations,
  updateAdminRegistration,
} from "../services/adminPlayersApi.js";

export default function useAdminPlayersData({ enabled, canDelete }) {
  const [players, setPlayers] = useState([]);
  const [period, setPeriod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorKey, setErrorKey] = useState("");
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const result = await getAdminRegistrations();
    setPlayers(result.registrations || []);
    setPeriod(result.period || null);
    setLoaded(true);
    return result;
  }, []);

  useEffect(() => {
    if (!enabled || loaded) {
      return undefined;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorKey("");

      try {
        const result = await getAdminRegistrations();

        if (!active) {
          return;
        }

        setPlayers(result.registrations || []);
        setPeriod(result.period || null);
        setLoaded(true);
      } catch (error) {
        console.error("Load D1 registrations:", error);

        if (active) {
          setErrorKey("load");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [enabled, loaded]);

  async function createPlayer(player) {
    setSaving(true);
    setErrorKey("");

    try {
      await createAdminRegistration(player);
      await reload();
    } catch (error) {
      console.error("Create D1 player:", error);
      setErrorKey("save");
      throw error;
    } finally {
      setSaving(false);
    }
  }

  async function updatePlayer(playerId, player) {
    setSaving(true);
    setErrorKey("");

    try {
      await updateAdminRegistration(playerId, player);
      await reload();
    } catch (error) {
      console.error("Update D1 player:", error);
      setErrorKey("save");
      throw error;
    } finally {
      setSaving(false);
    }
  }

  async function deletePlayer(player) {
    if (!canDelete) {
      return;
    }

    setSaving(true);
    setErrorKey("");

    try {
      await deleteAdminRegistration(player.id);
      await reload();
    } catch (error) {
      console.error("Delete D1 player:", error);
      setErrorKey("delete");
    } finally {
      setSaving(false);
    }
  }

  return {
    players,
    period,
    loading: enabled && !loaded ? true : loading,
    saving,
    errorKey,
    reload,
    createPlayer,
    updatePlayer,
    deletePlayer,
  };
}
