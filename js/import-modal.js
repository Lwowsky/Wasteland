window.WKD = window.WKD || {};
WKD.openImportModal = () => {
  const modal = WKD.$('#settings-modal');
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('drawer-open');
};
WKD.closeImportModal = () => {
  const modal = WKD.$('#settings-modal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('drawer-open');
};
WKD.initImportModal = () => {
  const { $, $$ } = WKD;
  $('#openImportQuickBtn').addEventListener('click', WKD.openImportModal);
  $$('[data-close-modal]').forEach(button => button.addEventListener('click', WKD.closeImportModal));
  $$('[data-settings-tab]').forEach(button => button.addEventListener('click', () => WKD.switchSettingsTab(button.dataset.settingsTab)));
};
WKD.switchSettingsTab = tab => {
  const { $$ } = WKD;
  $$('[data-settings-tab]').forEach(button => button.classList.toggle('active', button.dataset.settingsTab === tab));
  $$('[data-settings-panel]').forEach(panel => { panel.hidden = panel.dataset.settingsPanel !== tab; });
};
