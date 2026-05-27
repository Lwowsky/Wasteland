window.WKD = window.WKD || {};
WKD.initImportFile = () => {
  const { $, showNotice } = WKD;
  const input = $('#importFileInput'), drop = $('#fileDrop');
  input.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (file) await WKD.prepareFile(file);
  });
  ['dragenter', 'dragover'].forEach(name => drop.addEventListener(name, event => {
    event.preventDefault();
    drop.classList.add('is-drag');
  }));
  ['dragleave', 'drop'].forEach(name => drop.addEventListener(name, event => {
    event.preventDefault();
    drop.classList.remove('is-drag');
  }));
  drop.addEventListener('drop', async event => {
    const file = event.dataTransfer.files?.[0];
    if (file) await WKD.prepareFile(file);
  });
  $('#applyImportBtn').addEventListener('click', () => {
    if (!WKD.state.pendingRows) return;
    WKD.saveJson(WKD.storageKeys.importMappings, WKD.state.mappings);
    WKD.saveJson(WKD.storageKeys.shiftRules, WKD.state.shiftRules);
    WKD.setPlayers(WKD.state.pendingRows);
    WKD.closeImportModal();
    showNotice(`Імпортовано: ${WKD.state.players.length} гравців.`);
  });
  $('#clearPendingImportBtn').addEventListener('click', WKD.clearPendingImport);
  $('#detectColumnsBtn').addEventListener('click', () => {
    WKD.autoMapHeaders();
    WKD.renderMappingRows();
    WKD.renderShiftRecognition?.();
    WKD.switchSettingsTab('required');
    showNotice('Колонки знайдено автоматично. Перевір обов’язкові поля.');
  });
};
WKD.prepareFile = async file => {
  const { $, state } = WKD;
  try {
    const rows = await readFile(file);
    state.pendingRows = rows;
    state.pendingHeaders = Object.keys(rows[0] || {});
    $('#importLoadedInfo').textContent = `${file.name} • ${rows.length} рядків • ${state.pendingHeaders.length} колонок`;
    $('#importStatusInfo').textContent = rows.length ? 'Файл прочитано. Перевір колонки або натисни «Застосувати імпорт».' : 'Файл прочитано, але рядків не знайдено.';
    $('#importStatusInfo').className = `muted small ${rows.length ? 'is-good' : 'is-danger'}`;
    $('#applyImportBtn').disabled = !rows.length;
    WKD.autoMapHeaders();
    WKD.renderMappingRows();
    WKD.renderShiftRecognition?.();
  } catch (error) {
    console.error(error);
    $('#importStatusInfo').textContent = 'Не вдалося прочитати файл. Перевір формат XLSX, XLS або CSV.';
    $('#importStatusInfo').className = 'muted small is-danger';
  }
};
WKD.clearPendingImport = () => {
  const { $, state } = WKD;
  state.pendingRows = null;
  state.pendingHeaders = [];
  $('#importFileInput').value = '';
  $('#applyImportBtn').disabled = true;
  $('#importLoadedInfo').textContent = 'Файл ще не завантажено.';
  $('#importStatusInfo').textContent = 'Завантаж файл, перевір колонки й натисни «Застосувати імпорт».';
  $('#importStatusInfo').className = 'muted small';
  WKD.renderMappingRows();
  WKD.renderShiftRecognition?.();
};
async function readFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt')) return parseCsvText(await file.text());
  if (!window.XLSX) throw new Error('SheetJS not loaded');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}
function parseCsvText(text) {
  if (window.XLSX) {
    const workbook = XLSX.read(text, { type: 'string' });
    return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
  }
  const lines = text.trim().split(/\r?\n/);
  const headers = splitCsvLine(lines.shift() || '');
  return lines.map(line => Object.fromEntries(headers.map((header, index) => [header, splitCsvLine(line)[index] || ''])));
}
function splitCsvLine(line) {
  const cells = [];
  let value = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) { cells.push(value.trim()); value = ''; }
    else value += ch;
  }
  cells.push(value.trim());
  return cells.map(cell => cell.replace(/^"|"$/g, ''));
}
