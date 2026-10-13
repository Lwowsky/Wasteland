import { SHIFTS, TIERS, TROOP_TYPES } from "./playerForm.js";

function PlayerMainFields({ t, form, setForm, registrationSettings = {} }) {
  const tierUnavailable =
    Boolean(form.tier) && registrationSettings.availableTiers?.[form.tier] !== true;
  const shiftUnavailable =
    Boolean(form.shift) &&
    registrationSettings.availableShifts?.[form.shift] !== true;

  function update(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function updateNumber(name, value) {
    update(name, value === "" ? 0 : Number(value));
  }

  function updateTroop(troopType) {
    setForm((current) => ({
      ...current,
      troopType,
      extraSquads: {
        ...current.extraSquads,
        [troopType]: {
          ...current.extraSquads[troopType],
          enabled: false,
        },
      },
    }));
  }

  return (
    <>
      <section className="player-editor-section player-editor-section--participation">
        <div className="player-editor-section__heading">
          <h3>{t.editor.participation.title}</h3>
          <p>{t.editor.participation.description}</p>
        </div>

        <div className="player-editor-participation-grid">
          <label className="player-editor-field">
            <span>{t.editor.participation.shift}</span>
            <select
              value={form.shift}
              required
              onChange={(event) => update("shift", event.target.value)}
            >
              <option value="">{t.editor.participation.selectShift}</option>
              {SHIFTS.map((shift) => (
                <option key={shift} value={shift}>
                  {t.shifts[shift]}
                </option>
              ))}
            </select>
            {shiftUnavailable && (
              <small className="player-editor-rule-warning">
                {t.editor.ruleWarnings.shift.replace(
                  "{{shift}}",
                  t.shifts[form.shift] || form.shift,
                )}
              </small>
            )}
          </label>

          <label className="player-editor-field">
            <span>{t.editor.participation.ready}</span>
            <select
              value={form.readyAttack ? "yes" : "no"}
              onChange={(event) =>
                update("readyAttack", event.target.value === "yes")
              }
            >
              <option value="yes">{t.yes}</option>
              <option value="no">{t.no}</option>
            </select>
          </label>

          <label className="player-editor-field">
            <span>{t.editor.participation.captain}</span>
            <select
              value={form.captain ? "yes" : "no"}
              onChange={(event) =>
                update("captain", event.target.value === "yes")
              }
            >
              <option value="yes">{t.yes}</option>
              <option value="no">{t.no}</option>
            </select>
          </label>
        </div>
      </section>

      <section className="player-editor-section">
        <div className="player-editor-section__heading">
          <h3>{t.editor.playerData.title}</h3>
          <p>{t.editor.playerData.description}</p>
        </div>

        <div className="player-editor-fields-grid">
          <label className="player-editor-field">
            <span>{t.editor.playerData.nickname}</span>
            <input
              value={form.nickname}
              onChange={(event) => update("nickname", event.target.value)}
            />
          </label>

          <label className="player-editor-field">
            <span>{t.editor.playerData.alliance}</span>
            <input
              value={form.alliance}
              onChange={(event) => update("alliance", event.target.value)}
            />
          </label>

          <label className="player-editor-field">
            <span>{t.editor.playerData.tier}</span>
            <select
              value={form.tier}
              onChange={(event) => update("tier", event.target.value)}
            >
              {TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
            {tierUnavailable && (
              <small className="player-editor-rule-warning">
                {t.editor.ruleWarnings.tier.replace("{{tier}}", form.tier)}
              </small>
            )}
          </label>

          <label className="player-editor-field">
            <span>{t.editor.playerData.troopType}</span>
            <select
              value={form.troopType}
              onChange={(event) => updateTroop(event.target.value)}
            >
              {TROOP_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t.troops[type]}
                </option>
              ))}
            </select>
          </label>

          <label className="player-editor-field">
            <span>{t.editor.playerData.lairLevel}</span>
            <input
              type="number"
              min="0"
              value={form.lairLevel}
              onChange={(event) => updateNumber("lairLevel", event.target.value)}
            />
          </label>

          <label className="player-editor-field">
            <span>{t.editor.playerData.marchSize}</span>
            <input
              type="number"
              min="0"
              value={form.marchSize}
              onChange={(event) => updateNumber("marchSize", event.target.value)}
            />
          </label>

          <label className="player-editor-field">
            <span>{t.editor.playerData.rallySize}</span>
            <input
              type="number"
              min="0"
              value={form.rallySize}
              onChange={(event) => updateNumber("rallySize", event.target.value)}
            />
          </label>
        </div>
      </section>
    </>
  );
}

export default PlayerMainFields;
