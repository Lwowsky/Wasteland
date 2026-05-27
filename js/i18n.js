export const languages = [
  { code: 'uk', name: 'Українська', short: 'UK' }, { code: 'en', name: 'English', short: 'EN' },
  { code: 'ru', name: 'Русский', short: 'RU' }, { code: 'pl', name: 'Polski', short: 'PL' },
  { code: 'de', name: 'Deutsch', short: 'DE' }, { code: 'ja', name: '日本語', short: 'JA' },
  { code: 'zh', name: '中文', short: 'ZH' }, { code: 'ko', name: '한국어', short: 'KO' },
  { code: 'vi', name: 'Tiếng Việt', short: 'VI' }, { code: 'ar', name: 'العربية', short: 'AR' }
];

let active = localStorage.getItem('wkd_lang_v1') || 'uk';
let onChange = null;

export function initI18n(options = {}) {
  onChange = options.onChange || null;
  window.WKD_setLang = setLang;
  applyLang(active);
}

export function setLang(code) {
  if (!languages.some(item => item.code === code)) code = 'uk';
  active = code;
  localStorage.setItem('wkd_lang_v1', code);
  applyLang(code);
  onChange?.(code);
}

export function t(key) {
  const dict = window.WKD_I18N?.[active] || {};
  const uk = window.WKD_I18N?.uk || {};
  return dict[key] || uk[key] || key;
}

function applyLang(code) {
  const lang = languages.find(item => item.code === code) || languages[0];
  document.documentElement.lang = lang.code;
  document.documentElement.dir = lang.code === 'ar' ? 'rtl' : 'ltr';
  const label = document.getElementById('langLabel');
  if (label) label.textContent = lang.name;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.querySelectorAll('.lang-item').forEach(el => el.classList.toggle('is-active', el.dataset.lang === code));
}
