import { watchAuth } from '../services/firebase-service.js';
import {
  approveRoleRequest,
  declineRoleRequest,
  ensureCurrentUserPublished,
  formatUserDate,
  getGameProfile,
  assignableRolesForActor,
  canUseAdminPanel,
  getUserProfile,
  listRegisteredUsers,
  listRoleRequests,
  roleLabel,
  syncPublicPlayersFromUsers,
  updateUserByAdmin
} from '../services/user-db.js';

const $ = selector => document.querySelector(selector);
const ROLE_LABELS = { admin: 'Адмін', moderator: 'Модератор', consul: 'Консул', officer: 'Офіцер', player: 'Простий гравець' };
const rankOptions = ['p1', 'p2', 'p3', 'p4', 'p5'];

let adminReady = false;
let currentUser = null;
let currentProfile = null;
let users = [];
let requests = [];
let sortState = { key: 'createdAt', dir: 'desc' };
let editUid = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function setStatus(text, type = 'muted') {
  const box = $('#adminStatus');
  if (!box) return;
  box.textContent = text;
  box.dataset.type = type;
}

function setSummary(text) {
  const box = $('#adminSummary');
  if (box) box.textContent = text;
}

function getRoleBadge(role) {
  const normalized = role || 'player';
  return `<span class="role-badge role-${escapeHtml(normalized)}">${escapeHtml(roleLabel(normalized))}</span>`;
}

function getRankBadge(rank) {
  return `<span class="rank-badge">${escapeHtml(String(rank || 'p1').toUpperCase())}</span>`;
}

function getRegionBadge(region) {
  return `<span class="region-badge">${escapeHtml(region || '—')}</span>`;
}

function getShkBadge(shk) {
  return `<span class="shk-badge">${escapeHtml(shk || '—')}</span>`;
}

function roleOptionsFor(currentRole = 'player') {
  const allowed = assignableRolesForActor(currentUser, currentProfile);
  return [...new Set([currentRole || 'player', ...allowed])].filter(Boolean);
}

function filteredUsers() {
  const nick = String($('#adminNickSearch')?.value || '').trim().toLowerCase();
  const alliance = String($('#adminAllianceSearch')?.value || '').trim().toLowerCase();
  const region = String($('#adminRegionSearch')?.value || '').trim().toLowerCase();
  const role = $('#adminRoleFilter')?.value || 'all';
  const rows = $('#adminRowsFilter')?.value || '10';
  const sorted = [...users]
    .filter(user => (role === 'all' || (user.role || 'player') === role))
    .filter(user => {
      const game = getGameProfile(user);
      const userNick = String(game.nickname || '').toLowerCase();
      const userAlliance = String(game.alliance || '').toLowerCase();
      const userRegion = String(game.region || '').toLowerCase();
      return (!nick || userNick.includes(nick))
        && (!alliance || userAlliance.includes(alliance))
        && (!region || userRegion.includes(region));
    })
    .sort(sortUsers);

  if (rows === 'all') return sorted;
  return sorted.slice(0, Number(rows) || 10);
}

function sortUsers(a, b) {
  const dir = sortState.dir === 'asc' ? 1 : -1;
  const aGame = getGameProfile(a);
  const bGame = getGameProfile(b);
  let av = sortState.key === 'createdAt' ? (a.createdAt?.toMillis?.() || 0) : (aGame[sortState.key] ?? a[sortState.key] ?? '');
  let bv = sortState.key === 'createdAt' ? (b.createdAt?.toMillis?.() || 0) : (bGame[sortState.key] ?? b[sortState.key] ?? '');
  return String(av).localeCompare(String(bv), 'uk', { numeric: true }) * dir;
}

function renderStats() {
  const regions = new Set(users.map(user => getGameProfile(user).region).filter(Boolean));
  const leaders = users.filter(user => ['admin', 'moderator', 'consul', 'officer'].includes(user.role)).length;
  const pending = requests.length;
  const cards = $('#adminStats')?.querySelectorAll('.admin-stat-card b') || [];
  const values = [users.length, regions.size, leaders, pending];
  cards.forEach((card, index) => { card.textContent = values[index] ?? 0; });
  setSummary(`${users.length} гравців • ${pending} заявок`);
}

function editCell(name, value, type = 'text') {
  return `<input class="admin-edit-input" data-edit="${name}" type="${type}" value="${escapeHtml(value)}" />`;
}

function editSelect(name, value, options, labels = null) {
  return `<select class="admin-edit-input" data-edit="${name}">${options.map(option => `
    <option value="${escapeHtml(option)}" ${option === value ? 'selected' : ''}>${escapeHtml(labels?.[option] || option.toUpperCase())}</option>
  `).join('')}</select>`;
}

function userRow(user) {
  const game = getGameProfile(user);
  const editing = editUid === user.uid;
  if (editing) {
    return `<tr data-uid="${escapeHtml(user.uid)}" class="is-editing">
      <td>${editCell('nickname', game.nickname)}</td>
      <td>${editCell('region', game.region, 'number')}</td>
      <td>${editCell('alliance', game.alliance)}</td>
      <td>${editSelect('rank', game.rank || 'p1', rankOptions)}</td>
      <td>${editCell('shk', game.shk, 'number')}</td>
      <td>${editSelect('role', user.role || 'player', roleOptionsFor(user.role || 'player'), ROLE_LABELS)}</td>
      <td>${formatUserDate(user.createdAt)}</td>
      <td class="admin-row-actions">
        <button class="btn admin-save-row" type="button" data-action="save-user" data-uid="${escapeHtml(user.uid)}">Зберегти</button>
        <button class="btn" type="button" data-action="cancel-edit">Скасувати</button>
      </td>
    </tr>`;
  }

  return `<tr data-uid="${escapeHtml(user.uid)}">
    <td><strong>${escapeHtml(game.nickname || '—')}</strong><small>${escapeHtml(user.email || '')}</small></td>
    <td>${getRegionBadge(game.region)}</td>
    <td><span class="alliance-badge">${escapeHtml(game.alliance || '—')}</span></td>
    <td>${getRankBadge(game.rank)}</td>
    <td>${getShkBadge(game.shk)}</td>
    <td>${getRoleBadge(user.role)}</td>
    <td>${formatUserDate(user.createdAt)}</td>
    <td class="admin-row-actions">
      <button class="btn" type="button" data-action="edit-user" data-uid="${escapeHtml(user.uid)}">Редагувати</button>
    </td>
  </tr>`;
}

function renderUsers() {
  const body = $('#registeredPlayersBody');
  if (!body) return;
  const visible = filteredUsers();
  if (!visible.length) {
    body.innerHTML = '<tr><td colspan="8">Гравців не знайдено.</td></tr>';
    return;
  }
  body.innerHTML = visible.map(userRow).join('');
  body.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', handleUserAction));
}

function requestCard(request) {
  const role = roleLabel(request.requestedRole || 'player');
  return `
    <article class="admin-request" data-uid="${escapeHtml(request.uid)}">
      <div class="admin-request-main">
        <img src="${escapeHtml(request.photoURL || 'img/logo.webp')}" alt="Avatar" />
        <div>
          <strong>${escapeHtml(request.nickname || request.displayName || 'Гравець')}</strong>
          <span>${escapeHtml(request.email || 'email не вказано')}</span>
          <small>Регіон ${escapeHtml(request.region || '—')} • Альянс ${escapeHtml(request.alliance || '—')} • ${escapeHtml(String(request.rank || '').toUpperCase())} • ШК ${escapeHtml(request.shk || '—')}</small>
        </div>
      </div>
      <div class="admin-request-role">
        <span>Запитує роль</span>
        <b>${escapeHtml(role)}</b>
      </div>
      <div class="admin-request-actions">
        <button class="btn admin-approve" type="button" data-action="approve" data-uid="${escapeHtml(request.uid)}">Підтвердити</button>
        <button class="btn admin-decline" type="button" data-action="decline" data-uid="${escapeHtml(request.uid)}">Відхилити</button>
      </div>
    </article>`;
}

function renderRequests() {
  const list = $('#roleRequestsList');
  if (!list) return;
  if (!requests.length) {
    list.innerHTML = '<div class="admin-empty">Заявок поки немає.</div>';
    return;
  }
  list.innerHTML = requests.map(requestCard).join('');
  list.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', handleRequestAction));
}

async function confirmAction(options) {
  if (window.WKD?.confirmDialog) return window.WKD.confirmDialog(options);
  return window.confirm(options.title || 'Підтвердити?');
}

async function handleRequestAction(event) {
  const button = event.currentTarget;
  const approve = button.dataset.action === 'approve';
  const uid = button.dataset.uid;
  if (!uid) return;

  const ok = await confirmAction({
    title: approve ? 'Підтвердити роль?' : 'Відхилити заявку?',
    message: approve ? 'Гравець отримає запитану роль.' : 'Заявка буде відхилена.',
    note: approve ? 'Роль оновиться у профілі, регіоні та публічній статистиці.' : 'Гравець зможе подати нову заявку.',
    icon: approve ? '✓' : '✕',
    acceptText: approve ? 'Підтвердити' : 'Відхилити'
  });
  if (!ok) return;

  try {
    setStatus(approve ? 'Підтверджую роль...' : 'Відхиляю заявку...', 'muted');
    if (approve) await approveRoleRequest(uid);
    else await declineRoleRequest(uid);
    await loadAdminData();
    setStatus(approve ? 'Роль підтверджено.' : 'Заявку відхилено.', approve ? 'success' : 'warn');
  } catch (error) {
    console.error(error);
    setStatus('Не вдалося виконати дію. Перевір Firestore Rules.', 'error');
  }
}

async function handleUserAction(event) {
  const button = event.currentTarget;
  const action = button.dataset.action;
  const uid = button.dataset.uid;

  if (action === 'edit-user') {
    editUid = uid;
    renderUsers();
    return;
  }
  if (action === 'cancel-edit') {
    editUid = null;
    renderUsers();
    return;
  }
  if (action !== 'save-user' || !uid) return;

  const row = button.closest('tr');
  const values = Object.fromEntries([...row.querySelectorAll('[data-edit]')].map(input => [input.dataset.edit, input.value]));
  const ok = await confirmAction({
    title: 'Зберегти зміни гравця?',
    message: 'Дані оновляться у профілі, публічній статистиці та регіоні.',
    note: 'Роль гравця також буде змінена, якщо ти вибрав іншу роль.',
    icon: '✓',
    acceptText: 'Зберегти'
  });
  if (!ok) return;

  try {
    setStatus('Зберігаю гравця...', 'muted');
    await updateUserByAdmin(uid, values);
    editUid = null;
    await loadAdminData();
    setStatus('Гравця оновлено.', 'success');
  } catch (error) {
    console.error(error);
    const message = error?.message === 'role-not-allowed'
      ? 'Цю роль не можна призначити з твоїми правами.'
      : 'Не вдалося зберегти гравця. Перевір правила Firestore.';
    setStatus(message, 'error');
  }
}

async function loadAdminData() {
  if (!currentUser || !canUseAdminPanel(currentUser, currentProfile)) return;
  [users, requests] = await Promise.all([
    listRegisteredUsers(),
    listRoleRequests('pending')
  ]);
  renderStats();
  renderUsers();
  renderRequests();
  setStatus('Дані адмінки оновлено.', 'success');
}

function switchTab(tab) {
  document.querySelectorAll('[data-admin-tab]').forEach(button => button.classList.toggle('is-active', button.dataset.adminTab === tab));
  document.querySelectorAll('[data-admin-panel]').forEach(panel => panel.classList.toggle('is-active', panel.dataset.adminPanel === tab));
}

function bindAdminControls() {
  $('#refreshRequestsBtn')?.addEventListener('click', loadAdminData);
  $('#refreshPlayersBtn')?.addEventListener('click', loadAdminData);
  $('#syncPublicPlayersBtn')?.addEventListener('click', async () => {
    try {
      setStatus('Синхронізую публічну статистику...', 'muted');
      const count = await syncPublicPlayersFromUsers();
      await loadAdminData();
      setStatus(`Публічну статистику оновлено: ${count} гравців.`, 'success');
    } catch (error) {
      console.error(error);
      setStatus('Не вдалося синхронізувати статистику. Перевір Firestore Rules.', 'error');
    }
  });
  $('#backToProfileBtn')?.addEventListener('click', () => { window.location.href = 'profile.html'; });
  $('#adminNickSearch')?.addEventListener('input', renderUsers);
  $('#adminAllianceSearch')?.addEventListener('input', renderUsers);
  $('#adminRegionSearch')?.addEventListener('input', renderUsers);
  $('#adminRoleFilter')?.addEventListener('change', renderUsers);
  $('#adminRowsFilter')?.addEventListener('change', renderUsers);
  document.querySelectorAll('[data-admin-tab]').forEach(button => button.addEventListener('click', () => switchTab(button.dataset.adminTab)));
  document.querySelectorAll('#registeredPlayersTable [data-sort]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.sort;
    sortState = { key, dir: sortState.key === key && sortState.dir === 'asc' ? 'desc' : 'asc' };
    renderUsers();
  }));
}

async function initAdminPage() {
  if (adminReady || !$('#registeredPlayersBody')) return;
  adminReady = true;
  bindAdminControls();

  await watchAuth(async user => {
    currentUser = user;
    if (!user) {
      setStatus('Потрібно увійти через Google.', 'warn');
      setTimeout(() => { window.location.href = 'login.html'; }, 700);
      return;
    }

    currentProfile = await ensureCurrentUserPublished(user).catch(() => getUserProfile(user.uid)).catch(() => null);
    if (!canUseAdminPanel(user, currentProfile)) {
      setSummary('Немає доступу');
      setStatus('Ця сторінка доступна тільки адміну або модератору.', 'error');
      $('#registeredPlayersBody').innerHTML = '<tr><td colspan="8">У тебе немає прав для перегляду гравців.</td></tr>';
      $('#roleRequestsList').innerHTML = '<div class="admin-empty">У тебе немає прав для перегляду заявок.</div>';
      return;
    }

    setStatus('Адмін-доступ підтверджено. Завантажую дані...', 'success');
    await loadAdminData();
  });
}

document.addEventListener('wkd:partials-ready', initAdminPage);
document.addEventListener('DOMContentLoaded', () => setTimeout(initAdminPage, 0));
