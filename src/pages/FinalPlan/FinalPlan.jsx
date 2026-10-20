import { formatMediumDateTime } from "../../utils/date.js";
import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import Page from "../../components/Page/Page.jsx";
import PageMeta from "../../components/PageMeta/PageMeta.jsx";
import PagePanel from "../../components/PagePanel/PagePanel.jsx";
import AccessStatusCard from "../../components/AccessStatusCard/AccessStatusCard.jsx";
import { publicAsset } from "../../utils/publicAsset.js";
import "../../features/contentAccess/ContentAccessGate.css";
import { ROUTES } from "../../config/routes.js";
import FinalPlanToolbar from "./components/FinalPlanToolbar.jsx";
import FinalPlanBoard from "./components/FinalPlanBoard.jsx";
import usePlanLanguages from "./components/usePlanLanguages.js";
import { getPlanBoardTranslations } from "./data/finalPlanLanguages.js";
import { useVerifiedContentAccess } from "../../features/contentAccess/ContentAccessContext.js";
import { getPublicFinalPlan } from "./services/finalPlanApi.js";
import { PLANNER_SHIFTS } from "../../features/turrets/plannerConstants.js";
import "./FinalPlan.css";

function FinalPlan() {
  const { t, language } = useOutletContext();
  const verifiedStatus = useVerifiedContentAccess("final_plan");
  const boardRef = useRef(null);
  const [userLanguages, setUserLanguages, hasChosenLanguages] = usePlanLanguages(language);
  const [activeShift, setActiveShift] = useState("shift1");
  const [plan, setPlan] = useState(null);
  const [publishedAt, setPublishedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getPublicFinalPlan(verifiedStatus).then((response) => {
      if (!active) return;
      setPlan(response.plan);
      setPublishedAt(response.publishedAt || null);
    }).catch((reason) => {
      console.error("Load published final plan:", reason);
      if (active) setError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [reloadKey, verifiedStatus]);

  function refresh() {
    setLoading(true);
    setError(false);
    setReloadKey((previous) => previous + 1);
  }

  // Published language choices are shared with every visitor. Visitors may
  // additionally customize their own view without changing the publication.
  const languages = hasChosenLanguages ? userLanguages : plan?.__languages || userLanguages;
  const boardT = getPlanBoardTranslations(t, languages, language);
  function chooseLanguages(codes) { setUserLanguages(codes); }

  const shifts = PLANNER_SHIFTS.filter((shift) => Object.hasOwn(plan || {}, shift));
  const currentShift = shifts.includes(activeShift) ? activeShift : shifts[0];
  const shiftPlan = plan?.[currentShift];
  // The unpublished state must match the existing closed/private cards,
  // rather than showing a thin unstyled status strip inside a huge board.
  if (!loading && !error && !shiftPlan) {
    return (
      <>
        <PageMeta title={t.finalPlan.title} description={t.finalPlan.title}
          language={language} path={ROUTES.finalPlan} />
        <Page containerClassName="content-access-container">
          <div className="content-access-page">
            <AccessStatusCard
              iconSrc={publicAsset("/images/admin/icons/final-plan.webp")}
              title={t.finalPlan.title}
              heading={t.finalPlan.unpublishedTitle}
              text={t.finalPlan.notPublished}
            >
              <button type="button" className="final-plan-unpublished-refresh"
                onClick={refresh}>{t.finalPlan.refreshPlan}</button>
            </AccessStatusCard>
          </div>
        </Page>
      </>
    );
  }
  return (
    <>
      <PageMeta title={t.finalPlan.title} description={t.finalPlan.title}
        language={language} path={ROUTES.finalPlan} />
      <Page containerClassName="final-plan-container">
        <div className="final-plan-page">
          <PagePanel className="final-plan-panel">
            <div className="final-plan-header"><h1>{t.finalPlan.title}</h1>
              <button type="button" className="final-plan-toolbar__button" onClick={refresh}
                disabled={loading}>{t.finalPlan.refreshPlan}</button>
            </div>
            {loading ? <p className="final-plan-state" role="status">{t.finalPlan.loadingPlan}</p>
              : error ? <p className="final-plan-state final-plan-state--error" role="alert">{t.finalPlan.loadFailed}</p>
              : <>
                {publishedAt && <p className="final-plan-published-date">
                  {t.finalPlan.lastPublished.replace("{{date}}", formatMediumDateTime(publishedAt, language))}
                </p>}
                <FinalPlanToolbar t={t} activeShift={currentShift} shifts={shifts}
                  setActiveShift={setActiveShift} boardRef={boardRef} planByShift={plan}
                  language={language} languages={languages} setLanguages={chooseLanguages} />
                <FinalPlanBoard ref={boardRef} t={boardT} language={language}
                  activeShift={currentShift} plan={shiftPlan} languages={languages} />
              </>}
          </PagePanel>
        </div>
      </Page>
    </>
  );
}
export default FinalPlan;
