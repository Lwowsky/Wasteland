import { useMemo } from "react";

import { Users } from "lucide-react";
import { useOutletContext } from "react-router-dom";

import Page from "../../components/Page/Page.jsx";
import PageMeta from "../../components/PageMeta/PageMeta.jsx";
import PagePanel from "../../components/PagePanel/PagePanel.jsx";
import { ROUTES } from "../../config/routes.js";
import { getEnabledRegistrationShifts } from "../../features/registration/registrationShifts.js";

import PlayersFilters from "./PlayersFilters.jsx";
import PlayersStats from "./PlayersStats.jsx";
import PlayersTable from "./PlayersTable.jsx";
import usePlayersTable from "./usePlayersTable.js";
import usePublicPlayers from "./usePublicPlayers.js";

import "./Players.css";

function Players() {
  const { t, language, registrationConfig } = useOutletContext();
  const { players, loading, loadError } = usePublicPlayers();

  const enabledShifts = useMemo(
    () =>
      getEnabledRegistrationShifts(
        registrationConfig?.settings?.availableShifts || {},
      ),
    [registrationConfig?.settings?.availableShifts],
  );

  const table = usePlayersTable(players, enabledShifts);

  return (
    <>
      <PageMeta
        title={t.players.title}
        description={t.players.text}
        language={language}
        path={ROUTES.players}
      />

      <Page>
        <div className="players-page">
          <PagePanel>
            <div className="players-page__header">
              <div className="players-page__header-icon">
                <Users size={26} aria-hidden="true" />
              </div>

              <div>
                <h1 className="players-page__title">{t.players.title}</h1>
                <p className="players-page__text">{t.players.text}</p>
              </div>
            </div>

            <PlayersStats
              stats={table.stats}
              enabledShifts={enabledShifts}
              t={t}
            />

            <PlayersFilters
              t={t}
              filters={table.filters}
              pageSize={table.pageSize}
              alliances={table.alliances}
              enabledShifts={enabledShifts}
              onFilterChange={table.actions.updateFilter}
              onPageSizeChange={table.actions.changePageSize}
              onReset={table.actions.resetFilters}
            />

            <PlayersTable
              t={t}
              loading={loading}
              loadError={loadError}
              filteredCount={table.filteredCount}
              visiblePlayers={table.visiblePlayers}
              pageSize={table.pageSize}
              pagination={table.pagination}
              onPreviousPage={table.actions.goToPreviousPage}
              onNextPage={table.actions.goToNextPage}
            />
          </PagePanel>
        </div>
      </Page>
    </>
  );
}

export default Players;
