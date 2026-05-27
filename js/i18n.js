window.WKD_LANGUAGES = [
  { id: 'uk', code: 'UK', name: 'Українська', icon: 'img/lang/lang-uk.svg' },
  { id: 'en', code: 'EN', name: 'English', icon: 'img/lang/lang-en.svg' },
  { id: 'ru', code: 'RU', name: 'Русский', icon: 'img/lang/lang-ru.svg' },
  { id: 'pl', code: 'PL', name: 'Polski', icon: 'img/lang/lang-pl.svg' },
  { id: 'de', code: 'DE', name: 'Deutsch', icon: 'img/lang/lang-de.svg' },
  { id: 'ja', code: 'JA', name: '日本語', icon: 'img/lang/lang-ja.svg' },
  { id: 'zh', code: 'ZH', name: '中文', icon: 'img/lang/lang-zh.svg' },
  { id: 'ko', code: 'KO', name: '한국어', icon: 'img/lang/lang-ko.svg' },
  { id: 'vi', code: 'VI', name: 'Tiếng Việt', icon: 'img/lang/lang-vi.svg' },
  { id: 'ar', code: 'AR', name: 'العربية', icon: 'img/lang/lang-ar.svg' }
];
window.WKD_TRANSLATIONS = window.WKD_TRANSLATIONS || {};
window.WKD_CURRENT_LANG = localStorage.getItem('wkd.lang') || 'uk';
window.WKD_t = key => (window.WKD_TRANSLATIONS[window.WKD_CURRENT_LANG] && window.WKD_TRANSLATIONS[window.WKD_CURRENT_LANG][key]) || (window.WKD_TRANSLATIONS.uk && window.WKD_TRANSLATIONS.uk[key]) || key;
window.WKD_applyI18n = (root = document) => root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = window.WKD_t(el.dataset.i18n); });
