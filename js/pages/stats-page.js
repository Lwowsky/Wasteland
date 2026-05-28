import { watchAuth } from '../services/firebase-service.js';
import { ensureCurrentUserPublished, formatUserDate, listPublicPlayers, roleLabel } from '../services/user-db.js';

const $ = selector => document.querySelector(selector);
let players = [];
let sortState = { key: 'region', dir: 'asc' };
let statsReady = false;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function setStatus(text, type = 'muted') {
  const box = $('#statsStatus');
  if (!box) return;
  box.textContent = text;
  box.dataset.type = type;
}

function setSummary(text) {
  const box = $('#statsSummary');
  if (box) box.textContent = text;
}

function sortPlayers(a, b) {
  const dir = sortState.dir === 'asc' ? 1 : -1;
  const av = sortState.key === 'createdAt' ? (a.createdAt?.toMillis?.() || 0) : (a[sortState.key] ?? '');
  const bv = sortState.key === 'createdAt' ? (b.createdAt?.toMillis?.() || 0) : (b[sortState.key] ?? '');
  return String(av).localeCompare(String(bv), 'uk', { numeric: true }) * dir;
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
  setSummary(`${players.length} гравців`);
}

function rowTemplate(player) {
  const nick = player.nickname || player.gameNick || '—';
  return `<tr>
    <td><strong>${escapeHtml(nick)}</strong></td>
    <td><span class="region-badge">${escapeHtml(player.region || '—')}</span></td>
    <td><span class="alliance-badge">${escapeHtml(player.alliance || '—')}</span></td>
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
    body.innerHTML = '<tr><td colspan="7">Гравців не знайдено.</td></tr>';
    return;
  }
  body.innerHTML = visible.map(rowTemplate).join('');
}

async function loadPlayers() {
  setStatus('Завантажую зареєстрованих гравців...', 'muted');
  players = await listPublicPlayers();
  renderStats();
  renderPlayers();
  setStatus('Список гравців оновлено. Email прихований.', 'success');
}

function bindControls() {
  $('#refreshStatsBtn')?.addEventListener('click', loadPlayers);
  $('#statsNickSearch')?.addEventListener('input', renderPlayers);
  $('#statsAllianceSearch')?.addEventListener('input', renderPlayers);
  $('#statsRegionSearch')?.addEventListener('input', renderPlayers);
  $('#statsRoleFilter')?.addEventListener('change', renderPlayers);
  $('#statsRowsFilter')?.addEventListener('change', renderPlayers);
  document.querySelectorAll('#publicPlayersTable [data-sort]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.sort;
    sortState = { key, dir: sortState.key === key && sortState.dir === 'asc' ? 'desc' : 'asc' };
    renderPlayers();
  }));
}

async function initStatsPage() {
  if (statsReady || !$('#publicPlayersBody')) return;
  statsReady = true;
  bindControls();

  await watchAuth(async user => {
    if (!user) {
      setStatus('Щоб бачити список зареєстрованих гравців, потрібно увійти через Google.', 'warn');
      $('#publicPlayersBody').innerHTML = '<tr><td colspan="7">Увійди через Google, щоб переглядати статистику.</td></tr>';
      return;
    }
    await ensureCurrentUserPublished(user).catch(error => console.warn('Public player sync failed', error));
    await loadPlayers().catch(error => {
      console.error(error);
      setStatus('Не вдалося завантажити статистику. Перевір Firestore Rules.', 'error');
    });
  });
}

document.addEventListener('wkd:partials-ready', initStatsPage);
document.addEventListener('DOMContentLoaded', () => setTimeout(initStatsPage, 0));
