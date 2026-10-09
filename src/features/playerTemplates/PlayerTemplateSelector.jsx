import { ClipboardCheck, Users } from "lucide-react";

import { useState } from "react";

import { getPlayerTemplates } from "./playerTemplatesStorage.js";

function PlayerTemplateSelector({ t, onApply }) {
  const [templates] = useState(() => getPlayerTemplates());

  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const selectedTemplate = templates.find(
    (template) => template.id === selectedTemplateId,
  );

  function applyTemplate() {
    if (!selectedTemplate) {
      return;
    }

    onApply(selectedTemplate);
  }

  if (templates.length === 0) {
    return (
      <section className="registration-template">
        <div className="registration-template__icon">
          <Users size={24} />
        </div>

        <div>
          <h2>{t.registration.template.title}</h2>

          <p>{t.registration.template.empty}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="registration-template">
      <div className="registration-template__header">
        <div className="registration-template__icon">
          <Users size={24} />
        </div>

        <div>
          <h2>{t.registration.template.title}</h2>

          <p>{t.registration.template.text}</p>
        </div>
      </div>

      <div className="registration-template__controls">
        <select
          value={selectedTemplateId}
          onChange={(event) => setSelectedTemplateId(event.target.value)}
        >
          <option value="">{t.registration.template.select}</option>

          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.nickname}
              {template.alliance ? ` · ${template.alliance}` : ""}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={applyTemplate}
          disabled={!selectedTemplate}
        >
          <ClipboardCheck size={18} />

          {t.registration.template.apply}
        </button>
      </div>

      {selectedTemplate && (
        <div className="registration-template__preview">
          <strong>{selectedTemplate.nickname}</strong>

          <span>{selectedTemplate.alliance || "—"}</span>

          <span>{selectedTemplate.troopType}</span>

          <span>{selectedTemplate.tier}</span>

          <span>
            {t.registration.template.lair} {selectedTemplate.lairLevel || "—"}
          </span>
        </div>
      )}
    </section>
  );
}

export default PlayerTemplateSelector;
