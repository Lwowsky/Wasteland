import { MessageSquareText } from "lucide-react";

import StatusBadge from "../../../components/PlayerBadges/StatusBadge.jsx";
import TierBadge from "../../../components/PlayerBadges/TierBadge.jsx";
import TroopBadge from "../../../components/PlayerBadges/TroopBadge.jsx";

import { formatRegionNumber } from "./regionEditorUtils.js";

import "../styles/regionEditor/RegionOverview.css";

function RegionInfoIcon({ src }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className="region-player-overview__info-icon"
    />
  );
}

function RegionOverviewTab({ t, shared, language, player }) {
  if (!player) {
    return (
      <div className="region-editor-empty region-editor-empty--large">
        {t.players.empty}
      </div>
    );
  }

  const badgeTranslations = {
    yes: shared.yes,
    no: shared.no,
    shifts: shared.shifts,
  };

  return (
    <section className="region-player-overview">
      <div className="region-player-overview__top">
        <div className="region-player-overview__identity">
          <div className="region-player-overview__avatar">
            <img
              src="/images/admin/region-editor/player.webp"
              alt=""
              aria-hidden="true"
              className="region-player-overview__avatar-image"
            />
          </div>

          <div className="region-player-overview__identity-text">
            <span className="region-player-overview__label">
              {t.players.player}
            </span>

            <strong title={player.nickname || ""}>
              {player.nickname || "—"}
            </strong>

            <small>{player.alliance || "—"}</small>
          </div>
        </div>

        <div className="region-player-overview__cell region-player-overview__cell--center">
          <span className="region-player-overview__label">
            {t.players.tier}
          </span>

          <TierBadge tier={player.tier || "T1"} />
        </div>

        <div className="region-player-overview__cell region-player-overview__cell--center">
          <span className="region-player-overview__label">
            {t.players.troopType}
          </span>

          <TroopBadge
            type={player.troopType}
            label={player.troopType ? shared.troops[player.troopType] : "—"}
          />
        </div>

        <div className="region-player-overview__cell region-player-overview__cell--center">
          <span className="region-player-overview__label">
            {t.players.lair}
          </span>

          <strong className="region-player-overview__number">
            {player.lairLevel ?? "—"}
          </strong>
        </div>
      </div>

      <div className="region-player-overview__bottom">
        <div className="region-player-overview__cell">
          <div className="region-player-overview__cell-heading">
            <RegionInfoIcon src="/images/admin/region-editor/march.webp" />

            <span className="region-player-overview__label">
              {t.players.march}
            </span>
          </div>

          <strong className="region-player-overview__number">
            {formatRegionNumber(player.marchSize, language)}
          </strong>
        </div>

        <div className="region-player-overview__cell">
          <div className="region-player-overview__cell-heading">
            <RegionInfoIcon src="/images/admin/region-editor/rally.webp" />

            <span className="region-player-overview__label">
              {t.players.rally}
            </span>
          </div>

          <strong className="region-player-overview__number">
            {formatRegionNumber(player.rallySize, language)}
          </strong>
        </div>

        <div className="region-player-overview__cell region-player-overview__cell--center">
          <span className="region-player-overview__label">
            {t.players.shift}
          </span>

          <StatusBadge type="shift" value={player.shift} t={badgeTranslations} />
        </div>

        <div className="region-player-overview__cell region-player-overview__cell--center">
          <span className="region-player-overview__label">
            {t.players.captain}
          </span>

          <StatusBadge
            type="captain"
            value={player.captain}
            t={badgeTranslations}
          />
        </div>

        <div className="region-player-overview__cell region-player-overview__cell--center">
          <span className="region-player-overview__label">
            {t.players.ready}
          </span>

          <StatusBadge
            type="ready"
            value={player.readyAttack}
            t={badgeTranslations}
          />
        </div>
      </div>

      <div className="region-player-overview__comment">
        <div className="region-player-overview__comment-title">
          <MessageSquareText size={18} />
          <span>{t.players.comment}</span>
        </div>

        <p>{player.comment || "—"}</p>
      </div>
    </section>
  );
}

export default RegionOverviewTab;
