import { getState, setLanguage, subscribe } from "./state.js";

const LANGS = [
  ["uk", "Українська"],
  ["en", "English"],
  ["ru", "Русский"],
  ["pl", "Polski"],
  ["de", "Deutsch"],
  ["ja", "日本語"],
  ["zh", "中文"],
  ["ko", "한국어"],
  ["vi", "Tiếng Việt"],
  ["ar", "العربية"]
];

function dictionary(lang) {
  return window.WKD_I18N?.[lang] || window.WKD_I18N?.uk || {};
}

function interpolate(text, params = {}) {
  return String(text).replace(/\{(\w+)\}/g, (_, key) => params[key] ?? "");
}

export function initI18n() {
  const select = document.querySelector("#languageSelect");

  LANGS.forEach(([code, label]) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = label;
    select.append(option);
  });

  const apply = () => {
    const current = getState().lang || "uk";
    const dict = dictionary(current);
    document.documentElement.lang = current;
    document.documentElement.dir = current === "ar" ? "rtl" : "ltr";
    select.value = current;

    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.dataset.i18n;
      if (dict[key]) node.textContent = dict[key];
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      const key = node.dataset.i18nPlaceholder;
      if (dict[key]) node.setAttribute("placeholder", dict[key]);
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
      const key = node.dataset.i18nAriaLabel;
      if (dict[key]) node.setAttribute("aria-label", dict[key]);
    });
  };

  const t = (key, params) => {
    const current = getState().lang || "uk";
    const dict = dictionary(current);
    return interpolate(dict[key] || dictionary("uk")[key] || key, params);
  };

  select.addEventListener("change", () => setLanguage(select.value));
  subscribe(apply);
  apply();

  return { t, apply, languages: LANGS };
}
