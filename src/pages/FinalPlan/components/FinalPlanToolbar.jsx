import { useState } from "react";
import { Download, FileText, Languages, Share2 } from "lucide-react";
import FinalPlanLanguageModal from "./FinalPlanLanguageModal.jsx";
import { formatFinalPlanTxt } from "../services/finalPlanText.js";
import { captureFinalPlanPng } from "../services/finalPlanPngExport.js";

function saveText(text, filename) {
  const blob = new Blob(["\uFEFF", text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Release the object URL after the click reaches the browser's download handler.
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function FinalPlanToolbar({
  t, activeShift, setActiveShift, boardRef, planByShift,
  language, languages, setLanguages, shifts = ["shift1", "shift2"],
  children,
}) {
  const [languageOpen, setLanguageOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const copy = t.finalPlan.toolbar;

  const txt = () => formatFinalPlanTxt({ planByShift, shifts, selectedLanguages: languages, t, locale: language });
  const downloadTxt = () => saveText(txt(), "wasteland-final-plan-all-shifts.txt");

  async function downloadPng() {
    const board = boardRef?.current;
    if (!board || exporting) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      // Capture an off-screen, fixed-width board rather than the responsive on-screen board.
      const dataUrl = await captureFinalPlanPng(board, toPng);
      const link = document.createElement("a");
      link.download = `wasteland-final-plan-${activeShift}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Final plan PNG export:", error);
      // Existing UI is a normal browser page, no browser alert/confirm popup.
      setExportError(copy.exportFailed);
    } finally {
      setExporting(false);
    }
  }
  const [exportError, setExportError] = useState("");

  async function sharePlan() {
    const text = txt();
    try {
      if (navigator.share) await navigator.share({ title: t.finalPlan.title, text });
      else await navigator.clipboard.writeText(text);
    } catch (error) {
      if (error.name !== "AbortError") setExportError(copy.exportFailed);
    }
  }

  return (
    <>
      <div className="final-plan-toolbar">
        <div className="final-plan-toolbar__shifts">
          {shifts.map((shift) => (
            <button key={shift} type="button" aria-pressed={activeShift === shift}
              className={activeShift === shift ? "final-plan-toolbar__button final-plan-toolbar__button--active" : "final-plan-toolbar__button"}
              onClick={() => setActiveShift(shift)}>{t.finalPlan[shift] || shift}</button>
          ))}
        </div>
        <div className="final-plan-toolbar__actions">
          <button type="button" className="final-plan-toolbar__button" onClick={() => setLanguageOpen(true)}>
            <Languages size={18} />{copy.language} ({languages.length})
          </button>
          <button type="button" className="final-plan-toolbar__button" onClick={downloadTxt}>
            <FileText size={18} />{copy.txt}
          </button>
          <button type="button" className="final-plan-toolbar__button" disabled={exporting} onClick={downloadPng}>
            <Download size={18} />{copy.png}
          </button>
          <button type="button" className="final-plan-toolbar__button" onClick={sharePlan}>
            <Share2 size={18} />{t.finalPlan.share}
          </button>
          {children}
        </div>
      </div>
      {exportError && <p className="final-plan-export-error" role="alert">{exportError}</p>}
      <FinalPlanLanguageModal open={languageOpen} onClose={() => setLanguageOpen(false)}
        languages={languages} onChange={setLanguages} language={language} />
    </>
  );
}

export default FinalPlanToolbar;
