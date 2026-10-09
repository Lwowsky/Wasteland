function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

export function getPlayerAlliances(players) {
  return [...new Set((players || []).map((player) => String(player.alliance || "")))]
    .filter(Boolean)
    .sort();
}

export function filterPlayers(players, filters) {
  const normalizedSearch = normalizeText(filters.search);

  return (players || []).filter((player) => {
    const nickname = normalizeText(player.nickname);
    const alliance = normalizeText(player.alliance);

    const searchMatch =
      !normalizedSearch ||
      nickname.includes(normalizedSearch) ||
      alliance.includes(normalizedSearch);

    const allianceMatch =
      filters.alliance === "all" || player.alliance === filters.alliance;

    const troopMatch =
      filters.troop === "all" || player.troopType === filters.troop;

    const shiftMatch =
      filters.shift === "all" || player.shift === filters.shift;

    const captainMatch =
      filters.captain === "all" ||
      (filters.captain === "yes" && player.readiness?.captain === true) ||
      (filters.captain === "no" && player.readiness?.captain !== true);

    return (
      searchMatch &&
      allianceMatch &&
      troopMatch &&
      shiftMatch &&
      captainMatch
    );
  });
}

export function getPlayerStats(players) {
  const stats = {
    total: 0,
    captains: 0,
    fighters: 0,
    riders: 0,
    shooters: 0,
    shift1: 0,
    shift2: 0,
    shift3: 0,
    shift4: 0,
    flexible: 0,
  };

  for (const player of players || []) {
    stats.total += 1;

    if (player.readiness?.captain === true) {
      stats.captains += 1;
    }

    if (player.troopType === "fighter") stats.fighters += 1;
    if (player.troopType === "rider") stats.riders += 1;
    if (player.troopType === "shooter") stats.shooters += 1;

    if (Object.hasOwn(stats, player.shift)) {
      stats[player.shift] += 1;
    }
  }

  return stats;
}

export function getTotalPages(itemCount, pageSize) {
  if (pageSize === "all") {
    return 1;
  }

  return Math.max(1, Math.ceil(itemCount / Number(pageSize)));
}

export function getVisiblePlayers(players, page, pageSize) {
  if (pageSize === "all") {
    return players;
  }

  const size = Number(pageSize);
  const start = (page - 1) * size;

  return players.slice(start, start + size);
}

function replaceCount(template, count) {
  return String(template).replace("{{count}}", String(count));
}

export function formatPlayerTimeAgo(dateString, t, now = Date.now()) {
  if (!dateString) {
    return "-";
  }

  const time = new Date(dateString).getTime();

  if (Number.isNaN(time)) {
    return "-";
  }

  const diff = Math.max(0, Math.floor((now - time) / 1000));

  if (diff < 60) {
    return t.players.time.justNow;
  }

  const minutes = Math.floor(diff / 60);

  if (minutes < 60) {
    return replaceCount(t.players.time.minutesAgo, minutes);
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return replaceCount(t.players.time.hoursAgo, hours);
  }

  return replaceCount(t.players.time.daysAgo, Math.floor(hours / 24));
}
