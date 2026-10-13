import { TEMPLATE_ASSETS } from "../../../features/playerTemplates/templateAssets.js";

import PlayerTemplateForm from "./PlayerTemplateForm.jsx";
import PlayerTemplateCard from "./PlayerTemplateCard.jsx";

function TemplatesTab({
  t,

  templates,

  isFormOpen,
  templateForm,
  setTemplateForm,

  onAdd,
  onEdit,
  onDelete,

  onChange,
  onSave,
  onCancel,

  availableShifts = {},
  availableTiers = {},
}) {
  return (
    <div className="templates-panel">
      <div className="templates-header">
        <div>
          <h2 className="templates-header__title">
            <img src={TEMPLATE_ASSETS.templates} alt="" aria-hidden="true" />
            {t.settings.templates.title}
          </h2>

          <p>{t.settings.templates.text}</p>
        </div>

        <button type="button" className="templates-add" onClick={onAdd}>
          <img src={TEMPLATE_ASSETS.add} alt="" aria-hidden="true" />

          {t.settings.templates.add}
        </button>
      </div>

      {isFormOpen && (
        <PlayerTemplateForm
          t={t}
          templateForm={templateForm}
          setTemplateForm={setTemplateForm}
          onChange={onChange}
          onSave={onSave}
          onCancel={onCancel}
          availableShifts={availableShifts}
          availableTiers={availableTiers}
        />
      )}

      <div className="templates-list">
        {templates.length === 0 && (
          <div className="templates-empty">
            <img src={TEMPLATE_ASSETS.templates} alt="" aria-hidden="true" />
            <span>{t.settings.templates.empty}</span>
          </div>
        )}

        {templates.map((template) => (
          <PlayerTemplateCard
            key={template.id}
            t={t}
            template={template}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

export default TemplatesTab;
