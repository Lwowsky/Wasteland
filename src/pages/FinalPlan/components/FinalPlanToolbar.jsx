import { Download, FileText, Globe2, Share2 } from "lucide-react";

import { useState } from "react";

import PlanLanguageMenu from "./PlanLanguageMenu.jsx";

function FinalPlanToolbar({
  t,
  language,
  activeShift,
  setActiveShift,
  boardRef,
  plan,
}) {
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  async function downloadPng() {
    if (!boardRef.current) {
      return;
    }

    const { toPng } = await import("html-to-image");

    const dataUrl = await toPng(boardRef.current, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#edf6ff",
    });

    const link = document.createElement("a");

    link.download = `wasteland-final-plan-${activeShift}.png`;

    link.href = dataUrl;

    link.click();
  }

  function createTxt() {
    const lines = [t.finalPlan.title, ""];

    Object.entries(plan).forEach(([towerId, tower]) => {
      lines.push(t.finalPlan.towers[towerId] || towerId);

      if (tower.captain) {
        lines.push(
          t.finalPlan.textExport.captain.replace(
            "{{name}}",
            tower.captain.nickname,
          ),
        );
      }

      tower.players?.forEach((player) => {
        lines.push(`- ${player.nickname}`);
      });

      lines.push("");
    });

    lines.push(t.finalPlan.textExport.signature);

    return lines.join("\n");
  }

  function downloadTxt() {
    const blob = new Blob([createTxt()], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = `wasteland-final-plan-${activeShift}.txt`;

    link.click();

    URL.revokeObjectURL(url);
  }

  async function sharePlan() {
    const text = createTxt();

    if (navigator.share) {
      try {
        await navigator.share({
          title: t.finalPlan.title,
          text,
        });

        return;
      } catch {
        return;
      }
    }

    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="final-plan-toolbar">
      <button
        type="button"
        className={
          activeShift === "shift1"
            ? "final-plan-toolbar__button final-plan-toolbar__button--active"
            : "final-plan-toolbar__button"
        }
        onClick={() => setActiveShift("shift1")}
      >
        {t.finalPlan.shift1}
      </button>

      <button
        type="button"
        className={
          activeShift === "shift2"
            ? "final-plan-toolbar__button final-plan-toolbar__button--active"
            : "final-plan-toolbar__button"
        }
        onClick={() => setActiveShift("shift2")}
      >
        {t.finalPlan.shift2}
      </button>

      <div className="final-plan-language">
        <button
          type="button"
          className="final-plan-toolbar__button"
          onClick={() => setLanguageMenuOpen((current) => !current)}
        >
          <Globe2 size={18} />

          {t.finalPlan.planLanguage}
        </button>

        {languageMenuOpen && <PlanLanguageMenu t={t} language={language} />}
      </div>

      <button
        type="button"
        className="final-plan-toolbar__button"
        onClick={sharePlan}
      >
        <Share2 size={18} />

        {t.finalPlan.share}
      </button>

      <button
        type="button"
        className="final-plan-toolbar__button"
        onClick={downloadPng}
      >
        <Download size={18} />
        {t.finalPlan.formats.png}
      </button>

      <button
        type="button"
        className="final-plan-toolbar__button"
        onClick={downloadTxt}
      >
        <FileText size={18} />
        {t.finalPlan.formats.txt}
      </button>
    </div>
  );
}

export default FinalPlanToolbar;
