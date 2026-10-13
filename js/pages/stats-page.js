import { getFirebase, watchAuth } from '../services/firebase-service.js';
import { ensureCurrentUserPublished, formatUserDate, listPublicPlayers, roleLabel } from '../services/user-db.js';
import { shiftLabel, troopLabel } from '../services/region-db.js';

const $ = selector => document.querySelector(selector);
let players = [];
let allianceColorCache = new Map();
let sortState = { key: 'region', dir: 'asc' };
let statsReady = false;
let activeModalPlayer = null;
let activeModalTab = 'profile';

function t(key, fallback = '') { return window.WKD_t ? window.WKD_t(key) : (fallback || key); }
function tv(key, fallback = '', vars = {}) {
  let text = t(key, fallback);
  Object.entries(vars).forEach(([name, value]) => { text = text.replaceAll(`{${name}}`, String(value)); });
  return text;
}
function locale() {
  const lang = window.WKD_CURRENT_LANG || document.documentElement.lang || navigator.language || 'en';
  const map = { uk: 'uk-UA', en: 'en-US', ru: 'ru-RU', pl: 'pl-PL', de: 'de-DE', ja: 'ja-JP', zh: 'zh-CN', ko: 'ko-KR', vi: 'vi-VN', ar: 'ar' };
  return map[String(lang).toLowerCase()] || lang || 'en-US';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}


function normTag(value) { return String(value || '').trim().toUpperCase(); }
function normRegion(value) { return String(value || '').trim().replace(/[^0-9]/g, ''); }
function hashHue(value) {
  const text = String(value || 'empty');
  let hash = 2166136261;
  for (const ch of text) { hash ^= ch.codePointAt(0) || 0; hash = Math.imul(hash, 16777619) >>> 0; }
  return hash % 360;
}
function allianceHue(region, alliance) {
  const key = `${normRegion(region)}:${normTag(alliance)}`;
  const custom = allianceColorCache.get(key);
  return Number.isFinite(custom) ? custom : ((hashHue(`${region}:${alliance}`) % 360) + 360) % 360;
}
function allianceBadge(region, alliance) {
  const tag = normTag(alliance) || '—';
  const hue = allianceHue(region, tag);
  return `<span class="alliance-badge" style="--ally-hue:${hue}"><span class="badge-dot"></span><span>${escapeHtml(tag)}</span></span>`;
}
async function loadAllianceColorsForPlayers() {
  allianceColorCache = new Map();
  const firebase = await getFirebase().catch(() => null);
  if (!firebase) return;
  const regions = [...new Set(players.map(player => normRegion(player.region)).filter(Boolean))];
  await Promise.all(regions.map(async region => {
    try {
      const snapshot = await firebase.firestoreMod.getDocs(firebase.firestoreMod.collection(firebase.db, 'regions', region, 'alliances'));
      snapshot.docs.forEach(doc => {
        const data = doc.data() || {};
        const tag = normTag(data.tag || doc.id);
        const hue = Number(data.colorHue);
        if (tag && Number.isFinite(hue)) allianceColorCache.set(`${region}:${tag}`, ((Math.round(hue) % 360) + 360) % 360);
      });
    } catch (error) {
      console.warn('[WKD] stats alliance colors skipped:', error);
    }
  }));
}

function setStatus(text, type = 'muted') {
  const box = $('#statsStatus');
  if (!box) return;
  box.removeAttribute('data-i18n');
  box.textContent = text;
  box.dataset.type = type;
}

function setSummary(text) {
  const box = $('#statsSummary');
  if (box) box.textContent = text;
}

function sortValue(player, key) {
  if (key === 'createdAt') return player.createdAt?.toMillis?.() || 0;
  if (key === 'farmCount') return Number(player.farmCount || 0);
  return player[key] ?? '';
}

function sortPlayers(a, b) {
  const dir = sortState.dir === 'asc' ? 1 : -1;
  return String(sortValue(a, sortState.key)).localeCompare(String(sortValue(b, sortState.key)), locale(), { numeric: true }) * dir;
}

function filteredPlayers() {
  const nick = String($('#statsNickSearch')?.value || '').trim().toLowerCase();
  const alliance = String($('#statsAllianceSearch')?.value || '').trim().toLowerCase();
  const region = String($('#statsRegionSearch')?.value || '').trim().toLowerCase();
  const role = $('#statsRoleFilter')?.value || 'all';
  const rows = $('#statsRowsFilter')?.value || '10';
  const visible = [...players]
    .filter(player => role === 'all' || (player.role || 'player') === role)
    .filter(player => {
      const userNick = String(player.nickname || player.gameNick || '').toLowerCase();
      const userAlliance = String(player.alliance || '').toLowerCase();
      const userRegion = String(player.region || '').toLowerCase();
      return (!nick || userNick.includes(nick))
        && (!alliance || userAlliance.includes(alliance))
        && (!region || userRegion.includes(region));
    })
    .sort(sortPlayers);
  if (rows === 'all') return visible;
  return visible.slice(0, Number(rows) || 10);
}

function renderStats() {
  const regions = new Set(players.map(player => player.region).filter(Boolean));
  const alliances = new Set(players.map(player => player.alliance).filter(Boolean));
  const leaders = players.filter(player => ['admin', 'moderator', 'consul', 'officer'].includes(player.role)).length;
  const values = [players.length, regions.size, alliances.size, leaders];
  $('#publicStats')?.querySelectorAll('.admin-stat-card b').forEach((card, index) => { card.textContent = values[index] ?? 0; });
  setSummary(tv('stats.summaryPlayers', '{count} players', { count: players.length }));
}

function rowTemplate(player) {
  const nick = player.nickname || player.gameNick || '—';
  const uid = player.uid || player.id || '';
  return `<tr>
    <td><button class="stats-player-link" type="button" data-player-id="${escapeHtml(uid)}"><strong>${escapeHtml(nick)}</strong></button></td>
    <td><span class="region-badge">${escapeHtml(player.region || '—')}</span></td>
    <td><span class="farm-count-badge">${escapeHtml(player.farmCount ?? 0)}</span></td>
    <td>${allianceBadge(player.region, player.alliance)}</td>
    <td><span class="rank-badge">${escapeHtml(String(player.rank || 'p1').toUpperCase())}</span></td>
    <td><span class="shk-badge">${escapeHtml(player.shk || '—')}</span></td>
    <td><span class="role-badge role-${escapeHtml(player.role || 'player')}">${escapeHtml(roleLabel(player.role || 'player'))}</span></td>
    <td>${formatUserDate(player.createdAt)}</td>
  </tr>`;
}

function renderPlayers() {
  const body = $('#publicPlayersBody');
  if (!body) return;
  const visible = filteredPlayers();
  if (!visible.length) {
    body.innerHTML = `<tr><td colspan="8">${escapeHtml(t('stats.noPlayersFound', 'No players found.'))}</td></tr>`;
    return;
  }
  body.innerHTML = visible.map(rowTemplate).join('');
}

function textLine(label, value) {
  return `<div class="stats-info-line"><span>${escapeHtml(label)}</span><b>${escapeHtml(value || '—')}</b></div>`;
}

function formatNumber(value) {
  const number = Number(String(value || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) && number > 0 ? number.toLocaleString(locale()) : (value || '—');
}

function extraInfoHtml(wasteland = null) {
  if (!wasteland) {
    return `<div class="stats-empty-note">${escapeHtml(t('stats.extraHidden', 'The player hid extra region-form information.'))}</div>`;
  }
  return `<div class="stats-info-grid">
    ${textLine(t('stats.lairLevel', 'Lair level'), wasteland.lairLevel)}
    ${textLine(t('playerEdit.troopType', 'Troop type'), troopLabel(wasteland.troopType || ''))}
    ${textLine(t('playerEdit.tier', 'Tier'), wasteland.tier)}
    ${textLine(t('playerEdit.march', 'March size'), formatNumber(wasteland.marchSize))}
    ${textLine(t('playerEdit.rally', 'Rally size'), formatNumber(wasteland.rallySize))}
    ${textLine(t('common.shift', 'Shift'), shiftLabel(wasteland.shift || ''))}
    ${textLine(t('players.captain', 'Captain'), wasteland.captainReady ? t('common.yes', 'Yes') : t('common.no', 'No'))}
    ${textLine(t('stats.participation', 'Participation'), wasteland.readyToJoin ? t('common.yes', 'Yes') : t('common.no', 'No'))}
    ${textLine(t('stats.attack', 'Attack'), wasteland.readyToAttack ? t('common.yes', 'Yes') : t('common.no', 'No'))}
    ${textLine(t('stats.extraSquad', 'Extra squad'), wasteland.extraEnabled ? ((Array.isArray(wasteland.extraSquads) && wasteland.extraSquads.length ? wasteland.extraSquads : [{ troopType: wasteland.extraTroopType, tier: wasteland.extraTier }]).map(item => `${troopLabel(item.troopType || '')} · ${item.tier || '—'}`).join(' / ')) : t('common.no', 'No'))}
  </div>`;
}

function profilePanel(player) {
  return `<section class="stats-modal-panel is-active" data-stats-panel="profile">
    <div class="stats-profile-card">
      <img src="${escapeHtml(player.photoURL || 'img/logo.webp')}" alt="Avatar" />
      <div>
        <h3>${escapeHtml(player.nickname || player.gameNick || '—')}</h3>
        <span class="role-badge role-${escapeHtml(player.role || 'player')}">${escapeHtml(roleLabel(player.role || 'player'))}</span>
      </div>
    </div>
    <div class="stats-info-grid">
      ${textLine(t('account.nickname', 'Nickname'), player.nickname || player.gameNick)}
      ${textLine(t('account.region', 'Region'), player.region)}
      ${textLine(t('account.alliance', 'Alliance'), player.alliance)}
      ${textLine(t('account.rank', 'Rank'), String(player.rank || '').toUpperCase())}
      ${textLine(t('account.shk', 'HQ'), player.shk)}
      ${textLine(t('stats.farmsCount', 'Farms'), player.farmCount ?? 0)}
      ${textLine(t('stats.registeredAt', 'Registered'), formatUserDate(player.createdAt))}
      ${textLine(t('stats.updatedAt', 'Updated'), formatUserDate(player.updatedAt))}
    </div>
  </section>`;
}

function extraPanel(player) {
  return `<section class="stats-modal-panel" data-stats-panel="extra" hidden>
    <h3>${escapeHtml(t('stats.extraInfo', 'Extra information'))}</h3>
    ${extraInfoHtml(player.wastelandProfile)}
  </section>`;
}

function farmCard(farm, index, showExtra) {
  const meta = [farm.region ? `R${farm.region}` : '', farm.alliance, farm.rank ? String(farm.rank).toUpperCase() : '', farm.shk ? `${t('account.shk', 'HQ')} ${farm.shk}` : ''].filter(Boolean).join(' · ');
  return `<article class="stats-farm-card">
    <div><b>${escapeHtml(farm.nickname || `${t('stats.farm', 'Farm')} ${index + 1}`)}</b><span>${escapeHtml(meta || '—')}</span></div>
    ${showExtra ? extraInfoHtml(farm.wastelandProfile) : ''}
  </article>`;
}

function farmsPanel(player) {
  const farms = Array.isArray(player.farms) ? player.farms : [];
  const showFarms = Boolean(player.profileVisibility?.showFarmsInfo);
  const showExtra = Boolean(player.profileVisibility?.showWastelandInfo);
  const content = showFarms && farms.length
    ? farms.map((farm, index) => farmCard(farm, index, showExtra)).join('')
    : `<div class="stats-empty-note">${escapeHtml(tv('stats.farmsHidden', 'The player hid farm information. Farm count: {count}.', { count: player.farmCount ?? 0 }))}</div>`;
  return `<section class="stats-modal-panel" data-stats-panel="farms" hidden>
    <h3>${escapeHtml(t('stats.accountFarms', 'Account farms'))}</h3>
    ${content}
  </section>`;
}

function activateModalTab(tab = 'profile') {
  activeModalTab = tab;
  document.querySelectorAll('.stats-modal-tab').forEach(button => {
    const active = button.dataset.statsTab === tab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('[data-stats-panel]').forEach(panel => {
    const active = panel.dataset.statsPanel === tab;
    panel.classList.toggle('is-active', active);
    panel.hidden = !active;
  });
}

function openPlayerModal(player) {
  activeModalPlayer = player;
  const modal = $('#playerStatsModal');
  const body = $('#playerStatsModalBody');
  if (!modal || !body) return;
  $('#playerStatsModalTitle').textContent = player.nickname || player.gameNick || t('stats.modalTitle', 'Player profile');
  $('#playerStatsModalLead').textContent = tv('stats.regionLine', 'Region {region} · {alliance} · {rank}', { region: player.region || '—', alliance: player.alliance || '—', rank: String(player.rank || '').toUpperCase() || '—' });
  const roleBadge = $('#playerStatsModalRole');
  if (roleBadge) {
    roleBadge.textContent = roleLabel(player.role || 'player');
    roleBadge.className = `role-badge role-${player.role || 'player'}`;
  }
  body.innerHTML = profilePanel(player) + extraPanel(player) + farmsPanel(player);
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  activateModalTab('profile');
}

function closePlayerModal() {
  const modal = $('#playerStatsModal');
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  activeModalPlayer = null;
}

async function loadPlayers() {
  setStatus(t('stats.loadingPlayers', 'Loading registered players...'), 'muted');
  players = await listPublicPlayers();
  await loadAllianceColorsForPlayers();
  renderStats();
  renderPlayers();
  setStatus(t('stats.updated', 'Player list updated.'), 'success');
}

function bindControls() {
  $('#refreshStatsBtn')?.addEventListener('click', loadPlayers);
  $('#statsNickSearch')?.addEventListener('input', renderPlayers);
  $('#statsAllianceSearch')?.addEventListener('input', renderPlayers);
  $('#statsRegionSearch')?.addEventListener('input', renderPlayers);
  $('#statsRoleFilter')?.addEventListener('change', renderPlayers);
  $('#statsRowsFilter')?.addEventListener('change', renderPlayers);
  $('#publicPlayersBody')?.addEventListener('click', event => {
    const button = event.target.closest('[data-player-id]');
    if (!button) return;
    const player = players.find(item => (item.uid || item.id || '') === button.dataset.playerId);
    if (player) openPlayerModal(player);
  });
  document.querySelectorAll('#publicPlayersTable [data-sort]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.sort;
    sortState = { key, dir: sortState.key === key && sortState.dir === 'asc' ? 'desc' : 'asc' };
    renderPlayers();
  }));
  document.querySelectorAll('[data-close-stats-modal]').forEach(button => button.addEventListener('click', closePlayerModal));
  document.querySelectorAll('.stats-modal-tab').forEach(button => button.addEventListener('click', () => activateModalTab(button.dataset.statsTab)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && activeModalPlayer) closePlayerModal();
  });
}

async function initStatsPage() {
  if (statsReady || !$('#publicPlayersBody')) return;
  statsReady = true;
  bindControls();

  await watchAuth(async user => {
    if (!user) {
      setStatus(t('stats.loginRequired', 'Sign in with Google to view the registered player list.'), 'warn');
      $('#publicPlayersBody').innerHTML = `<tr><td colspan="8">${escapeHtml(t('stats.loginTable', 'Sign in with Google to view statistics.'))}</td></tr>`;
      return;
    }
    await ensureCurrentUserPublished(user).catch(error => console.warn('Public player sync failed', error));
    await loadPlayers().catch(error => {
      console.error(error);
      setStatus(t('stats.loadFailed', 'Could not load statistics. Try again.'), 'error');
    });
  });
}

document.addEventListener('wkd:partials-ready', initStatsPage);
document.addEventListener('DOMContentLoaded', () => setTimeout(initStatsPage, 0));

document.addEventListener('wkd:language-changed', () => {
  if (!statsReady) return;
  renderStats();
  renderPlayers();
  if (activeModalPlayer) openPlayerModal(activeModalPlayer);
});
