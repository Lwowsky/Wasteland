function normalizeText(value) {
  return String(value ?? "").toLocaleLowerCase();
}

function getSortValue(player, field) {
  switch (field) {
    case "nickname":
      return normalizeText(player.nickname);
    case "alliance":
      return normalizeText(player.alliance);
    case "troopType":
      return normalizeText(player.troopType);
    case "tier":
      return Number(String(player.tier ?? "").replace(/\D/g, "") || 0);
    case "lairLevel":
      return Number(player.lairLevel ?? 0);
    case "marchSize":
      return Number(player.marchSize ?? 0);
    case "rallySize":
      return Number(player.rallySize ?? 0);
    case "shift":
      return normalizeText(player.shift);
    case "captain":
      return player.captain ? 1 : 0;
    case "readyAttack":
      return player.readyAttack ? 1 : 0;
    default:
      return "";
  }
}

/** Return a sorted copy; leave the original list unchanged. */
export function sortPlayers(players, sort, language) {
  if (!sort.field) return players;

  return [...players].sort((a, b) => {
    const first = getSortValue(a, sort.field);
    const second = getSortValue(b, sort.field);
    const result =
      typeof first === "number" && typeof second === "number"
        ? first - second
        : String(first).localeCompare(
            String(second),
            language === "uk" ? "uk" : "en",
          );

    return sort.direction === "asc" ? result : -result;
  });
}
