document.addEventListener('DOMContentLoaded', async () => {
  if (typeof WKD.loadPartials === 'function') await WKD.loadPartials();
  document.dispatchEvent(new CustomEvent('wkd:partials-ready'));
  if (typeof window.WKD_applyI18n === 'function') window.WKD_applyI18n();
  WKD.initHeader?.();
});
