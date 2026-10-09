import { useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";

import Page from "../../components/Page/Page.jsx";
import PageMeta from "../../components/PageMeta/PageMeta.jsx";
import PagePanel from "../../components/PagePanel/PagePanel.jsx";

import { ROUTES } from "../../config/routes.js";

import FinalPlanToolbar from "./components/FinalPlanToolbar.jsx";
import FinalPlanBoard from "./components/FinalPlanBoard.jsx";

import { MOCK_PLAN } from "./data/mockPlan.js";

import "./FinalPlan.css";

function FinalPlan() {
  const { t, language } = useOutletContext();

  const boardRef = useRef(null);

  const [activeShift, setActiveShift] = useState("shift1");

  return (
    <>
      <PageMeta
        title={t.finalPlan.title}
        description={t.finalPlan.title}
        language={language}
        path={ROUTES.finalPlan}
      />

      <Page containerClassName="final-plan-container">
        <div className="final-plan-page">
          <PagePanel className="final-plan-panel">
            <div className="final-plan-header">
              <h1>{t.finalPlan.title}</h1>
            </div>

            <FinalPlanToolbar
              t={t}
              language={language}
              activeShift={activeShift}
              setActiveShift={setActiveShift}
              boardRef={boardRef}
              plan={MOCK_PLAN[activeShift]}
            />

            <FinalPlanBoard
              ref={boardRef}
              t={t}
              language={language}
              activeShift={activeShift}
              plan={MOCK_PLAN[activeShift]}
            />
          </PagePanel>
        </div>
      </Page>
    </>
  );
}

export default FinalPlan;
