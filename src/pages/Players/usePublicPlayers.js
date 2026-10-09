import { useEffect, useState } from "react";

import { getPublicPlayers } from "../../features/players/publicPlayersApi.js";

const REFRESH_INTERVAL_MS = 60 * 1000;

function usePublicPlayers() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPlayers() {
      try {
        setLoadError(false);

        const data = await getPublicPlayers();

        if (!cancelled) {
          setPlayers(data.players || []);
        }
      } catch (error) {
        console.error("Load players:", error);

        if (!cancelled) {
          setLoadError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPlayers();

    const timer = window.setInterval(loadPlayers, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return {
    players,
    loading,
    loadError,
  };
}

export default usePublicPlayers;
