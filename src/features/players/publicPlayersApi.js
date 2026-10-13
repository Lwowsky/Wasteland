import { getContentAccessHeaders } from "../contentAccess/contentAccessApi.js";
import { requestJson } from "../../utils/apiClient.js";
import { readSessionCache, writeSessionCache } from "../../utils/sessionCache.js";

const STATS_CACHE_KEY = "wasteland-public-stats";
const RECENT_CACHE_PREFIX = "wasteland-public-recent-";
const DASHBOARD_CACHE_TTL_MS = 30_000;

function normalizePlayer(player) {
  const createdAt =
    player.createdAt && !player.createdAt.includes("T")
      ? `${player.createdAt.replace(" ", "T")}Z`
      : player.createdAt;

  return {
    ...player,
    nickname: String(player.nickname || ""),
    alliance: String(player.alliance || ""),
    troopType: String(player.troopType || ""),
    tier: String(player.tier || ""),
    shift: String(player.shift || ""),
    createdAt,
    readyAttack: player.readyAttack === 1 || player.readyAttack === true,
    captain: player.captain === 1 || player.captain === true,
    readiness: {
      attack: player.readyAttack === 1 || player.readyAttack === true,
      captain: player.captain === 1 || player.captain === true,
    },
  };
}

export async function getPublicPlayers() {
  const data = await requestJson("/api/players?page=1&limit=500", {
    headers: getContentAccessHeaders("players"),
  });

  return {
    ...data,
    players: (data.players || []).map(normalizePlayer),
  };
}

export async function getPublicStats({ force = false } = {}) {
  if (!force) {
    const cached = readSessionCache(STATS_CACHE_KEY, DASHBOARD_CACHE_TTL_MS);

    if (cached) {
      return cached;
    }
  }

  const data = await requestJson("/api/stats");
  writeSessionCache(STATS_CACHE_KEY, data);
  return data;
}

export async function getRecentPlayers(limit = 5, { force = false } = {}) {
  const cacheKey = `${RECENT_CACHE_PREFIX}${limit}`;

  if (!force) {
    const cached = readSessionCache(cacheKey, DASHBOARD_CACHE_TTL_MS);

    if (cached) {
      return cached.map(normalizePlayer);
    }
  }

  try {
    const players = await requestJson(`/api/recent?limit=${limit}`, {
      headers: getContentAccessHeaders("players"),
    });
    writeSessionCache(cacheKey, players);

    return players.map(normalizePlayer);
  } catch (error) {
    if (
      [
        "CONTENT_PRIVATE",
        "CONTENT_ACCESS_REQUIRED",
        "NO_CURRENT_PERIOD",
      ].includes(error?.message)
    ) {
      return [];
    }

    throw error;
  }
}
