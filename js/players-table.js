window.WKD = window.WKD || {};

WKD.initPlayersTable = () => {
  const { $, $$, state } = WKD;
  state.players = state.players.map(normalizeStoredPlayer).filter(player => player.name);

  ['searchFilter', 'roleFilter', 'shiftFilter', 'statusFilter', 'tierFilter', 'pageSizeSelect'].forEach(id => {
    $('#' + id).addEventListener('input', () => {
      state.page = 1;
      state.pageSize = $('#pageSizeSelect').value === 'all' ? 'all' : Number($('#pageSizeSelect').value || 10);
      WKD.renderPlayers();
    });
  });

  $('#resetFiltersBtn').addEventListener('click', () => {
    $('#searchFilter').value = '';
    ['roleFilter', 'shiftFilter', 'statusFilter', 'tierFilter'].forEach(id => $('#' + id).value = 'all');
    $('#pageSizeSelect').value = '10';
    state.page = 1;
    state.pageSize = 10;
    WKD.renderPlayers();
  });

  $('#showAllDataBtn').addEventListener('click', () => {
    state.showOptional = !state.showOptional;
    $('#showAllDataBtn').setAttribute('aria-pressed', String(state.showOptional));
    $('#showAllDataBtn').textContent = state.showOptional ? 'Сховати зайві дані' : 'Показати всі дані';
    $$('.optional-col').forEach(el => el.classList.toggle('is-hidden-col', !state.showOptional));
  });

  $$('.sort-btn[data-sort]').forEach(button => button.addEventListener('click', () => {
    const field = button.dataset.sort;
    state.sort.dir = state.sort.field === field ? state.sort.dir * -1 : 1;
    state.sort.field = field;
    $$('.sort-btn').forEach(btn => btn.classList.remove('is-desc'));
    button.classList.toggle('is-desc', state.sort.dir < 0);
    WKD.renderPlayers();
  }));

  $('#pagePrevBtn').addEventListener('click', () => {
    state.page = Math.max(1, state.page - 1);
    WKD.renderPlayers();
  });
  $('#pageNextBtn').addEventListener('click', () => {
    state.page += 1;
    WKD.renderPlayers();
  });

  WKD.renderPlayers();
  if (typeof WKD.updateShiftVisibility === 'function') WKD.updateShiftVisibility();
};

WKD.setPlayers = (rows, options = {}) => {
  const persist = options.persist !== false;
  const alreadyNormalized = options.normalized === true;
  WKD.state.players = rows
    .map(row => alreadyNormalized ? normalizeStoredPlayer(row) : normalizePlayer(row))
    .filter(player => player.name);
  WKD.state.page = 1;
  if (persist) WKD.saveJson(WKD.storageKeys.players, WKD.state.players);
  else localStorage.removeItem(WKD.storageKeys.players);
  WKD.renderPlayers();
};

WKD.renderPlayers = () => {
  renderStats();
  renderTable();
};

function normalizePlayer(row) {
  return {
    name: WKD.clean(WKD.getMappedValue(row, 'name')),
    alliance: WKD.clean(WKD.getMappedValue(row, 'alliance')),
    role: normalizeRole(WKD.getMappedValue(row, 'role')),
    tier: normalizeTier(WKD.getMappedValue(row, 'tier')),
    march: toNumber(WKD.getMappedValue(row, 'march')),
    rally: toNumber(WKD.getMappedValue(row, 'rally')),
    captain: normalizeYes(WKD.getMappedValue(row, 'captain') || row.captain || row.captainReady || row['Готовність бути капітаном'] || row['готовність бути капітаном'] || row['Captain readiness'] || row['Captain ready']),
    shift: normalizeShift(WKD.getMappedValue(row, 'shift')),
    lair: WKD.clean(WKD.getMappedValue(row, 'lair'))
  };
}

function normalizeStoredPlayer(player) {
  const captainValue = Object.prototype.hasOwnProperty.call(player, 'captain') ? player.captain : player.captainReady;
  return {
    name: WKD.clean(player.name),
    alliance: WKD.clean(player.alliance),
    role: normalizeRole(player.role),
    tier: normalizeTier(player.tier),
    march: toNumber(player.march),
    rally: toNumber(player.rally),
    captain: normalizeYes(captainValue),
    shift: normalizeShift(player.shift || player.shiftLabel || player.registeredShift),
    lair: WKD.clean(player.lair || player.lairLevel)
  };
}

function renderStats() {
  const players = WKD.state.players;
  WKD.$('#totalPlayers').textContent = players.length;
  WKD.$('#captainsReady').textContent = players.filter(p => p.captain).length;
  WKD.$('#fighterCount').textContent = players.filter(p => p.role === 'Fighter').length;
  WKD.$('#riderCount').textContent = players.filter(p => p.role === 'Rider').length;
  WKD.$('#shooterCount').textContent = players.filter(p => p.role === 'Shooter').length;
  WKD.$('#shift1Count').textContent = players.filter(p => p.shift === 'shift1').length;
  WKD.$('#shift2Count').textContent = players.filter(p => p.shift === 'shift2').length;
  WKD.$('#shift3Count').textContent = players.filter(p => p.shift === 'shift3').length;
  WKD.$('#shift4Count').textContent = players.filter(p => p.shift === 'shift4').length;
  WKD.$('#bothCount').textContent = players.filter(p => p.shift === 'both').length;
}

function renderTable() {
  const state = WKD.state;
  const tbody = WKD.$('#playersTbody');
  const list = filteredPlayers();
  const pageSize = state.pageSize === 'all' ? list.length || 1 : state.pageSize;
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  state.page = Math.min(state.page, totalPages);
  const pageRows = list.slice((state.page - 1) * pageSize, state.page * pageSize);

  if (!state.players.length) tbody.innerHTML = '<tr><td colspan="10" class="empty-cell">Імпортуй Excel або CSV файл, щоб показати гравців.</td></tr>';
  else if (!pageRows.length) tbody.innerHTML = '<tr><td colspan="10" class="empty-cell">Немає гравців за вибраними фільтрами.</td></tr>';
  else tbody.innerHTML = pageRows.map(rowTemplate).join('');

  WKD.$('#pageInfoText').textContent = `Сторінка ${state.page} / ${totalPages} • показано ${list.length}`;
  WKD.$('#pagePrevBtn').disabled = state.page <= 1;
  WKD.$('#pageNextBtn').disabled = state.page >= totalPages;
}

function filteredPlayers() {
  const { $, state } = WKD;
  const query = $('#searchFilter').value.trim().toLowerCase();
  const role = $('#roleFilter').value;
  const shift = $('#shiftFilter').value;
  const status = $('#statusFilter').value;
  const tier = $('#tierFilter').value;

  let list = state.players.filter(player => {
    const haystack = `${player.name} ${player.alliance}`.toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (role !== 'all' && player.role !== role) return false;
    if (shift !== 'all' && player.shift !== shift) return false;
    if (tier !== 'all' && player.tier !== tier) return false;
    if (status === 'captains' && !player.captain) return false;
    return true;
  });

  if (state.sort.field) {
    list = [...list].sort((a, b) => compareValues(a[state.sort.field], b[state.sort.field]) * state.sort.dir);
  }
  return list;
}

function rowTemplate(player) {
  return `<tr>
    <td data-field="name">${WKD.escapeHtml(player.name)}</td>
    <td data-field="alliance">${allianceBadge(player.alliance)}</td>
    <td data-field="role"><span class="tag ${roleClass(player.role)}">${roleLabel(player.role)}</span></td>
    <td data-field="tier">${tierBadge(player.tier)}</td>
    <td data-field="march">${WKD.formatNumber(player.march)}</td>
    <td data-field="rally">${WKD.formatNumber(player.rally)}</td>
    <td data-field="captainReady"><span class="captain-badge ${player.captain ? 'yes' : 'no'}">${player.captain ? 'Так' : 'Ні'}</span></td>
    <td data-field="shiftLabel"><span class="shift-badge ${player.shift}">${shiftLabel(player.shift)}</span></td>
    <td data-field="lair" class="optional-col ${WKD.state.showOptional ? '' : 'is-hidden-col'}">${WKD.escapeHtml(player.lair || '—')}</td>
    <td data-field="actions">${placementTemplate()}</td>
  </tr>`;
}

function placementTemplate() {
  const count = Math.max(1, Math.min(4, Number(WKD.getActiveShiftCount?.() || 2)));
  const items = Array.from({ length: count }, (_, index) => `
    <span class="placement-item" data-placement-shift="${index + 1}">
      <b>Зміна ${index + 1}</b>
      <strong>Резерв</strong>
      <small>Не призначено</small>
    </span>`).join('');
  return `<div class="placement-card" style="--placement-cols:${count}">${items}<button class="placement-edit" type="button" aria-label="Редагувати розміщення">✎</button></div>`;
}

function allianceBadge(alliance) {
  const text = WKD.escapeHtml(alliance || '—');
  const hue = hashHue(alliance || 'empty');
  return `<span class="alliance-badge" style="--ally-hue:${hue}"><span class="badge-dot"></span><span>${text}</span></span>`;
}

function tierBadge(tier) {
  const safe = WKD.escapeHtml(tier || '—');
  const number = Number(String(tier).replace(/[^0-9]/g, '')) || 0;
  return `<span class="tier-badge tier-badge--t${number || 'unknown'}" data-tier-level="${number}" style="${tierVars(number)}"><span class="badge-dot"></span><span>${safe}</span></span>`;
}


function tierVars(number) {
  const palette = {
    14:['rgba(255,184,77,.26)','rgba(255,213,102,.82)','rgba(255,198,70,.30)','#ffd86e'],
    13:['rgba(255,111,199,.24)','rgba(255,134,219,.76)','rgba(255,111,199,.28)','#ff9ddd'],
    12:['rgba(156,111,255,.24)','rgba(178,154,255,.76)','rgba(156,111,255,.27)','#c5b4ff'],
    11:['rgba(82,145,255,.24)','rgba(126,175,255,.76)','rgba(82,145,255,.25)','#94bdff'],
    10:['rgba(238,94,188,.22)','rgba(255,137,220,.68)','rgba(238,94,188,.25)','#ff9cdd'],
    9:['rgba(202,102,255,.22)','rgba(224,153,255,.64)','rgba(202,102,255,.23)','#e4a6ff'],
    8:['rgba(70,205,150,.20)','rgba(100,232,174,.62)','rgba(70,205,150,.22)','#80f0bd'],
    7:['rgba(255,169,74,.20)','rgba(255,190,96,.60)','rgba(255,169,74,.21)','#ffc56c'],
    6:['rgba(76,217,255,.20)','rgba(105,226,255,.58)','rgba(76,217,255,.20)','#89efff'],
    5:['rgba(101,255,155,.18)','rgba(130,255,177,.56)','rgba(101,255,155,.18)','#9affc3'],
    4:['rgba(255,118,118,.18)','rgba(255,148,148,.54)','rgba(255,118,118,.18)','#ffaaaa'],
    3:['rgba(255,216,80,.18)','rgba(255,226,108,.52)','rgba(255,216,80,.17)','#ffe678'],
    2:['rgba(116,144,255,.18)','rgba(150,170,255,.52)','rgba(116,144,255,.16)','#afc0ff'],
    1:['rgba(190,204,226,.16)','rgba(220,231,248,.44)','rgba(190,204,226,.13)','#e6efff']
  };
  const item = palette[number] || ['rgba(148,163,184,.16)','rgba(203,213,225,.44)','rgba(148,163,184,.14)','#e2e8f0'];
  return `--tier-bg:${item[0]};--tier-border:${item[1]};--tier-glow:${item[2]};--tier-accent:${item[3]};`;
}

function hashHue(value) {
  const hash = [...String(value)].reduce((sum, ch) => ((sum << 5) - sum + ch.charCodeAt(0)) | 0, 0);
  return ((hash % 360) + 360) % 360;
}

function toNumber(value) {
  const n = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function normalizeTier(value) {
  const text = WKD.clean(value).toUpperCase();
  const found = text.match(/T?\s*(\d{1,2})/);
  return found ? `T${found[1]}` : text;
}

function normalizeYes(value) {
  if (value === true) return true;
  if (value === false || value == null) return false;
  const text = WKD.clean(value).toLowerCase().normalize('NFKC');
  if (!text) return false;
  const negative = ['0', 'false', 'no', 'n', 'ні', 'нi', 'нет', 'не готов', 'not ready', 'відмова', 'отказ', 'decline'];
  if (negative.some(token => text === token || text.includes(token))) return false;
  const positive = ['1', 'true', 'yes', 'y', 'так', 'да', 'готов', 'готовий', 'готова', 'ready', 'ok', 'можу', 'может', 'can'];
  if (positive.some(token => text === token || text.includes(token))) return true;
  return /✅|✔|\+/.test(text);
}

function normalizeRole(value) {
  const text = WKD.clean(value).toLowerCase();
  if (/fighter|infantry|боец|боєць|бійц|воїн|воин|піхот|пехот|fight/.test(text)) return 'Fighter';
  if (/rider|cavalry|наїз|наезд|кавал|riders|ride/.test(text)) return 'Rider';
  if (/shooter|стрілець|стрільц|стрел|shoot|marksman/.test(text)) return 'Shooter';
  return WKD.clean(value) || '—';
}

function normalizeShift(value) {
  const raw = WKD.clean(value);
  const ruled = WKD.applyShiftRule?.(raw);
  if (ruled) return ruled;
  const text = raw.toLowerCase();
  if (/both|all|всі|все|обидві|обе/.test(text)) return 'both';
  if (/4/.test(text)) return 'shift4';
  if (/3/.test(text)) return 'shift3';
  if (/2/.test(text)) return 'shift2';
  if (/1/.test(text)) return 'shift1';
  return 'both';
}

function compareValues(a, b) {
  const an = Number(String(a).replace(/[^0-9.-]/g, ''));
  const bn = Number(String(b).replace(/[^0-9.-]/g, ''));
  if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
  return String(a ?? '').localeCompare(String(b ?? ''), 'uk', { numeric: true, sensitivity: 'base' });
}

function roleClass(role) {
  return role === 'Fighter' ? 'fighter' : role === 'Rider' ? 'rider' : role === 'Shooter' ? 'shooter' : '';
}

function roleLabel(role) {
  return role === 'Fighter' ? 'Бійці' : role === 'Rider' ? 'Наїзники' : role === 'Shooter' ? 'Стрільці' : WKD.escapeHtml(role || '—');
}

function shiftLabel(shift) {
  return { shift1: 'Зміна 1', shift2: 'Зміна 2', shift3: 'Зміна 3', shift4: 'Зміна 4', both: 'Обидві' }[shift] || 'Всі';
}
