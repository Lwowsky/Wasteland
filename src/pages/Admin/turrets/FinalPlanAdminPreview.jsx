import { useMemo, useRef, useState } from "react";
import { formatMediumDateTime } from "../../../utils/date.js";
import { toFinalPlanShape } from "../../../features/turrets/turretAssignments.js";
import FinalPlanBoard from "../../FinalPlan/components/FinalPlanBoard.jsx";
import FinalPlanToolbar from "../../FinalPlan/components/FinalPlanToolbar.jsx";
import { getPlanBoardTranslations } from "../../FinalPlan/data/finalPlanLanguages.js";
import "../../FinalPlan/FinalPlan.css";

// Exactly the same board, languages and exports as the public page.
function FinalPlanAdminPreview({ a, language, publicT, assignments, players, settings,
  activeShifts = ["shift1", "shift2"], loaded, blocked, conflicts, busy,
  canPublish, published, onPublish, onRestore, requestConfirm,
  blockedReason = "", onLanguagesChange }) {
  const [shift, setShift] = useState("shift1");
  const languages = settings.planLanguages || ["uk", "en"];
  const setLanguages = (codes) => onLanguagesChange?.(codes);
  const boardRef = useRef(null);
  const p = a.distribution.server;
  const displayedShift = activeShifts.includes(shift) ? shift : activeShifts[0];
  const planByShift = useMemo(() => Object.fromEntries(activeShifts.map((key) => [key,
    toFinalPlanShape(assignments, players, key, settings)])),
  [assignments, players, settings, activeShifts]);
  const boardT = getPlanBoardTranslations(publicT, languages, language);
  const plan = planByShift[displayedShift];

  if (!loaded) return <p className="turret-draft-feedback turret-draft-feedback--warn">{a.distribution.manual.waitForPlayers}</p>;

  function confirmPublish() {
    requestConfirm?.({ title: a.distribution.confirm?.publishTitle || a.distribution.final.publish,
      message: p.confirmPublish, onConfirm: onPublish });
  }
  function confirmRestore() {
    requestConfirm?.({ title: a.distribution.confirm?.restoreTitle || p.restorePublished,
      message: p.confirmRestore, onConfirm: onRestore, tone: "danger" });
  }
  return (
    <div className="turret-final-preview">
      <p className="turret-local-note turret-local-note--demo" role="note">{p.previewNotice}</p>
      {published && <p className="turret-draft-feedback" role="status">
        {p.lastPublished.replace("{{date}}", formatMediumDateTime(published.publishedAt, language))}
      </p>}
      {blockedReason && <p className="turret-draft-feedback turret-draft-feedback--warn" role="alert">{blockedReason}</p>}
      <FinalPlanToolbar t={publicT} language={language} activeShift={displayedShift}
        setActiveShift={setShift} planByShift={planByShift} shifts={activeShifts}
        languages={languages} setLanguages={setLanguages} boardRef={boardRef}>
        <button type="button" className="final-plan-toolbar__button final-plan-toolbar__button--active"
          onClick={confirmPublish} disabled={!canPublish || busy || blocked || conflicts.length > 0}
          title={!canPublish ? p.ownerAdminOnly : blocked ? (blockedReason || p.saveFirst) : ""}>
          {busy ? p.processing : a.distribution.final.publish}
        </button>
        <button type="button" className="final-plan-toolbar__button" onClick={confirmRestore}
          disabled={!canPublish || busy || !published}>{p.restorePublished}</button>
      </FinalPlanToolbar>
      <div className="turret-final-board turret-final-board--shared">
        <FinalPlanBoard ref={boardRef} t={boardT} language={language} languages={languages}
          activeShift={displayedShift} plan={plan} />
      </div>
    </div>
  );
}
export default FinalPlanAdminPreview;
