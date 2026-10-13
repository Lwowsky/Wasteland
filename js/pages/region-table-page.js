import { watchAuth } from '../services/firebase-service.js';
import { getUserProfile, saveSignedInUser } from '../services/user-db.js';
import {
  listRegionRegistrations,
  canManageRegion,
  canViewAnyRegion,
  readRegionFromUrl,
  normalizeRegion,
  shiftLabel,
  troopLabel,
  formatUserDate,
  formatUtcAndLocal,
  listRegionAlliances
} from '../services/region-db.js';

const $ = selector => document.querySelector(selector);
const t = (key, fallback = '') => window.WKD_t ? window.WKD_t(key) : (fallback || key);
const tv = (key, fallback = '', vars = {}) => {
  let text = t(key, fallback);
  Object.entries(vars).forEach(([name, value]) => { text = text.replaceAll(`{${name}}`, String(value)); });
  return text;
};
const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
let currentUser = null;
let currentProfile = null;
let currentRegion = '';
let rows = [];
let allianceColorMap = new Map();
let currentSettings = null;
let canSwitchRegion = false;
let timerId = null;
let ready = false;


function normTag(value) { return String(value || '').trim().toUpperCase(); }
function hashHue(value) { let hash = 2166136261; for (const ch of String(value || 'empty')) { hash ^= ch.codePointAt(0) || 0; hash = Math.imul(hash, 16777619) >>> 0; } return ((hash % 360) + 360) % 360; }
function allianceHue(tag) {
  const safe = normTag(tag);
  const custom = allianceColorMap.get(safe);
  return Number.isFinite(custom) ? custom : hashHue(`${currentRegion}:${safe}`);
}
function allianceBadge(tag) {
  const safe = normTag(tag) || '—';
  return `<span class="alliance-badge" style="--ally-hue:${allianceHue(safe)}"><span class="badge-dot"></span><span>${esc(safe)}</span></span>`;
}

function rowTypeLabel(value = '') {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  if (['profile', 'профіль', 'профиль'].includes(text)) return t('common.profile', 'Profile');
  if (['request', 'заявка'].includes(text)) return t('region.request', 'Request');
  return value;
}
function yesNoValue(value) {
  return value === true ? t('common.yes', 'Yes') : String(value);
}
async function loadAllianceColors() {
  allianceColorMap = new Map();
  if (!currentRegion) return;
  const alliances = await listRegionAlliances(currentRegion).catch(() => []);
  alliances.forEach(item => {
    const tag = normTag(item.tag || item.id);
    const hue = Number(item.colorHue);
    if (tag && Number.isFinite(hue)) allianceColorMap.set(tag, ((Math.round(hue) % 360) + 360) % 360);
  });
}

function regionPillText() {
  return currentRegion ? `R${currentRegion}` : 'R—';
}

function setStatus(text, type = 'muted') {
  const box = $('#regionTableStatus');
  if (!box) return;
  box.removeAttribute('data-i18n');
  box.textContent = text;
  box.dataset.type = type;
}

function buildRegionFormLink(region) {
  const url = new URL('region-form.html', window.location.href);
  url.searchParams.set('r', normalizeRegion(region));
  return url.toString();
}

function setManagerSwitch() {
  const switchBox = $('#regionManagerSwitch');
  const input = $('#regionLookupInput');
  if (!switchBox) return;
  switchBox.hidden = !canSwitchRegion;
  if (input) input.value = currentRegion || readRegionFromUrl() || '';
}

function startCycleTimer() {
  const box = $('#regionTableCycleBox');
  if (!box || !currentSettings) return;
  const update = () => {
    box.hidden = false;
    $('#regionTableCycleText') && ($('#regionTableCycleText').textContent = currentSettings.open ? t('region.formOpen', 'Form open') : t('region.formClosed', 'Form closed'));
    $('#regionTableCloseText') && ($('#regionTableCloseText').textContent = tv('region.closeAtLabel', 'Closes: {value}', { value: formatUtcAndLocal(currentSettings.closeAtMs) }));
    $('#regionTableStartText') && ($('#regionTableStartText').textContent = tv('region.startAtLabel', 'Start: {value}', { value: formatUtcAndLocal(currentSettings.eventStartAtMs) }));
  };
  clearInterval(timerId);
  update();
  timerId = setInterval(update, 30000);
}

function openRegion(region) {
  const safeRegion = normalizeRegion(region);
  if (!safeRegion) {
    setStatus(t('region.openRegionPrompt', 'Enter the region number you want to open.'), 'warn');
    return;
  }
  const url = new URL('region-table.html', window.location.href);
  url.searchParams.set('region', safeRegion);
  window.location.href = url.toString();
}

async function copyRegionFormLink() {
  const region = normalizeRegion($('#regionLookupInput')?.value || currentRegion);
  if (!region) {
    setStatus(t('region.enterRegionFirst', 'Enter the region number first.'), 'warn');
    return;
  }
  const link = buildRegionFormLink(region);
  try {
    await navigator.clipboard.writeText(link);
    setStatus(tv('region.formLinkCopied', 'Region {region} form link copied.', { region }), 'success');
  } catch {
    window.prompt(t('common.copyLinkPrompt', 'Copy link:'), link);
  }
}

function renderTroopFilter(settings = {}) {
  const select = $('#regionTroopFilter');
  if (!select) return;
  const oldValue = select.value || 'all';
  const options = [
    ['all', t('common.all', 'Усі')],
    ['fighter', t('troop.fighter', 'Бійці')],
    ['rider', t('troop.rider', 'Наїзники')],
    ['shooter', t('troop.shooter', 'Стрільці')],
    ...(Array.isArray(settings.customTroopTypes) ? settings.customTroopTypes.map(item => [item.id, item.label]) : [])
  ];
  select.innerHTML = options.map(([value, label]) => `<option value="${esc(value)}">${esc(label)}</option>`).join('');
  select.value = options.some(([value]) => value === oldValue) ? oldValue : 'all';
}

function rowExtraSquads(row = {}) {
  if (Array.isArray(row.extraSquads) && row.extraSquads.length) return row.extraSquads;
  if (row.extraEnabled && row.extraTroopType && row.extraTier) {
    return [{ troopType: row.extraTroopType, troopLabel: row.extraTroopLabel || troopLabel(row.extraTroopType, currentSettings), tier: row.extraTier }];
  }
  return [];
}

function extraSquadsText(row = {}) {
  return rowExtraSquads(row)
    .map(item => `${troopLabel(item.troopType, currentSettings)}${item.tier ? ` · ${item.tier}` : ''}`)
    .join(' / ');
}

function troopClass(type = '') {
  const troopType = String(type || '').trim().toLowerCase();
  return ['fighter', 'rider', 'shooter'].includes(troopType) ? troopType : '';
}

function filteredRows() {
  const nick = String($('#regionNickSearch')?.value || '').trim().toLowerCase();
  const alliance = String($('#regionAllianceSearch')?.value || '').trim().toLowerCase();
  const troop = $('#regionTroopFilter')?.value || 'all';
  const shift = $('#regionShiftFilter')?.value || 'all';
  return rows.filter(row => {
    if (nick && !String(row.nickname || '').toLowerCase().includes(nick)) return false;
    if (alliance && !String(row.alliance || '').toLowerCase().includes(alliance)) return false;
    if (troop !== 'all' && row.troopType !== troop && !rowExtraSquads(row).some(item => item.troopType === troop)) return false;
    if (shift !== 'all' && row.shift !== shift) return false;
    return true;
  });
}

function readyBadges(row) {
  if (row.source === 'profile' && !row.shift) return `<span class="region-ready">${t('common.profile', 'Профіль')}</span>`;
  return `<div class="region-ready-badges">
    <span class="region-ready ${row.readyToAttack ? 'is-on' : ''}">${t('players.attack', 'Атака')}</span>
    <span class="region-ready ${row.captainReady ? 'is-on' : ''}">${t('players.captain', 'Капітан')}</span>
  </div>`;
}

function rowHtml(row) {
  const date = row.updatedAt || row.createdAt || row.submittedAt;
  const regionMeta = row.region ? `R${esc(row.region)}` : '';
  const rankMeta = row.rank ? String(row.rank).toUpperCase() : '';
  const shkMeta = row.shk ? `${t('account.shk', 'HQ')} ${esc(row.shk)}` : '';
  const profileMeta = [regionMeta, rankMeta, shkMeta].filter(Boolean).join(' · ');
  const customMeta = row.customFields ? Object.values(row.customFields).filter(value => value !== false && value !== '').map(yesNoValue).join(' · ') : '';
  const extraMeta = extraSquadsText(row);
  return `<tr>
    <td><strong>${esc(row.nickname || '—')}</strong><small>${esc([rowTypeLabel(row.rowType || row.roleLabel || ''), profileMeta].filter(Boolean).join(' · '))}</small></td>
    <td>${allianceBadge(row.alliance)}</td>
    <td><span class="tag ${troopClass(row.troopType)}">${esc(troopLabel(row.troopType, currentSettings) || row.troopLabel)}</span>${extraMeta ? `<small>${t('region.form.extraShort', 'Додатковий')}: ${esc(extraMeta)}</small>` : ''}</td>
    <td><span class="rank-badge">${esc(row.tier || row.rank?.toUpperCase?.() || '—')}</span>${extraMeta ? `<small>${esc(extraMeta)}</small>` : ''}</td>
    <td>${row.marchSize ? Number(row.marchSize).toLocaleString('uk-UA') : '—'}</td>
    <td>${row.rallySize ? Number(row.rallySize).toLocaleString('uk-UA') : '—'}</td>
    <td><span class="role-badge ${row.captainReady ? 'role-consul' : 'role-player'}">${row.captainReady ? t('common.yes', 'Так') : t('common.no', 'Ні')}</span></td>
    <td><span class="role-badge role-officer">${esc(shiftLabel(row.shift, currentSettings) || row.shiftLabel)}</span></td>
    <td>${readyBadges(row)}</td>
    <td>${esc(row.comment || customMeta || '—')}<small>${esc([customMeta && row.comment ? customMeta : '', formatUserDate(date)].filter(Boolean).join(' · '))}</small></td>
  </tr>`;
}

function render() {
  const body = $('#regionRegistrationsBody');
  if (!body) return;
  const visible = filteredRows();
  body.innerHTML = visible.length ? visible.map(rowHtml).join('') : `<tr><td colspan="10">${t('region.table.emptyCycle', 'У цьому активному наборі ще немає гравців або заявок.')}</td></tr>`;
  setStatus(tv('region.tableShownStatus', '{regionLabel} {region}: shown {visible} of {total} records.', { regionLabel: t('account.region', 'Region'), region: currentRegion, visible: visible.length, total: rows.length }), currentSettings?.open ? 'success' : 'warn');
}

async function load(user) {
  currentUser = user;
  if (!user) {
    setStatus(t('region.tableAccessDenied', 'Only registered players of their own region can view the region table.'), 'warn');
    setTimeout(() => { window.location.href = 'login.html'; }, 900);
    return;
  }
  await saveSignedInUser(user).catch(() => null);
  const profile = await getUserProfile(user.uid).catch(() => null);
  currentProfile = profile;
  const requestedRegion = readRegionFromUrl();
  if (requestedRegion && !canViewAnyRegion(profile, user)) {
    setStatus(t('region.otherRegionDenied', 'Only an admin or moderator can choose another region. Opening your region table.'), 'warn');
  }
  const result = await listRegionRegistrations(user, canViewAnyRegion(profile, user) ? requestedRegion : '');
  currentProfile = result.profile;
  currentRegion = result.region;
  rows = result.rows;
  currentSettings = result.settings;
  await loadAllianceColors();
  renderTroopFilter(currentSettings);
  canSwitchRegion = canViewAnyRegion(currentProfile, currentUser);
  $('#regionTablePill').textContent = regionPillText();
  $('#openRegionSettingsBtn').hidden = !canManageRegion(currentProfile, currentRegion, currentUser);
  setManagerSwitch();
  startCycleTimer();
  render();
}


function handleLanguageChange() {
  $('#regionTablePill') && ($('#regionTablePill').textContent = regionPillText());
  if (currentSettings) renderTroopFilter(currentSettings);
  startCycleTimer();
  render();
}

function bind() {
  ['#regionNickSearch', '#regionAllianceSearch', '#regionTroopFilter', '#regionShiftFilter'].forEach(selector => {
    $(selector)?.addEventListener('input', render);
    $(selector)?.addEventListener('change', render);
  });
  $('#refreshRegionTableBtn')?.addEventListener('click', () => load(currentUser).catch(error => {
    console.error(error);
    setStatus(t('region.tableRefreshFailed', 'Could not refresh the region table.'), 'error');
  }));
  $('#openRegionLookupBtn')?.addEventListener('click', () => openRegion($('#regionLookupInput')?.value || ''));
  $('#regionLookupInput')?.addEventListener('keydown', event => {
    if (event.key === 'Enter') openRegion(event.currentTarget.value);
  });
  $('#copyRegionFormLinkBtn')?.addEventListener('click', copyRegionFormLink);
  $('#openWastelandRegisterBtn')?.addEventListener('click', () => { window.location.href = `region-form.html?region=${currentRegion}`; });
  $('#openRegionSettingsBtn')?.addEventListener('click', () => { window.location.href = `region-settings.html?region=${currentRegion}`; });
  document.addEventListener('wkd:language-changed', handleLanguageChange);
}

async function init() {
  if (ready) return;
  ready = true;
  bind();
  await watchAuth(user => load(user).catch(error => {
    console.error(error);
    setStatus(t('region.tableOpenFailed', 'Could not open the region table. Check profile or region.'), 'error');
  }));
}

document.addEventListener('wkd:partials-ready', init);
document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
