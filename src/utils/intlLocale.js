// One source for date/number locale choices across all enabled UI languages.
const INTL_LOCALES = Object.freeze({
  uk: "uk-UA",
  en: "en-GB",
  ru: "ru-RU",
  pl: "pl-PL",
  de: "de-DE",
  ja: "ja-JP",
  zh: "zh-CN",
  ko: "ko-KR",
  vi: "vi-VN",
  ar: "ar-SA",
});

export function getIntlLocale(language) {
  const code = String(language || "").trim().toLowerCase().split(/[-_]/)[0];
  return INTL_LOCALES[code] || INTL_LOCALES.en;
}
