import { SETTINGS_ICONS } from "../settingsIconPaths.js";

function GeneralSettingsTab({
  t,
  language,

  timeMode,
  onTimeModeChange,

  timeZone,
  onTimeZoneChange,

  timeZones,

  supportedLanguages,
  languages,

  onLanguageChange,
  onReset,
}) {
  return (
    <div className="settings-content">
      {/* LANGUAGE */}

      <section className="settings-card">
        <div className="settings-card__info">
          <div className="settings-card__icon">
            <img src={SETTINGS_ICONS.language} alt="" aria-hidden="true" />
          </div>

          <div>
            <h2>{t.settings.language.title}</h2>

            <p>{t.settings.language.text}</p>
          </div>
        </div>

        <div className="settings-options">
          {supportedLanguages.map((languageCode) => (
            <button
              key={languageCode}
              type="button"
              className={
                language === languageCode
                  ? "settings-option settings-option--active"
                  : "settings-option"
              }
              onClick={() => onLanguageChange(languageCode)}
            >
              {languages[languageCode].label}
            </button>
          ))}
        </div>
      </section>

      {/* TIME MODE */}

      <section className="settings-card">
        <div className="settings-card__info">
          <div className="settings-card__icon">
            <img src={SETTINGS_ICONS.timeMode} alt="" aria-hidden="true" />
          </div>

          <div>
            <h2>{t.settings.time.title}</h2>

            <p>{t.settings.time.text}</p>
          </div>
        </div>

        <div className="settings-options">
          <button
            type="button"
            className={
              timeMode === "local"
                ? "settings-option settings-option--active"
                : "settings-option"
            }
            onClick={() => onTimeModeChange("local")}
          >
            {t.settings.time.local}
          </button>

          <button
            type="button"
            className={
              timeMode === "utc"
                ? "settings-option settings-option--active"
                : "settings-option"
            }
            onClick={() => onTimeModeChange("utc")}
          >
            {t.settings.time.utc}
          </button>
        </div>
      </section>

      {/* TIME ZONE */}

      <section className="settings-card">
        <div className="settings-card__info">
          <div className="settings-card__icon">
            <img src={SETTINGS_ICONS.timeZone} alt="" aria-hidden="true" />
          </div>

          <div>
            <h2>{t.settings.timeZone.title}</h2>

            <p>{t.settings.timeZone.text}</p>
          </div>
        </div>

        <select
          className="settings-select"
          value={timeZone}
          onChange={(event) => onTimeZoneChange(event.target.value)}
        >
          {timeZones.map((zone) => (
            <option key={zone.value} value={zone.value}>
              {zone.label}
            </option>
          ))}
        </select>
      </section>

      {/* RESET */}

      <section className="settings-reset">
        <div>
          <strong>{t.settings.reset.title}</strong>

          <p>{t.settings.reset.text}</p>
        </div>

        <button
          type="button"
          className="settings-reset__button"
          onClick={onReset}
        >
          <img
            className="settings-reset__image"
            src={SETTINGS_ICONS.reset}
            alt=""
            aria-hidden="true"
          />

          {t.settings.reset.button}
        </button>
      </section>
    </div>
  );
}

export default GeneralSettingsTab;
