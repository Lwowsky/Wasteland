import { useEffect, useState } from "react";

import { useOutletContext } from "react-router-dom";

import Page from "../../components/Page/Page.jsx";
import PageMeta from "../../components/PageMeta/PageMeta.jsx";
import PagePanel from "../../components/PagePanel/PagePanel.jsx";

import {
  getPublicStats,
  getRecentPlayers,
} from "../../features/players/publicPlayersApi.js";

import StatsSection from "./sections/StatsSection.jsx";
import CountdownSection from "./sections/CountdownSection.jsx";
import OverviewSection from "./sections/OverviewSection.jsx";
import NavigationSection from "./sections/NavigationSection.jsx";

import { EMPTY_PUBLIC_STATS } from "../../../shared/publicStatsConfig.js";
import { getPublicCycleViewState, isSnapshotForActivePeriod } from "../../../shared/registrationCycle.js";
import { isPublicSnapshotEnabled } from "../../features/players/publicSnapshot.js";
import useNow from "../../hooks/useNow.js";

import "./Home.css";

function Home() {
  const { t, language, eventLoading, registrationConfig } = useOutletContext();
  const now = useNow(60_000);


  const [dashboardStats, setDashboardStats] = useState(EMPTY_PUBLIC_STATS);
  const expectedPeriodId = registrationConfig?.period?.id;
  // Even a cached GitHub summary must never show last cycle's counters or
  // names after Monday's cutoff or a manual reset to another period.
  const outdatedSummary = isPublicSnapshotEnabled() &&
    (!registrationConfig?.settings || !isSnapshotForActivePeriod(
      dashboardStats, expectedPeriodId, now));
  const cycleClosed = outdatedSummary || (registrationConfig?.settings?.cycleMode !== "manual" &&
    (!registrationConfig?.settings || !getPublicCycleViewState(registrationConfig.settings, now).visible));

  const [recentPlayers, setRecentPlayers] = useState([]);

  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadHomeData() {
      try {
        const [stats, recent] = await Promise.all([
          getPublicStats(),
          getRecentPlayers(5),
        ]);

        if (!cancelled) {
          setDashboardStats(stats);
          setRecentPlayers(recent);
        }
      } catch (error) {
        console.error("Load home data:", error);
      } finally {
        if (!cancelled) {
          setDataLoading(false);
        }
      }
    }

    loadHomeData();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PageMeta
        title={t.seo.home.title}
        description={t.seo.home.description}
        language={language}
      />

      <Page>
        <div className="home-dashboard">
          <PagePanel>
            <StatsSection t={t} dashboardStats={cycleClosed ? EMPTY_PUBLIC_STATS : dashboardStats} />

            <CountdownSection t={t} registrationConfig={registrationConfig} />

            <OverviewSection
              t={t}
              dashboardStats={cycleClosed ? EMPTY_PUBLIC_STATS : dashboardStats}
              recentPlayers={cycleClosed ? [] : recentPlayers}
            />

            <NavigationSection t={t} language={language} />

            {(eventLoading || dataLoading) && (
              <p className="home-loading">{t.home.dashboard.loading}</p>
            )}
          </PagePanel>
        </div>
      </Page>
    </>
  );
}

export default Home;
