import { Check } from "lucide-react";

import { useEffect, useState } from "react";

import { PLAN_LANGUAGES } from "../data/planLanguages.js";

const STORAGE_KEY = "wasteland-final-plan-extra-languages";

function getSavedLanguages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function PlanLanguageMenu({ t, language }) {
  const [extraLanguages, setExtraLanguages] = useState(getSavedLanguages);

  useEffect(() => {
    const clean = extraLanguages.filter((code) => code !== language);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  }, [extraLanguages, language]);

  function toggleLanguage(code) {
    if (code === language) {
      return;
    }

    setExtraLanguages((current) =>
      current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code],
    );
  }

  return (
    <div className="final-plan-language-menu">
      <div className="final-plan-language-menu__head">
        <strong>{t.finalPlan.planLanguage}</strong>

        <p>{t.finalPlan.planLanguageText}</p>
      </div>

      <div className="final-plan-language-list">
        {PLAN_LANGUAGES.map((item) => {
          const siteLanguage = item.code === language;

          const active = siteLanguage || extraLanguages.includes(item.code);

          return (
            <button
              key={item.code}
              type="button"
              className={
                active
                  ? "final-plan-language-option final-plan-language-option--active"
                  : "final-plan-language-option"
              }
              disabled={siteLanguage}
              onClick={() => toggleLanguage(item.code)}
            >
              <span>{item.label}</span>

              {siteLanguage && <small>{t.finalPlan.siteLanguage}</small>}

              {active && <Check size={17} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PlanLanguageMenu;
