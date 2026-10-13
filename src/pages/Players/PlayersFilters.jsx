import { publicAsset } from "../../utils/publicAsset.js";

import {
  Search,
  Flag,
  Swords,
  Clock3,
  UserRoundCheck,
  Rows3,
  RotateCcw,
} from "lucide-react";

function FilterSelect({ icon: Icon, value, onChange, children, ariaLabel }) {
  return (
    <div className="players-filter players-filter--select">
      <span className="players-filter__icon" aria-hidden="true">
        <Icon size={16} />
      </span>

      <select value={value} onChange={onChange} aria-label={ariaLabel}>
        {children}
      </select>
    </div>
  );
}

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
        <img
          src={publicAsset("/images/navigation/filter-icon.webp")}
          width={28}
          height={28}
          alt=""
          aria-hidden="true"
        />
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

        <FilterSelect
          icon={Flag}
          value={filters.alliance}
          onChange={(event) => onFilterChange("alliance", event.target.value)}
          ariaLabel={t.players.filters.alliance}
        >
          <option value="all">
            {t.players.filters.alliance}: {t.players.filters.all}
          </option>

          {alliances.map((alliance) => (
            <option key={alliance} value={alliance}>
              {alliance}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          icon={Swords}
          value={filters.troop}
          onChange={(event) => onFilterChange("troop", event.target.value)}
          ariaLabel={t.players.filters.troopType}
        >
          <option value="all">
            {t.players.filters.troopType}: {t.players.filters.all}
          </option>
          <option value="fighter">{t.players.troops.fighter}</option>
          <option value="rider">{t.players.troops.rider}</option>
          <option value="shooter">{t.players.troops.shooter}</option>
        </FilterSelect>

        <FilterSelect
          icon={Clock3}
          value={filters.shift}
          onChange={(event) => onFilterChange("shift", event.target.value)}
          ariaLabel={t.players.filters.shift}
        >
          <option value="all">
            {t.players.filters.shift}: {t.players.filters.all}
          </option>

          {enabledShifts.map((shift) => (
            <option key={shift} value={shift}>
              {t.players.shifts[shift]}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          icon={UserRoundCheck}
          value={filters.captain}
          onChange={(event) => onFilterChange("captain", event.target.value)}
          ariaLabel={t.players.filters.captain}
        >
          <option value="all">
            {t.players.filters.captain}: {t.players.filters.all}
          </option>
          <option value="yes">{t.players.filters.readyCaptain}</option>
          <option value="no">{t.players.filters.notCaptain}</option>
        </FilterSelect>

        <FilterSelect
          icon={Rows3}
          value={pageSize}
          onChange={(event) => onPageSizeChange(event.target.value)}
          ariaLabel={t.players.filters.perPage}
        >
          <option value={10}>{t.players.filters.perPage10}</option>
          <option value={20}>{t.players.filters.perPage20}</option>
          <option value={50}>{t.players.filters.perPage50}</option>
          <option value="all">{t.players.filters.perPageAll}</option>
        </FilterSelect>

        <button
          type="button"
          className="players-filters__reset"
          onClick={onReset}
        >
          <RotateCcw size={16} aria-hidden="true" />
          <span>{t.players.filters.reset}</span>
        </button>
      </div>
    </section>
  );
}

export default PlayersFilters;
