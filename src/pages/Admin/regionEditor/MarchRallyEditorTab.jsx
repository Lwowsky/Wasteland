import { Save } from "lucide-react";
import { useMemo, useState } from "react";

import TierBadge from "../../../components/PlayerBadges/TierBadge.jsx";

import "../styles/regionEditor/MarchRallyEditor.css";

function toNumber(value) {
  const parsed = Number(String(value ?? "").replace(/[^\d]/g, ""));

  return Number.isFinite(parsed) ? parsed : 0;
}

function MarchRallyEditorTab({ t, players = [], canEdit, saving, onUpdate }) {
  const [sort, setSort] = useState("march-desc");
  const [draftOverrides, setDraftOverrides] = useState({});

  const drafts = useMemo(() => {
    return Object.fromEntries(
      players.map((player) => [
        player.id,
        {
          marchSize:
            draftOverrides[player.id]?.marchSize ??
            String(player.marchSize ?? ""),
          rallySize:
            draftOverrides[player.id]?.rallySize ??
            String(player.rallySize ?? ""),
        },
      ]),
    );
  }, [players, draftOverrides]);

  const sortedPlayers = useMemo(() => {
    const nextPlayers = [...players];

    nextPlayers.sort((a, b) => {
      switch (sort) {
        case "march-asc":
          return toNumber(a.marchSize) - toNumber(b.marchSize);

        case "rally-desc":
          return toNumber(b.rallySize) - toNumber(a.rallySize);

        case "rally-asc":
          return toNumber(a.rallySize) - toNumber(b.rallySize);

        case "march-desc":
        default:
          return toNumber(b.marchSize) - toNumber(a.marchSize);
      }
    });

    return nextPlayers;
  }, [players, sort]);

  function updateDraft(playerId, field, value) {
    const cleanValue = value.replace(/[^\d]/g, "");

    setDraftOverrides((current) => ({
      ...current,

      [playerId]: {
        ...current[playerId],
        [field]: cleanValue,
      },
    }));
  }

  function hasChanges(player) {
    const draft = drafts[player.id];

    if (!draft) {
      return false;
    }

    return (
      toNumber(draft.marchSize) !== toNumber(player.marchSize) ||
      toNumber(draft.rallySize) !== toNumber(player.rallySize)
    );
  }

  async function handleSave(player) {
    const draft = drafts[player.id];

    if (!draft || !canEdit || saving) {
      return;
    }

    await onUpdate({
      ...player,
      marchSize: toNumber(draft.marchSize),
      rallySize: toNumber(draft.rallySize),
    });

    setDraftOverrides((current) => {
      const next = { ...current };
      delete next[player.id];
      return next;
    });
  }

  return (
    <section className="region-combat-editor">
      <header className="region-combat-editor__header">
        <div className="region-combat-editor__heading">
          <img
            src="/images/admin/region-editor/march.webp"
            alt=""
            aria-hidden="true"
            className="region-combat-editor__heading-icon"
          />

          <div className="region-combat-editor__heading-text">
            <h3>{t.combat.title}</h3>

            <p>{t.combat.description}</p>
          </div>
        </div>

        <label className="region-combat-editor__sort">
          <span className="region-combat-editor__sort-icon" aria-hidden="true">
            ↓
          </span>

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            aria-label={t.combat.sortLabel}
          >
            <option value="march-desc">{t.combat.sort.marchDesc}</option>

            <option value="march-asc">{t.combat.sort.marchAsc}</option>

            <option value="rally-desc">{t.combat.sort.rallyDesc}</option>

            <option value="rally-asc">{t.combat.sort.rallyAsc}</option>
          </select>
        </label>
      </header>

      <div
        className="region-combat-editor__table"
        role="region"
        aria-label={t.combat.tableLabel}
        tabIndex={0}
      >
        <div className="region-combat-editor__table-inner">
          <div className="region-combat-editor__table-head">
            <span>#</span>

            <span>{t.combat.player}</span>

            <span>{t.combat.allianceTier}</span>

            <span>{t.combat.march}</span>

            <span>{t.combat.rally}</span>

            <span>{t.combat.actions}</span>
          </div>

          <div className="region-combat-editor__rows">
            {sortedPlayers.map((player, index) => {
              const draft = drafts[player.id] ?? {
                marchSize: String(player.marchSize ?? ""),
                rallySize: String(player.rallySize ?? ""),
              };

              const changed = hasChanges(player);

              return (
                <div
                  key={player.id}
                  className={`region-combat-editor__row ${
                    changed ? "region-combat-editor__row--changed" : ""
                  }`}
                >
                  <div className="region-combat-editor__rank">{index + 1}</div>

                  <div className="region-combat-editor__player">
                    <strong title={player.nickname || ""}>
                      {player.nickname || "—"}
                    </strong>
                  </div>

                  <div className="region-combat-editor__meta">
                    <div className="region-combat-editor__meta-values">
                      <span
                        className="region-combat-editor__alliance"
                        title={player.alliance || ""}
                      >
                        {player.alliance || "—"}
                      </span>

                      <TierBadge tier={player.tier || "T1"} />
                    </div>
                  </div>

                  <div className="region-combat-editor__field">
                    <div className="region-combat-editor__input-wrap region-combat-editor__input-wrap--march">
                      <img
                        src="/images/admin/region-editor/march.webp"
                        alt=""
                        aria-hidden="true"
                      />

                      <input
                        type="text"
                        inputMode="numeric"
                        value={draft.marchSize}
                        disabled={!canEdit || saving}
                        aria-label={t.combat.march}
                        onChange={(event) =>
                          updateDraft(
                            player.id,
                            "marchSize",
                            event.target.value,
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="region-combat-editor__field">
                    <div className="region-combat-editor__input-wrap region-combat-editor__input-wrap--rally">
                      <img
                        src="/images/admin/region-editor/rally.webp"
                        alt=""
                        aria-hidden="true"
                      />

                      <input
                        type="text"
                        inputMode="numeric"
                        value={draft.rallySize}
                        disabled={!canEdit || saving}
                        aria-label={t.combat.rally}
                        onChange={(event) =>
                          updateDraft(
                            player.id,
                            "rallySize",
                            event.target.value,
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="region-combat-editor__actions">
                    <button
                      type="button"
                      className={`region-combat-editor__save ${
                        changed ? "region-combat-editor__save--changed" : ""
                      }`}
                      disabled={!canEdit || saving || !changed}
                      onClick={() => handleSave(player)}
                    >
                      <Save size={17} aria-hidden="true" />

                      <span>{saving ? t.common.saving : t.common.save}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default MarchRallyEditorTab;
