import { TURRET_IDS } from "../../../features/turrets/plannerConstants.js";
import { comparePlayersByTier } from "../../../features/turrets/tierPriority.js";
import { formatMarch } from "../../../utils/formatMarch.js";
import { getPlanBoardTranslations, getPlanShiftHeading, planLanguageLabels } from "../data/finalPlanLanguages.js";

const TURR = "───────────────────────────────";

function playerDescription(player, locale) {
  return [player.nickname, player.alliance || "—", player.tier || "—",
    formatMarch(player.marchSize, locale)].join(" ✦ ");
}

// The source of truth for TXT downloads and native sharing. Includes EVERY
// published/visible shift, not only the currently selected board tab.
export function formatFinalPlanTxt({ planByShift, shifts, selectedLanguages, t, locale = "uk" }) {
  const localized = getPlanBoardTranslations(t, selectedLanguages, locale).finalPlan;
  const lines = [];
  for (const shift of shifts) {
    const towers = planByShift?.[shift];
    if (!towers) continue;
    lines.push("════════════════════════════════", `◆ ${getPlanShiftHeading(shift, selectedLanguages)}`,
      "════════════════════════════════", "");
    for (const towerId of TURRET_IDS) {
      const data = towers[towerId] || {};
      lines.push(`┌${TURR}`, `│ ${planLanguageLabels(selectedLanguages, (d) => d.towers[towerId])}`,
        `│ ${data.troopType ? planLanguageLabels(selectedLanguages, (d) => d.troops[data.troopType]) : "—"}`,
        `├─ ${localized.labels.captain} ──────────`);
      if (data.captain) lines.push(`│ ${playerDescription(data.captain, locale)}`);
      else lines.push("│ —");
      lines.push(`├─ ${localized.labels.players} ──────────`);
      const helpers = [...(data.players || [])].sort(comparePlayersByTier);
      if (!helpers.length) lines.push("│ —");
      helpers.forEach((helper) => lines.push(`│ ${playerDescription(helper, locale)}`));
      lines.push(`└${TURR}`, "");
    }
  }
  lines.push(localized.textExport.signature);
  return lines.join("\n");
}
