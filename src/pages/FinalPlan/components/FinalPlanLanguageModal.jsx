import { publicAsset } from "../../../utils/publicAsset.js";
import uk from "../../../i18n/locales/uk/content/finalPlan.json" with { type: "json" };
import en from "../../../i18n/locales/en/content/finalPlan.json" with { type: "json" };
import Modal from "../../../components/Modal/Modal.jsx";
import { PLAN_LANGUAGE_CHOICES, normalizePlanLanguages } from "../data/finalPlanLanguages.js";
import "./FinalPlanLanguageModal.css";

export default function FinalPlanLanguageModal({ open, onClose, languages, onChange, language = "uk" }) {
  const copy = (language === "en" ? en : uk).languageModal;
  function toggle(code, checked) {
    const next = new Set(languages);
    if (checked) next.add(code); else next.delete(code);
    onChange(normalizePlanLanguages([...next]));
  }
  return (
    <Modal open={open} onClose={onClose} width="820px"
      title={copy.title} subtitle={copy.subtitle}
      closeLabel={copy.close} className="final-plan-language-modal"
      footer={<button type="button" className="final-plan-language-modal__done" onClick={onClose}>
        {copy.done}
      </button>}>
      <div className="final-plan-language-grid">
        {PLAN_LANGUAGE_CHOICES.map(({ code, fixed }) => {
          const selected = languages.includes(code);
          return (
            <label key={code} className={`final-plan-language-option${selected ? " is-selected" : ""}`}>
              <input type="checkbox" checked={selected} disabled={Boolean(fixed)}
                onChange={(event) => toggle(code, event.target.checked)} />
              <span className="final-plan-language-option__flag" aria-hidden="true">
                <img src={publicAsset(`/images/final-plan/lang/${code}.svg`)} alt="" width="38" height="38" />
              </span>
              <span>{copy.choices[code]}</span>
              {fixed && <span className="final-plan-language-option__fixed" title={copy.alwaysOn}>✓</span>}
            </label>
          );
        })}
      </div>
      <p className="final-plan-language-modal__help">{copy.help}</p>
    </Modal>
  );
}
