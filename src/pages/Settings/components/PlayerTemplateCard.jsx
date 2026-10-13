import { REGISTRATION_TROOP_TYPES } from "../../../../shared/registrationConfig.js";
import { TEMPLATE_ASSETS } from "../../../features/playerTemplates/templateAssets.js";
import TierBadge from "../../../components/PlayerBadges/TierBadge.jsx";
import TroopBadge from "../../../components/PlayerBadges/TroopBadge.jsx";

function PlayerTemplateCard({ t, template, onEdit, onDelete }) {
  const troopLabel = t.registration.troops[template.troopType] || "—";
  const shiftLabel = t.settings.templates[template.shift] || "—";
  const stats = [
    [t.settings.templates.lairLevel, template.lairLevel],
    [t.settings.templates.marchSize, template.marchSize],
    [t.settings.templates.rallySize, template.rallySize],
    [t.settings.templates.shift, shiftLabel],
  ];
  const extraTypes = REGISTRATION_TROOP_TYPES.filter(
    (type) => type !== template.troopType && template.extraSquads?.[type]?.enabled,
  );

  return (
    <article className="template-card">
      <div className="template-card__main">
        <div className="template-card__identity">
          <img className="template-card__avatar" src={TEMPLATE_ASSETS[template.troopType] || TEMPLATE_ASSETS.players} alt="" aria-hidden="true" />
          <div className="template-card__identity-content">
            <h3>{template.nickname}</h3>
            <div className="template-card__meta">
              <span className="template-card__alliance">{template.alliance || "—"}</span>
              <TroopBadge type={template.troopType} label={troopLabel} compact />
              <TierBadge tier={template.tier} compact />
            </div>
          </div>
        </div>
        <div className="template-card__actions">
          <button type="button" onClick={() => onEdit(template)}>
            <img src={TEMPLATE_ASSETS.edit} alt="" aria-hidden="true" />
            {t.settings.templates.edit}
          </button>
          <button type="button" className="template-card__delete" onClick={() => onDelete(template.id)}>
            <img src={TEMPLATE_ASSETS.delete} alt="" aria-hidden="true" />
            {t.settings.templates.delete}
          </button>
        </div>
      </div>
      <div className="template-card__stats">
        {stats.map(([label, value]) => (
          <div className="template-card__stat" key={label}>
            <span>{label}</span>
            <strong>{value || "—"}</strong>
          </div>
        ))}
      </div>
      {extraTypes.length > 0 && (
        <div className="template-card__extra">
          <strong>{t.settings.templates.extraSquads}:</strong>
          {extraTypes.map((type) => (
            <span className="template-card__extra-badge" key={type}>
              <img src={TEMPLATE_ASSETS[type]} alt="" aria-hidden="true" />
              {t.registration.troops[type]} {template.extraSquads[type].tier}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

export default PlayerTemplateCard;
