document.addEventListener('DOMContentLoaded', async () => {
  if (typeof WKD.loadPartials === 'function') await WKD.loadPartials();
  document.dispatchEvent(new CustomEvent('wkd:partials-ready'));

  if (typeof window.WKD_applyI18n === 'function') window.WKD_applyI18n();
  WKD.initHeader();
  WKD.initImportModal();
  WKD.initImportRegions();
  WKD.initImportFile();
  WKD.initImportMapping();
  WKD.initVisibleTiers();
  WKD.initShiftRecognition();
  WKD.initPlayersTable();

  if (window.location.hash === '#import' && typeof WKD.openImportModal === 'function') {
    WKD.openImportModal();
  }
});
