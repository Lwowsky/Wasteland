import { TIERS, TROOP_TYPES } from "./playerForm.js";

function PlayerExtraSquads({ t, form, setForm }) {
  function updateSquad(type, changes) {
    setForm((current) => ({
      ...current,

      extraSquads: {
        ...current.extraSquads,

        [type]: {
          ...current.extraSquads[type],
          ...changes,
        },
      },
    }));
  }

  function updateComment(value) {
    setForm((current) => ({
      ...current,
      comment: value,
    }));
  }

  return (
    <section className="player-editor-section">
      <div className="player-editor-section__heading">
        <h3>{t.editor.extraSquads.title}</h3>

        <p>{t.editor.extraSquads.description}</p>
      </div>

      <div className="player-extra-squads">
        {TROOP_TYPES.map((type) => {
          const isMain = form.troopType === type;

          const squad = form.extraSquads[type];

          return (
            <div
              key={type}
              className={[
                "player-extra-squad",
                squad.enabled ? "player-extra-squad--active" : "",
                isMain ? "player-extra-squad--main" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <label className="player-extra-squad__toggle">
                <input
                  type="checkbox"
                  checked={!isMain && squad.enabled}
                  disabled={isMain}
                  onChange={(event) =>
                    updateSquad(type, {
                      enabled: event.target.checked,
                    })
                  }
                />

                <span>{t.troops[type]}</span>
              </label>

              {isMain ? (
                <span className="player-extra-squad__main-badge">
                  {t.editor.extraSquads.main}
                </span>
              ) : (
                <select
                  value={squad.tier}
                  disabled={!squad.enabled}
                  onChange={(event) =>
                    updateSquad(type, {
                      tier: event.target.value,
                    })
                  }
                >
                  {TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>

      <label className="player-editor-field player-editor-field--comment">
        <span>{t.editor.extraSquads.comment}</span>

        <textarea
          rows="3"
          value={form.comment}
          placeholder={t.editor.extraSquads.commentPlaceholder}
          onChange={(event) => updateComment(event.target.value)}
        />
      </label>
    </section>
  );
}

export default PlayerExtraSquads;
