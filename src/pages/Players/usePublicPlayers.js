import { useEffect, useState } from "react";

import { getPublicPlayers } from "../../features/players/publicPlayersApi.js";


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

    void loadPlayers();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    players,
    loading,
    loadError,
  };
}

export default usePublicPlayers;
