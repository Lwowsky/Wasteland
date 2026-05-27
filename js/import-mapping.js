window.WKD = window.WKD || {};

WKD.initImportMapping = () => {
  const { $, state, showNotice } = WKD;
  state.mappings = WKD.loadJson(WKD.storageKeys.importMappings, {});
  WKD.renderMappingRows();
  $('#saveMappingBtn').addEventListener('click', saveMappings);
  $('#saveOptionalMappingBtn').addEventListener('click', saveMappings);
  $('#resetColumnDataBtn').addEventListener('click', resetColumnData);
  $('#resetAllStorageBtn').addEventListener('click', resetAllStorage);
  $('#resetTableDataBtn').addEventListener('click', resetTableData);
};

WKD.autoMapHeaders = () => {
  const headers = WKD.state.pendingHeaders || [];
  Object.entries(WKD.fields).forEach(([key, config]) => {
    if (WKD.state.mappings[key] && headers.includes(WKD.state.mappings[key])) return;
    const found = headers.find(header => {
      const normalized = normalizeHeader(header);
      return config.aliases.some(alias => { const a = normalizeHeader(alias); return normalized === a || normalized.includes(a); });
    });
    if (found) WKD.state.mappings[key] = found;
  });
};

WKD.renderMappingRows = () => {
  WKD.rebuildFields();
  renderMappingGroup('#requiredMappingContainer', WKD.requiredKeys, false);
  renderMappingGroup('#optionalMappingContainer', WKD.getOptionalKeys(), true);
  WKD.renderVisibleOptions?.();
};

WKD.getMappedValue = (row, key) => {
  const field = WKD.fields[key];
  if (!field) return '';
  const mapped = WKD.state.mappings[key];
  if (mapped && Object.prototype.hasOwnProperty.call(row, mapped)) return row[mapped];
  const found = Object.keys(row || {}).find(header => {
    const normalized = normalizeHeader(header);
    return field.aliases.some(alias => { const a = normalizeHeader(alias); return normalized === a || normalized.includes(a); });
  });
  return found ? row[found] : '';
};

function renderMappingGroup(selector, keys, optional) {
  const root = WKD.$(selector);
  if (!root) return;
  root.innerHTML = keys.map(key => mappingRow(key, optional)).join('') + (optional ? '<div class="mapping-add-row"><button class="mapping-add-btn" data-add-custom-field type="button">+ Додати додаткову колонку</button></div>' : '');

  WKD.$$('select[data-map-field]', root).forEach(select => select.addEventListener('change', () => {
    WKD.state.mappings[select.dataset.mapField] = select.value;
    WKD.saveJson(WKD.storageKeys.importMappings, WKD.state.mappings);
    WKD.renderShiftRecognition?.();
  }));

  WKD.$$('[data-edit-field]', root).forEach(button => button.addEventListener('click', () => editField(button.dataset.editField)));
  WKD.$$('[data-remove-field]', root).forEach(button => button.addEventListener('click', () => removeOptionalField(button.dataset.removeField)));
  const add = root.querySelector('[data-add-custom-field]');
  if (add) add.addEventListener('click', addCustomField);
}

function mappingRow(key, optional) {
  const config = WKD.fields[key];
  const current = WKD.state.mappings[key] || '';
  const options = ['<option value="">— не прив’язано —</option>'].concat(WKD.state.pendingHeaders.map(header => `<option value="${WKD.escapeHtml(header)}" ${header === current ? 'selected' : ''}>${WKD.escapeHtml(header)}</option>`)).join('');
  return `<div class="mapping-row" data-field-row="${key}">
    <div class="row-title-wrap">
      <div class="row-title"><strong>${WKD.escapeHtml(config.label)}${optional ? '' : ' *'}</strong>${optional ? '<span class="mapping-meta">кастомна</span>' : ''}</div>
      <div class="row-title-actions">${optional ? `<button class="mapping-remove-btn" data-remove-field="${key}" type="button" aria-label="Видалити колонку">×</button>` : ''}<button class="mapping-edit-btn" data-edit-field="${key}" type="button">✎ Редагувати</button></div>
    </div>
    <select data-map-field="${key}">${options}</select>
  </div>`;
}

async function editField(key) {
  const field = WKD.fields[key];
  if (!field) return;
  const row = WKD.$(`[data-field-row="${CSS.escape(key)}"]`);
  if (!row || row.classList.contains('is-editing')) return;
  row.classList.add('is-editing');
  row.querySelector('.row-title').innerHTML = `<input class="mapping-name-input" value="${WKD.escapeHtml(field.label)}" aria-label="Назва колонки">`;
  row.querySelector('.row-title-actions').innerHTML = `<button class="mapping-save-btn" type="button">✓ Зберегти</button><button class="mapping-edit-btn" type="button">Скасувати</button>`;
  const input = row.querySelector('.mapping-name-input');
  input.focus();
  row.querySelector('.mapping-save-btn').addEventListener('click', () => saveFieldName(key, input.value));
  row.querySelector('.mapping-edit-btn').addEventListener('click', WKD.renderMappingRows);
}

function saveFieldName(key, label) {
  const value = WKD.clean(label);
  if (!value) return WKD.showNotice('Назва не може бути пустою.');
  if (WKD.baseFields[key]) WKD.baseFields[key].label = value;
  const custom = WKD.state.customFields.find(item => item.key === key);
  if (custom) custom.label = value;
  WKD.saveCustomFieldState();
  WKD.rebuildFields();
  WKD.renderMappingRows();
  WKD.showNotice('Назву колонки збережено.');
}

async function removeOptionalField(key) {
  const field = WKD.fields[key];
  if (!field) return;
  const ok = await WKD.confirmDialog({
    title: 'Видалити колонку?',
    message: `Колонку «${field.label}» буде прибрано з додаткових колонок.`,
    note: 'Цю дію можна змінити пізніше через нове додавання або скидання налаштувань.',
    acceptText: 'Видалити'
  });
  if (!ok) return;
  WKD.state.customFields = WKD.state.customFields.filter(item => item.key !== key);
  if (!WKD.baseFields[key] && WKD.state.mappings[key]) delete WKD.state.mappings[key];
  if (WKD.baseFields[key] && !WKD.state.disabledOptionalFields.includes(key)) WKD.state.disabledOptionalFields.push(key);
  WKD.state.visibleOptionalFields = WKD.state.visibleOptionalFields.filter(item => item !== key);
  WKD.saveJson(WKD.storageKeys.importMappings, WKD.state.mappings);
  WKD.saveCustomFieldState();
  WKD.renderMappingRows();
  WKD.showNotice('Додаткову колонку видалено.');
}

function addCustomField() {
  const index = WKD.state.customFields.length + 1;
  const key = `custom_${Date.now().toString(36)}`;
  WKD.state.customFields.push({ key, label: `Кастомна колонка ${index}` });
  WKD.state.visibleOptionalFields.push(key);
  WKD.saveCustomFieldState();
  WKD.rebuildFields();
  WKD.renderMappingRows();
  setTimeout(() => editField(key), 0);
}

function normalizeHeader(value) { return String(value ?? '').normalize('NFKC').toLowerCase().replace(/[’'`]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); }
function saveMappings() {
  WKD.saveJson(WKD.storageKeys.importMappings, WKD.state.mappings);
  WKD.saveCustomFieldState();
  WKD.showNotice('Шаблон колонок збережено.');
}

async function resetColumnData() {
  const ok = await WKD.confirmDialog({ title: 'Скинути дані колонок?', message: 'Буде очищено збережений шаблон прив’язки колонок.', note: 'Після цього колонки треба буде налаштувати знову.', acceptText: 'Скинути' });
  if (!ok) return;
  WKD.state.mappings = {};
  localStorage.removeItem(WKD.storageKeys.importMappings);
  WKD.renderMappingRows();
  WKD.showNotice('Дані колонок скинуто.');
}

async function resetAllStorage() {
  const ok = await WKD.confirmDialog({ title: 'Повністю очистити LocalStorage?', message: 'Усі збережені дані сайту буде видалено.', note: 'Будуть очищені таблиці, колонки, шаблони імпорту, налаштування та інший локально збережений стан.', acceptText: 'Скинути все' });
  if (!ok) return;
  localStorage.clear();
  WKD.clearPendingImport();
  WKD.state.mappings = {};
  WKD.state.visibleTiers = [...WKD.defaultVisibleTiers];
  WKD.state.customFields = [];
  WKD.state.disabledOptionalFields = [];
  WKD.state.visibleOptionalFields = [];
  WKD.state.shiftRules = {};
  WKD.state.shiftMergeMode = 'custom';
  const regions = WKD.loadRegionSettings();
  WKD.state.regionEnabled = regions.enabled;
  WKD.state.regionShifts = regions.shifts;
  WKD.rebuildFields();
  WKD.setPlayers([], { persist: false });
  WKD.renderMappingRows();
  WKD.renderVisibleTiers?.();
  WKD.renderRegionPanels?.();
  WKD.renderShiftRecognition?.();
  WKD.showNotice('LocalStorage очищено.');
}

async function resetTableData() {
  const ok = await WKD.confirmDialog({ title: 'Скинути дані таблиці?', message: 'Список імпортованих гравців буде очищено.', note: 'Налаштування колонок і регіонів залишаться без змін.', acceptText: 'Скинути таблицю' });
  if (!ok) return;
  WKD.setPlayers([]);
  WKD.showNotice('Дані таблиці очищено.');
}
