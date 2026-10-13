import { RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo } from "react";

import { getEnabledRegistrationShifts } from "../../../features/registration/registrationShifts.js";

import "../styles/players/PlayersFilters.css";

const PAGE_SIZE_OPTIONS = [10, 20, 50, "all"];

function PlayersFilters({
  t,
  players,
  filters,
  setFilters,
  onReset,
  availableShifts = {},
  pageSize = 10,
  setPageSize,
}) {
  const alliances = useMemo(() => {
    return [
      ...new Set(players.map((player) => player.alliance).filter(Boolean)),
    ].sort((a, b) => String(a).localeCompare(String(b)));
  }, [players]);

  const enabledShifts = useMemo(() => {
    const configured = getEnabledRegistrationShifts(availableShifts);
    const present = players.map((player) => player.shift).filter(Boolean);

    return [...new Set([...configured, ...present])];
  }, [availableShifts, players]);

  useEffect(() => {
    if (filters.shift !== "all" && !enabledShifts.includes(filters.shift)) {
      setFilters((current) => ({
        ...current,
        shift: "all",
      }));
    }
  }, [enabledShifts, filters.shift, setFilters]);

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <div className="admin-players-filters">
      <label className="admin-players-search">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          value={filters.search}
          placeholder={t.filters.search}
          aria-label={t.filters.search}
          onChange={(event) => updateFilter("search", event.target.value)}
        />
      </label>

      <select
        value={filters.alliance}
        onChange={(event) => updateFilter("alliance", event.target.value)}
        aria-label={t.filters.allAlliance}
      >
        <option value="all">{t.filters.allAlliance}</option>
        {alliances.map((alliance) => (
          <option key={alliance} value={alliance}>
            {alliance}
          </option>
        ))}
      </select>

      <select
        value={filters.troopType}
        onChange={(event) => updateFilter("troopType", event.target.value)}
        aria-label={t.filters.allTroops}
      >
        <option value="all">{t.filters.allTroops}</option>
        <option value="fighter">{t.troops.fighter}</option>
        <option value="rider">{t.troops.rider}</option>
        <option value="shooter">{t.troops.shooter}</option>
      </select>

      <select
        value={filters.shift}
        onChange={(event) => updateFilter("shift", event.target.value)}
        aria-label={t.filters.allShifts}
      >
        <option value="all">{t.filters.allShifts}</option>
        {enabledShifts.map((shift) => (
          <option key={shift} value={shift}>
            {t.shifts[shift]}
          </option>
        ))}
      </select>

      <select
        value={filters.captain}
        onChange={(event) => updateFilter("captain", event.target.value)}
        aria-label={t.filters.captain}
      >
        <option value="all">{t.filters.captainAll}</option>
        <option value="yes">{t.filters.captainYes}</option>
        <option value="no">{t.filters.captainNo}</option>
      </select>

      <select
        value={filters.ruleStatus}
        onChange={(event) => updateFilter("ruleStatus", event.target.value)}
        aria-label={t.filters.ruleStatus}
      >
        <option value="all">{t.filters.ruleStatusAll}</option>
        <option value="attention">{t.filters.ruleStatusAttention}</option>
        <option value="ok">{t.filters.ruleStatusOk}</option>
      </select>

      <select
        className="admin-players-page-size"
        value={pageSize}
        onChange={(event) =>
          setPageSize?.(
            event.target.value === "all" ? "all" : Number(event.target.value),
          )
        }
        aria-label={t.filters.perPage}
        title={t.filters.perPage}
      >
        {PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size === "all"
              ? t.filters.perPageAll
              : t.filters.perPageCount.replace("{{count}}", String(size))}
          </option>
        ))}
      </select>

      <button type="button" className="admin-players-reset" onClick={onReset}>
        <RotateCcw size={18} aria-hidden="true" />
        <span>{t.actions.reset}</span>
      </button>
    </div>
  );
}

export default PlayersFilters;
