import { useEffect, useState } from "react";

import { useVerifiedContentAccess } from "../../features/contentAccess/ContentAccessContext.js";
import { getPublicPlayers } from "../../features/players/publicPlayersApi.js";


function usePublicPlayers() {
  const verifiedStatus = useVerifiedContentAccess("players");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPlayers() {
      try {
        setLoadError(false);

        const data = await getPublicPlayers(verifiedStatus);

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
  }, [verifiedStatus]);

  return {
    players,
    loading,
    loadError,
  };
}

export default usePublicPlayers;
