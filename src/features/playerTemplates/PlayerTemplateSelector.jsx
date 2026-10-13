import { useState } from "react";

import { TEMPLATE_ASSETS } from "./templateAssets.js";
import { getPlayerTemplates } from "./playerTemplatesStorage.js";
import TierBadge from "../../components/PlayerBadges/TierBadge.jsx";
import TroopBadge from "../../components/PlayerBadges/TroopBadge.jsx";

import "./PlayerTemplateSelector.css";

function PlayerTemplateSelector({ t, onApply, onSave, canSave, templateMessage }) {
  const [templates, setTemplates] = useState(() => getPlayerTemplates());
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);

  function applyTemplate() {
    if (selectedTemplate) {
      onApply(selectedTemplate);
    }
  }

  function saveTemplate() {
    onSave();
    setTemplates(getPlayerTemplates());
  }

  return (
    <section className="registration-template">
      <div className="registration-template__header">
        <img
          className="registration-template__icon"
          src={TEMPLATE_ASSETS.templates}
          alt=""
          aria-hidden="true"
        />
        <div className="registration-template__heading">
          <h2>{t.registration.template.title}</h2>
          <p>{templates.length ? t.registration.template.text : t.registration.template.empty}</p>
        </div>
      </div>

      <div className={`registration-template__controls${templates.length ? "" : " registration-template__controls--empty"}`}>
        {templates.length > 0 && (
          <label className="registration-template__choice">
            <span>{t.registration.template.select}</span>
            <select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
            >
              <option value="">{t.registration.template.select}</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.nickname}{template.alliance ? ` · ${template.alliance}` : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        {templates.length > 0 && (
          <button
            className="registration-template__apply"
            type="button"
            onClick={applyTemplate}
            disabled={!selectedTemplate}
          >
            <img src={TEMPLATE_ASSETS.save} alt="" aria-hidden="true" />
            {t.registration.template.apply}
          </button>
        )}

        <button
          className="registration-template__save"
          type="button"
          disabled={!canSave}
          onClick={saveTemplate}
        >
          <img src={TEMPLATE_ASSETS.templates} alt="" aria-hidden="true" />
          {t.registration.template.saveCurrent}
        </button>
      </div>

      {templateMessage && (
        <p className="registration-template__message" role="status" aria-live="polite">
          {templateMessage}
        </p>
      )}

      {selectedTemplate && (
        <div className="registration-template__preview">
          <img
            className="registration-template__troop-image"
            src={TEMPLATE_ASSETS[selectedTemplate.troopType] || TEMPLATE_ASSETS.players}
            alt=""
            aria-hidden="true"
          />
          <div className="registration-template__preview-info">
            <strong>{selectedTemplate.nickname}</strong>
            <div className="registration-template__badges">
              <span className="registration-template__alliance">{selectedTemplate.alliance || "—"}</span>
              <TroopBadge
                compact
                type={selectedTemplate.troopType}
                label={t.registration.troops[selectedTemplate.troopType] || "—"}
              />
              <TierBadge compact tier={selectedTemplate.tier} />
              <span className="registration-template__lair">
                {t.registration.template.lair} {selectedTemplate.lairLevel || "—"}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default PlayerTemplateSelector;
