import { useEffect, useState } from "react";
import {
  defaultPlanLanguagesForLocale, normalizePlanLanguages, PLAN_LANGUAGE_STORAGE_KEY,
} from "../data/finalPlanLanguages.js";

function readInitialChoice() {
  try {
    const raw = window.localStorage.getItem(PLAN_LANGUAGE_STORAGE_KEY);
    if (raw) return { codes: normalizePlanLanguages(JSON.parse(raw)), customized: true };
  } catch { /* localStorage might be unavailable */ }
  return { codes: null, customized: false };
}

// We only write an actual user selection. Otherwise changing /uk to /en
// changes the default without leaving a stale choice in localStorage.
export default function usePlanLanguages(locale = "en") {
  const [choice, setChoice] = useState(readInitialChoice);
  useEffect(() => {
    if (!choice.customized) return;
    try { window.localStorage.setItem(PLAN_LANGUAGE_STORAGE_KEY, JSON.stringify(choice.codes)); }
    catch { /* Browsers with storage disabled still work for this visit. */ }
  }, [choice]);
  const browserLocale = typeof navigator !== "undefined" ? navigator.language : "";
  const codes = choice.customized ? choice.codes : defaultPlanLanguagesForLocale(locale, browserLocale);
  const choose = (next) => setChoice({ codes: normalizePlanLanguages(next), customized: true });
  return [codes, choose, choice.customized];
}
