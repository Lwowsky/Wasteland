import { useMemo, useState } from "react";

import {
  filterPlayers,
  getPlayerAlliances,
  getPlayerStats,
  getTotalPages,
  getVisiblePlayers,
} from "./playersTable.js";

const DEFAULT_FILTERS = {
  search: "",
  alliance: "all",
  troop: "all",
  shift: "all",
  captain: "all",
};

function usePlayersTable(players, enabledShifts) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const effectiveFilters = useMemo(
    () => ({
      ...filters,
      shift:
        filters.shift === "all" || enabledShifts.includes(filters.shift)
          ? filters.shift
          : "all",
    }),
    [filters, enabledShifts],
  );

  const alliances = useMemo(() => getPlayerAlliances(players), [players]);

  const filteredPlayers = useMemo(
    () => filterPlayers(players, effectiveFilters),
    [players, effectiveFilters],
  );

  const stats = useMemo(
    () => getPlayerStats(filteredPlayers),
    [filteredPlayers],
  );

  const totalPages = useMemo(
    () => getTotalPages(filteredPlayers.length, pageSize),
    [filteredPlayers.length, pageSize],
  );

  const safePage = Math.min(page, totalPages);

  const visiblePlayers = useMemo(
    () => getVisiblePlayers(filteredPlayers, safePage, pageSize),
    [filteredPlayers, safePage, pageSize],
  );

  function updateFilter(name, value) {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
    setPage(1);
  }

  function changePageSize(value) {
    setPageSize(value === "all" ? "all" : Number(value));
    setPage(1);
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  function goToPreviousPage() {
    setPage((current) => Math.max(1, current - 1));
  }

  function goToNextPage() {
    setPage((current) => Math.min(totalPages, current + 1));
  }

  return {
    filters: effectiveFilters,
    pageSize,
    alliances,
    stats,
    filteredCount: filteredPlayers.length,
    visiblePlayers,
    pagination: {
      page: safePage,
      totalPages,
    },
    actions: {
      updateFilter,
      changePageSize,
      resetFilters,
      goToPreviousPage,
      goToNextPage,
    },
  };
}

export default usePlayersTable;
