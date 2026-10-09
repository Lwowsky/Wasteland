import { Filter, Search } from "lucide-react";

function PlayersFilters({
  t,
  filters,
  pageSize,
  alliances,
  enabledShifts,
  onFilterChange,
  onPageSizeChange,
  onReset,
}) {
  return (
    <section className="players-filters">
      <div className="players-filters__title">
        <Filter size={18} aria-hidden="true" />
        <span>{t.players.filters.title}</span>
      </div>

      <div className="players-filters__row">
        <div className="players-filter players-filter--search">
          <Search size={18} aria-hidden="true" />

          <input
            type="text"
            value={filters.search}
            onChange={(event) => onFilterChange("search", event.target.value)}
            placeholder={t.players.filters.searchPlaceholder}
          />
        </div>

        <select
          value={filters.alliance}
          onChange={(event) => onFilterChange("alliance", event.target.value)}
        >
          <option value="all">
            {t.players.filters.alliance}: {t.players.filters.all}
          </option>

          {alliances.map((alliance) => (
            <option key={alliance} value={alliance}>
              {alliance}
            </option>
          ))}
        </select>

        <select
          value={filters.troop}
          onChange={(event) => onFilterChange("troop", event.target.value)}
        >
          <option value="all">
            {t.players.filters.troopType}: {t.players.filters.all}
          </option>
          <option value="fighter">{t.players.troops.fighter}</option>
          <option value="rider">{t.players.troops.rider}</option>
          <option value="shooter">{t.players.troops.shooter}</option>
        </select>

        <select
          value={filters.shift}
          onChange={(event) => onFilterChange("shift", event.target.value)}
        >
          <option value="all">
            {t.players.filters.shift}: {t.players.filters.all}
          </option>

          {enabledShifts.map((shift) => (
            <option key={shift} value={shift}>
              {t.players.shifts[shift]}
            </option>
          ))}
        </select>

        <select
          value={filters.captain}
          onChange={(event) => onFilterChange("captain", event.target.value)}
        >
          <option value="all">
            {t.players.filters.captain}: {t.players.filters.all}
          </option>
          <option value="yes">{t.players.filters.readyCaptain}</option>
          <option value="no">{t.players.filters.notCaptain}</option>
        </select>

        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(event.target.value)}
          aria-label={t.players.filters.perPage}
        >
          <option value={10}>{t.players.filters.perPage10}</option>
          <option value={20}>{t.players.filters.perPage20}</option>
          <option value={50}>{t.players.filters.perPage50}</option>
          <option value="all">{t.players.filters.perPageAll}</option>
        </select>

        <button
          type="button"
          className="players-filters__reset"
          onClick={onReset}
        >
          {t.players.filters.reset}
        </button>
      </div>
    </section>
  );
}

export default PlayersFilters;
