import { Pencil, Trash2 } from "lucide-react";

import { REGISTRATION_TROOP_TYPES } from "../../../../shared/registrationConfig.js";

function PlayerTemplateCard({ t, template, onEdit, onDelete }) {
  const troopLabel = t.registration.troops[template.troopType] || "—";

  const shiftLabel = t.settings.templates[template.shift] || "—";

  return (
    <article className="template-card">
      <div className="template-card__main">
        <div>
          <h3>{template.nickname}</h3>

          <span className="template-card__alliance">
            {template.alliance || "—"}
          </span>
        </div>

        <div className="template-card__actions">
          <button type="button" onClick={() => onEdit(template)}>
            <Pencil size={16} aria-hidden="true" />

            {t.settings.templates.edit}
          </button>

          <button
            type="button"
            className="template-card__delete"
            onClick={() => onDelete(template.id)}
          >
            <Trash2 size={16} aria-hidden="true" />

            {t.settings.templates.delete}
          </button>
        </div>
      </div>

      <div className="template-card__stats">
        <span>
          <b>{troopLabel}</b>

          {t.settings.templates.troopType}
        </span>

        <span>
          <b>{template.tier}</b>

          {t.settings.templates.tier}
        </span>

        <span>
          <b>{template.lairLevel || "—"}</b>

          {t.settings.templates.lairLevel}
        </span>

        <span>
          <b>{template.marchSize || "—"}</b>

          {t.settings.templates.marchSize}
        </span>

        <span>
          <b>{template.rallySize || "—"}</b>

          {t.settings.templates.rallySize}
        </span>

        <span>
          <b>{shiftLabel}</b>

          {t.settings.templates.shift}
        </span>
      </div>

      <div className="template-card__extra">
        {REGISTRATION_TROOP_TYPES
          .filter((type) => template.extraSquads?.[type]?.enabled)
          .map((type) => (
            <span key={type}>
              {t.registration.troops[type]} {template.extraSquads[type].tier}
            </span>
          ))}
      </div>
    </article>
  );
}

export default PlayerTemplateCard;
