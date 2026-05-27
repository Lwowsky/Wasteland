window.WKD = window.WKD || {};

WKD.initShiftRecognition = () => {
  const saveBtn = WKD.$('#saveShiftRulesBtn');
  const resetBtn = WKD.$('#resetShiftRulesBtn');
  const autoBtn = WKD.$('#autoDetectShiftRulesBtn');
  const mode = WKD.$('#shiftMergeMode');
  if (mode) {
    mode.value = WKD.state.shiftMergeMode || 'custom';
    mode.addEventListener('change', () => {
      WKD.state.shiftMergeMode = mode.value;
      WKD.saveJson(WKD.storageKeys.shiftMergeMode, WKD.state.shiftMergeMode);
      applyMergeModeToRules();
      WKD.renderShiftRecognition();
      setShiftFooter('Є незбережені правила. Натисни «Зберегти правила».');
    });
  }
  if (saveBtn) saveBtn.addEventListener('click', saveShiftRules);
  if (resetBtn) resetBtn.addEventListener('click', resetShiftRules);
  if (autoBtn) autoBtn.addEventListener('click', autoDetectShiftRules);
  WKD.renderShiftRecognition();
};

WKD.renderShiftRecognition = () => {
  const root = WKD.$('#shiftRecognitionBody');
  const mode = WKD.$('#shiftMergeMode');
  if (mode) mode.value = WKD.state.shiftMergeMode || 'custom';
  if (!root) return;
  const values = getShiftValues();
  if (!values.length) {
    root.innerHTML = '<div class="shift-recognition-empty">Вибери колонку зміни в обов’язкових колонках, і тут з’явиться перевірка.</div>';
    setShiftFooter('Правила ще не застосовані.');
    return;
  }

  root.innerHTML = `<div class="shift-rule-table">
    <div class="shift-rule-head"><span>Значення з Excel</span><span>Розпізнано як</span><span>Після об’єднання</span><span>Рядків</span></div>
    ${values.map(item => shiftRuleRow(item)).join('')}
  </div>`;

  root.querySelectorAll('[data-shift-rule-value]').forEach(select => {
    select.addEventListener('change', () => {
      WKD.state.shiftMergeMode = 'custom';
      WKD.saveJson(WKD.storageKeys.shiftMergeMode, 'custom');
      const mode = WKD.$('#shiftMergeMode');
      if (mode) mode.value = 'custom';
      WKD.state.shiftRules[select.dataset.shiftRuleValue] = select.value;
      const pill = root.querySelector(`[data-shift-rule-pill="${CSS.escape(select.dataset.shiftRuleValue)}"]`);
      if (pill) pill.textContent = labelFor(select.value);
      setShiftFooter('Є незбережені правила.');
    });
  });
};

WKD.applyShiftRule = value => {
  const raw = WKD.clean(value);
  return WKD.state.shiftRules[raw] || mergeShift(detectShift(raw));
};

function getShiftValues() {
  const rows = WKD.state.pendingRows || [];
  const key = WKD.state.mappings.shift;
  if (!rows.length || !key) return [];
  const map = new Map();
  rows.forEach(row => {
    const raw = WKD.clean(row[key]);
    if (!raw) return;
    const item = map.get(raw) || { value: raw, count: 0 };
    item.count += 1;
    map.set(raw, item);
  });
  return [...map.values()].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'uk'));
}

function shiftRuleRow(item) {
  const current = WKD.state.shiftRules[item.value] || mergeShift(detectShift(item.value));
  return `<div class="shift-rule-row">
    <span>${WKD.escapeHtml(item.value)}</span>
    <select data-shift-rule-value="${WKD.escapeHtml(item.value)}">${options(current)}</select>
    <span class="shift-rule-pill" data-shift-rule-pill="${WKD.escapeHtml(item.value)}">${labelFor(current)}</span>
    <strong>${item.count}</strong>
  </div>`;
}

function options(current) {
  return [
    ['shift1', 'Зміна 1'], ['shift2', 'Зміна 2'], ['shift3', 'Зміна 3'], ['shift4', 'Зміна 4'], ['both', 'Обидві']
  ].map(([value, label]) => `<option value="${value}" ${value === current ? 'selected' : ''}>${label}</option>`).join('');
}

function detectShift(value) {
  const text = WKD.clean(value).toLowerCase();
  if (/both|all|всі|все|обидві|обе/.test(text)) return 'both';
  if (/4/.test(text)) return 'shift4';
  if (/3/.test(text)) return 'shift3';
  if (/2/.test(text)) return 'shift2';
  if (/1/.test(text)) return 'shift1';
  return 'both';
}

function mergeShift(shift) {
  const mode = WKD.state.shiftMergeMode || 'custom';
  if (mode === 'allTo1') return 'shift1';
  if (mode === 'pair12_34') {
    if (shift === 'shift1' || shift === 'shift2') return 'shift1';
    if (shift === 'shift3' || shift === 'shift4') return 'shift2';
  }
  return shift;
}

function applyMergeModeToRules() {
  const values = getShiftValues();
  if (!values.length) return;
  values.forEach(item => { WKD.state.shiftRules[item.value] = mergeShift(detectShift(item.value)); });
}

function labelFor(value) {
  return { shift1: 'Зміна 1', shift2: 'Зміна 2', shift3: 'Зміна 3', shift4: 'Зміна 4', both: 'Обидві' }[value] || 'Обидві';
}

function saveShiftRules() {
  WKD.saveJson(WKD.storageKeys.shiftRules, WKD.state.shiftRules);
  WKD.saveJson(WKD.storageKeys.shiftMergeMode, WKD.state.shiftMergeMode || 'custom');
  setShiftFooter('Правила збережені.');
  WKD.showNotice('Правила розпізнавання змін збережено.');
}

function resetShiftRules() {
  WKD.state.shiftRules = {};
  WKD.state.shiftMergeMode = 'custom';
  localStorage.removeItem(WKD.storageKeys.shiftRules);
  localStorage.removeItem(WKD.storageKeys.shiftMergeMode);
  WKD.renderShiftRecognition();
  WKD.showNotice('Правила змін скинуто.');
}

function autoDetectShiftRules() {
  WKD.state.shiftMergeMode = 'custom';
  getShiftValues().forEach(item => { WKD.state.shiftRules[item.value] = detectShift(item.value); });
  WKD.renderShiftRecognition();
  setShiftFooter('Авто-розпізнавання готове. Натисни «Зберегти правила».');
}

function setShiftFooter(text) {
  const footer = WKD.$('#shiftRecognitionStatus');
  if (footer) footer.textContent = text;
}
