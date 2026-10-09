function getTierNumber(value) {
  const match = String(value || "").match(/\d+/);

  return match ? Number(match[0]) : 0;
}

export function getAllianceStats(players) {
  const map = new Map();

  players.forEach((player) => {
    const alliance = String(player.alliance || "—").trim() || "—";

    if (!map.has(alliance)) {
      map.set(alliance, {
        name: alliance,

        players: 0,

        captains: 0,

        shifts: {
          shift1: 0,
          shift2: 0,
          shift3: 0,
          shift4: 0,
          flexible: 0,
        },

        troops: {
          fighter: 0,
          shooter: 0,
          rider: 0,
        },

        tierCounts: new Map(),
      });
    }

    const item = map.get(alliance);

    item.players += 1;

    if (player.captain === true) {
      item.captains += 1;
    }

    if (Object.prototype.hasOwnProperty.call(item.shifts, player.shift)) {
      item.shifts[player.shift] += 1;
    }

    if (Object.prototype.hasOwnProperty.call(item.troops, player.troopType)) {
      item.troops[player.troopType] += 1;
    }

    const tier = String(player.tier || "").trim();

    if (tier) {
      item.tierCounts.set(tier, (item.tierCounts.get(tier) || 0) + 1);
    }
  });

  return Array.from(map.values())
    .map((item) => ({
      name: item.name,

      players: item.players,

      captains: item.captains,

      shifts: item.shifts,

      troops: item.troops,

      tiers: Array.from(item.tierCounts.entries())
        .map(([tier, count]) => ({
          tier,
          count,
        }))
        .sort((a, b) => getTierNumber(b.tier) - getTierNumber(a.tier)),
    }))
    .sort((a, b) => {
      if (b.players !== a.players) {
        return b.players - a.players;
      }

      return a.name.localeCompare(b.name);
    });
}

export function filterRegionPlayers(players, search) {
  const query = String(search || "")
    .trim()
    .toLowerCase();

  if (!query) {
    return players;
  }

  return players.filter((player) => {
    const nickname = String(player.nickname || "").toLowerCase();

    const alliance = String(player.alliance || "").toLowerCase();

    return nickname.includes(query) || alliance.includes(query);
  });
}

export function formatRegionNumber(value, language) {
  return Number(value || 0).toLocaleString(
    language === "uk" ? "uk-UA" : "en-GB",
  );
}

