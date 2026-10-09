import { Settings as SettingsIcon, Users } from "lucide-react";

import { useLocation, useNavigate, useOutletContext } from "react-router-dom";

import { useMemo, useState } from "react";

import Page from "../../components/Page/Page.jsx";
import PageMeta from "../../components/PageMeta/PageMeta.jsx";
import PagePanel from "../../components/PagePanel/PagePanel.jsx";

import { LANGUAGES, SUPPORTED_LANGUAGES } from "../../config/site.js";

import { ROUTES } from "../../config/routes.js";

import { getLanguagePath } from "../../utils/language.js";

import {
  createPlayerTemplate,
  createPlayerTemplateDraft,
  getPlayerTemplates,
  savePlayerTemplates,
} from "../../features/playerTemplates/playerTemplatesStorage.js";


import { getEnabledRegistrationShifts } from "../../features/registration/registrationShifts.js";

import GeneralSettingsTab from "./components/GeneralSettingsTab.jsx";
import TemplatesTab from "./components/TemplatesTab.jsx";

import "./Settings.css";

const TIME_MODE_KEY = "wasteland-time-mode";

const TIME_ZONE_KEY = "wasteland-time-zone";

const EMPTY_AVAILABLE_SHIFTS = Object.freeze({});
const EMPTY_AVAILABLE_TIERS = Object.freeze({});

const TIME_ZONES = [
  { value: "local", labelKey: "local" },
  { value: "UTC", labelKey: "utc" },
  { value: "Asia/Tokyo", labelKey: "tokyo" },
  { value: "Europe/Kyiv", labelKey: "kyiv" },
  { value: "Europe/London", labelKey: "london" },
  { value: "America/New_York", labelKey: "newYork" },
];

function Settings() {
  const { t, language, registrationConfig } = useOutletContext();

  const location = useLocation();

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("settings");

  const [timeMode, setTimeMode] = useState(() => {
    return localStorage.getItem(TIME_MODE_KEY) || "local";
  });

  const [timeZone, setTimeZone] = useState(() => {
    return localStorage.getItem(TIME_ZONE_KEY) || "local";
  });

  const [templates, setTemplates] = useState(() => getPlayerTemplates());

  const [isFormOpen, setIsFormOpen] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [templateForm, setTemplateForm] = useState(() => createPlayerTemplateDraft());

  const availableShifts =
    registrationConfig?.settings?.availableShifts || EMPTY_AVAILABLE_SHIFTS;

  const availableTiers =
    registrationConfig?.settings?.availableTiers || EMPTY_AVAILABLE_TIERS;

  const enabledShifts = useMemo(
    () => getEnabledRegistrationShifts(availableShifts),
    [availableShifts],
  );

  const timeZones = useMemo(
    () =>
      TIME_ZONES.map((zone) => ({
        value: zone.value,
        label: t.settings.timeZone.options[zone.labelKey],
      })),
    [t.settings.timeZone.options],
  );

  function changeTimeMode(nextTimeMode) {
    setTimeMode(nextTimeMode);
    localStorage.setItem(TIME_MODE_KEY, nextTimeMode);

    window.dispatchEvent(
      new CustomEvent("wasteland-time-mode-change", {
        detail: {
          timeMode: nextTimeMode,
        },
      }),
    );
  }

  function changeTimeZone(nextTimeZone) {
    setTimeZone(nextTimeZone);
    localStorage.setItem(TIME_ZONE_KEY, nextTimeZone);

    window.dispatchEvent(
      new CustomEvent("wasteland-time-zone-change", {
        detail: {
          timeZone: nextTimeZone,
        },
      }),
    );
  }

  function changeLanguage(newLanguage) {
    if (newLanguage === language) {
      return;
    }

    navigate(getLanguagePath(location.pathname, newLanguage));
  }

  function resetSettings() {
    changeTimeMode("local");
    changeTimeZone("local");
  }

  function openNewTemplate() {
    setEditingId(null);

    setTemplateForm(createPlayerTemplateDraft({}, enabledShifts[0] || ""));

    setIsFormOpen(true);
  }

  function openEditTemplate(template) {
    setEditingId(template.id);

    const templateShift = enabledShifts.includes(template.shift)
      ? template.shift
      : enabledShifts[0] || "";

    setTemplateForm(
      createPlayerTemplateDraft(
        {
          ...template,
          shift: templateShift,
        },
        enabledShifts[0] || "",
      ),
    );

    setIsFormOpen(true);
  }

  function closeTemplateForm() {
    setEditingId(null);

    setTemplateForm(createPlayerTemplateDraft({}, enabledShifts[0] || ""));

    setIsFormOpen(false);
  }

  function handleTemplateChange(event) {
    const { name, value } = event.target;

    setTemplateForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function saveTemplate(event) {
    event.preventDefault();

    if (!templateForm.nickname.trim()) {
      return;
    }

    if (!enabledShifts.includes(templateForm.shift)) {
      return;
    }

    let updatedTemplates;

    if (editingId) {
      updatedTemplates = templates.map((template) =>
        template.id === editingId
          ? {
              ...template,
              ...templateForm,
            }
          : template,
      );
    } else {
      updatedTemplates = [...templates, createPlayerTemplate(templateForm)];
    }

    setTemplates(updatedTemplates);

    savePlayerTemplates(updatedTemplates);

    closeTemplateForm();
  }

  function deleteTemplate(id) {
    const updatedTemplates = templates.filter((template) => template.id !== id);

    setTemplates(updatedTemplates);

    savePlayerTemplates(updatedTemplates);
  }

  return (
    <>
      <PageMeta
        title={t.settings.title}
        description={t.settings.text}
        language={language}
        path={ROUTES.settings}
      />

      <Page>
        <div className="settings-page">
          <PagePanel>
            <header className="settings-header">
              <div className="settings-header__icon">
                <SettingsIcon size={30} aria-hidden="true" />
              </div>

              <div>
                <h1>{t.settings.title}</h1>

                <p>{t.settings.text}</p>
              </div>
            </header>

            <div className="settings-tabs">
              <button
                type="button"
                className={
                  activeTab === "settings"
                    ? "settings-tab settings-tab--active"
                    : "settings-tab"
                }
                onClick={() => setActiveTab("settings")}
              >
                <SettingsIcon size={19} aria-hidden="true" />

                {t.settings.tabs.settings}
              </button>

              <button
                type="button"
                className={
                  activeTab === "templates"
                    ? "settings-tab settings-tab--active"
                    : "settings-tab"
                }
                onClick={() => setActiveTab("templates")}
              >
                <Users size={19} aria-hidden="true" />

                {t.settings.tabs.templates}
              </button>
            </div>

            {activeTab === "settings" && (
              <GeneralSettingsTab
                t={t}
                language={language}
                timeMode={timeMode}
                onTimeModeChange={changeTimeMode}
                timeZone={timeZone}
                onTimeZoneChange={changeTimeZone}
                timeZones={timeZones}
                supportedLanguages={SUPPORTED_LANGUAGES}
                languages={LANGUAGES}
                onLanguageChange={changeLanguage}
                onReset={resetSettings}
              />
            )}

            {activeTab === "templates" && (
              <TemplatesTab
                t={t}
                templates={templates}
                isFormOpen={isFormOpen}
                templateForm={templateForm}
                setTemplateForm={setTemplateForm}
                onAdd={openNewTemplate}
                onEdit={openEditTemplate}
                onDelete={deleteTemplate}
                onChange={handleTemplateChange}
                onSave={saveTemplate}
                onCancel={closeTemplateForm}
                availableShifts={availableShifts}
                availableTiers={availableTiers}
              />
            )}
          </PagePanel>
        </div>
      </Page>
    </>
  );
}

export default Settings;
