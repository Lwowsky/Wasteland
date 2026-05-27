window.WKD = window.WKD || {};

WKD.initImportRegions = () => {
  WKD.renderRegionPanels();
  WKD.$$('.import-region-tab').forEach(button => {
    button.addEventListener('click', () => WKD.switchRegion(button.dataset.importRegionTab));
  });
  WKD.updateShiftVisibility();
};

WKD.renderRegionPanels = () => {
  const root = WKD.$('#importRegionPanels');
  if (!root) return;

  root.innerHTML = WKD.regions.map((region, index) => regionPanelTemplate(region, index)).join('');

  root.querySelectorAll('[data-region-enabled]').forEach(input => {
    input.addEventListener('change', () => {
      const id = input.dataset.regionEnabled;
      WKD.state.regionEnabled[id] = input.checked;
      WKD.saveRegionSettings();
      WKD.renderRegionPanels();
      WKD.switchRegion(id);
      WKD.updateShiftVisibility();
    });
  });

  root.querySelectorAll('[data-region-shift]').forEach(input => {
    input.addEventListener('change', () => {
      WKD.state.regionShifts[input.dataset.regionShift] = input.value;
      WKD.saveRegionSettings();
      WKD.updateShiftVisibility();
    });
  });

  WKD.updateRegionTabs();
};

WKD.switchRegion = region => {
  WKD.$$('.import-region-tab').forEach(button => {
    const active = button.dataset.importRegionTab === region;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  WKD.$$('[data-import-region-panel]').forEach(panel => {
    const active = panel.dataset.importRegionPanel === region;
    panel.hidden = !active;
    panel.classList.toggle('is-active', active);
  });
};

WKD.updateRegionTabs = () => {
  WKD.$$('.import-region-tab').forEach(tab => {
    const id = tab.dataset.importRegionTab;
    tab.classList.toggle('is-disabled-region', WKD.state.regionEnabled[id] === false);
  });
};

WKD.getActiveShiftCount = () => WKD.regions.reduce((max, region) => {
  if (!WKD.state.regionEnabled[region.id]) return max;
  return Math.max(max, Number(WKD.state.regionShifts[region.id] || 2));
}, 1);

WKD.updateShiftVisibility = () => {
  const count = WKD.getActiveShiftCount();
  const shiftGrid = WKD.$('.stat-split--shifts');
  if (shiftGrid) {
    shiftGrid.classList.remove('is-shifts-1', 'is-shifts-2', 'is-shifts-3', 'is-shifts-4');
    shiftGrid.classList.add(`is-shifts-${count}`);
  }

  for (let shift = 1; shift <= 4; shift++) {
    const show = shift <= count;
    const card = WKD.$(`#shift${shift}Count`)?.closest('.stat-chip');
    if (card) card.classList.toggle('is-hidden-shift', !show);
    const option = WKD.$(`#shiftFilter option[value="shift${shift}"]`);
    if (option) option.hidden = !show;
  }

  const filter = WKD.$('#shiftFilter');
  if (filter?.value !== 'all' && filter?.value !== 'both') {
    const chosen = Number(filter.value.replace('shift', ''));
    if (chosen > count) filter.value = 'all';
  }

  if (typeof WKD.renderPlayers === 'function') WKD.renderPlayers();
};

function regionPanelTemplate(region, index) {
  const enabled = WKD.state.regionEnabled[region.id] !== false;
  const disabled = !enabled;
  const active = index === 0;

  return `<div class="import-region-panel ${active ? 'is-active' : ''} ${disabled ? 'is-disabled-region' : ''}" data-import-region-panel="${region.id}" ${active ? '' : 'hidden'}>
    <div class="import-region-panel-head">
      <div class="import-region-title">${region.label}</div>
      ${region.locked ? '<span class="import-region-status">Завжди включено</span>' : regionEnableSwitch(region, enabled)}
    </div>
    <div class="import-shift-toggles" aria-label="Кількість змін для ${region.label}">
      ${[1, 2, 3, 4].map(shift => shiftSwitch(region, shift, disabled)).join('')}
    </div>
  </div>`;
}

function regionEnableSwitch(region, enabled) {
  return `<div class="region-enable-control ${enabled ? '' : 'is-off'}">
    <label class="region-enable-switch" aria-label="Увімкнути ${region.label}">
      <input type="checkbox" data-region-enabled="${region.id}" ${enabled ? 'checked' : ''}>
      <span></span>
    </label>
    <span>${enabled ? 'Включено' : 'Відключено'}</span>
  </div>`;
}

function shiftSwitch(region, shift, disabled) {
  const checked = WKD.state.regionShifts[region.id] === String(shift);
  return `<label class="import-switch ${disabled ? 'is-disabled' : ''}">
    <input type="radio" name="${region.id}Shift" value="${shift}" ${checked ? 'checked' : ''} data-region-shift="${region.id}" ${disabled ? 'disabled' : ''}>
    <span class="import-switch-ui"></span>
    <span>${shift} зміна</span>
  </label>`;
}
