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

import "./Home.css";

function Home() {
  const { t, language, eventLoading, registrationConfig } = useOutletContext();

  const [dashboardStats, setDashboardStats] = useState(EMPTY_PUBLIC_STATS);

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
            <StatsSection t={t} dashboardStats={dashboardStats} />

            <CountdownSection t={t} registrationConfig={registrationConfig} />

            <OverviewSection
              t={t}
              dashboardStats={dashboardStats}
              recentPlayers={recentPlayers}
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
