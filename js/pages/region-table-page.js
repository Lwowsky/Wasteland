import { watchAuth } from '../services/firebase-service.js';
import { saveSignedInUser } from '../services/user-db.js';
import { canManageRegion, formatUserDate, listRegionRegistrations, readRegionFromUrl, troopLabel, shiftLabel } from '../services/region-db.js';

const $ = selector => document.querySelector(selector);
let rows = [];
let currentProfile = null;
let currentRegion = '';
let ready = false;

function setStatus(text, type = 'muted') {
  const box = $('#regionTableStatus');
  if (!box) return;
  box.textContent = text;
  box.dataset.type = type;
}

function filteredRows() {
  const nick = String($('#regionNickSearch')?.value || '').trim().toLowerCase();
  const alliance = String($('#regionAllianceSearch')?.value || '').trim().toLowerCase();
  const troop = $('#regionTroopFilter')?.value || 'all';
  const shift = $('#regionShiftFilter')?.value || 'all';
  return rows.filter(row => {
    if (nick && !String(row.nickname || '').toLowerCase().includes(nick)) return false;
    if (alliance && !String(row.alliance || '').toLowerCase().includes(alliance)) return false;
    if (troop !== 'all' && row.troopType !== troop) return false;
    if (shift !== 'all' && row.shift !== shift) return false;
    return true;
  });
}

function readyBadges(row) {
  if (row.source === 'profile' && !row.shift) return '<span class="region-ready">Профіль</span>';
  return `<div class="region-ready-badges">
    <span class="region-ready ${row.readyToJoin ? 'is-on' : ''}">Участь</span>
    <span class="region-ready ${row.readyToAttack ? 'is-on' : ''}">Атака</span>
    <span class="region-ready ${row.captainReady ? 'is-on' : ''}">Капітан</span>
  </div>`;
}

function rowHtml(row) {
  const date = row.updatedAt || row.createdAt || row.submittedAt;
  return `<tr>
    <td><strong>${row.nickname || '—'}</strong><small>${row.rowType || row.roleLabel || ''}</small></td>
    <td><span class="alliance-badge">${row.alliance || '—'}</span></td>
    <td>${row.troopLabel || troopLabel(row.troopType)}</td>
    <td><span class="rank-badge">${row.tier || '—'}</span></td>
    <td>${row.marchSize ? Number(row.marchSize).toLocaleString('uk-UA') : '—'}</td>
    <td>${row.rallySize ? Number(row.rallySize).toLocaleString('uk-UA') : '—'}</td>
    <td><span class="role-badge ${row.captainReady ? 'role-consul' : 'role-player'}">${row.captainReady ? 'Так' : 'Ні'}</span></td>
    <td><span class="role-badge role-officer">${row.shiftLabel || shiftLabel(row.shift)}</span></td>
    <td>${readyBadges(row)}</td>
    <td>${row.comment || '—'}<small>${formatUserDate(date)}</small></td>
  </tr>`;
}

function render() {
  const body = $('#regionRegistrationsBody');
  if (!body) return;
  const visible = filteredRows();
  body.innerHTML = visible.length ? visible.map(rowHtml).join('') : '<tr><td colspan="10">У цьому регіоні ще немає гравців або заявок.</td></tr>';
  setStatus(`Регіон ${currentRegion}: показано ${visible.length} із ${rows.length} записів.`, 'success');
}

async function load(user) {
  if (!user) {
    setStatus('Таблицю регіону можуть бачити тільки зареєстровані гравці свого регіону.', 'warn');
    setTimeout(() => { window.location.href = 'login.html'; }, 900);
    return;
  }
  await saveSignedInUser(user).catch(() => null);
  const result = await listRegionRegistrations(user, readRegionFromUrl());
  currentProfile = result.profile;
  currentRegion = result.region;
  rows = result.rows;
  $('#regionTablePill').textContent = `Регіон ${currentRegion}`;
  $('#openRegionSettingsBtn').hidden = !canManageRegion(currentProfile, currentRegion);
  render();
}

function bind() {
  ['#regionNickSearch', '#regionAllianceSearch', '#regionTroopFilter', '#regionShiftFilter'].forEach(selector => {
    $(selector)?.addEventListener('input', render);
    $(selector)?.addEventListener('change', render);
  });
  $('#refreshRegionTableBtn')?.addEventListener('click', () => location.reload());
  $('#openWastelandRegisterBtn')?.addEventListener('click', () => { window.location.href = `region-form.html?region=${currentRegion}`; });
  $('#openRegionSettingsBtn')?.addEventListener('click', () => { window.location.href = `region-settings.html?region=${currentRegion}`; });
}

async function init() {
  if (ready) return;
  ready = true;
  bind();
  await watchAuth(user => load(user).catch(error => {
    console.error(error);
    setStatus('Не вдалося відкрити таблицю регіону. Перевір профіль, регіон або Firestore Rules.', 'error');
  }));
}

document.addEventListener('wkd:partials-ready', init);
document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
