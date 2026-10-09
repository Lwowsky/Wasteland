import { useCallback, useMemo, useState } from "react";

import { getPlayerRuleIssues } from "./playerRuleIssues.js";

export const DEFAULT_PLAYER_FILTERS = {
  search: "",
  alliance: "all",
  troopType: "all",
  shift: "all",
  captain: "all",
  ruleStatus: "all",
};

export const DEFAULT_PLAYER_SORT = {
  field: "",
  direction: "asc",
};

const DEFAULT_PAGE_SIZE = 10;

export default function usePlayersAdminTable(players, registrationSettings) {
  const [filters, setFilters] = useState(DEFAULT_PLAYER_FILTERS);
  const [sort, setSort] = useState(DEFAULT_PLAYER_SORT);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const playersWithIssues = useMemo(
    () =>
      players.map((player) => ({
        player,
        issues: getPlayerRuleIssues(player, registrationSettings),
      })),
    [players, registrationSettings],
  );

  const attentionCount = useMemo(
    () => playersWithIssues.filter(({ issues }) => issues.length > 0).length,
    [playersWithIssues],
  );

  const filteredPlayers = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return playersWithIssues
      .filter(({ player, issues }) => {
        const nickname = String(player.nickname || "").toLowerCase();
        const alliance = String(player.alliance || "").toLowerCase();

        const matchesSearch =
          !search || nickname.includes(search) || alliance.includes(search);
        const matchesAlliance =
          filters.alliance === "all" || player.alliance === filters.alliance;
        const matchesTroop =
          filters.troopType === "all" || player.troopType === filters.troopType;
        const matchesShift =
          filters.shift === "all" || player.shift === filters.shift;
        const matchesCaptain =
          filters.captain === "all" ||
          (filters.captain === "yes" && player.captain === true) ||
          (filters.captain === "no" && player.captain !== true);
        const matchesRuleStatus =
          filters.ruleStatus === "all" ||
          (filters.ruleStatus === "attention" && issues.length > 0) ||
          (filters.ruleStatus === "ok" && issues.length === 0);

        return (
          matchesSearch &&
          matchesAlliance &&
          matchesTroop &&
          matchesShift &&
          matchesCaptain &&
          matchesRuleStatus
        );
      })
      .map(({ player }) => player);
  }, [playersWithIssues, filters]);

  const setFiltersAndResetPage = useCallback((nextFilters) => {
    setFilters((current) =>
      typeof nextFilters === "function" ? nextFilters(current) : nextFilters,
    );
    setPage(1);
  }, []);

  const resetTable = useCallback(() => {
    setFilters(DEFAULT_PLAYER_FILTERS);
    setSort(DEFAULT_PLAYER_SORT);
    setPage(1);
  }, []);

  const changePageSize = useCallback((nextSize) => {
    setPageSize(nextSize);
    setPage(1);
  }, []);

  return {
    filters,
    sort,
    page,
    pageSize,
    filteredPlayers,
    attentionCount,
    setSort,
    setPage,
    setFilters: setFiltersAndResetPage,
    setPageSize: changePageSize,
    resetTable,
  };
}
