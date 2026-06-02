import { watchAuth } from '../services/firebase-service.js';
import { saveSignedInUser, getFarmById, getGameProfile, getUserFarms, getUserProfile } from '../services/user-db.js';
import {
  getMyRegionContext,
  getRegionSettings,
  getMyWastelandRegistration,
  saveWastelandRegistration,
  readRegionFromUrl,
  resolveRegionShareLink,
  shiftLabel,
  getRegionFormStatus,
  formatCountdown,
  formatRegionDate,
  formatUtcAndLocal,
  canManageRegion,
  canViewAnyRegion,
  getAllowedTiers,
  troopLabel
} from '../services/region-db.js';

const $ = selector => document.querySelector(selector);
const t = (key, fallback = '') => window.WKD_t ? window.WKD_t(key) : (fallback || key);
const tv = (key, fallback = '', vars = {}) => {
  let text = t(key, fallback);
  Object.entries(vars).forEach(([name, value]) => { text = text.replaceAll(`{${name}}`, String(value)); });
  return text;
};
function translatedDefaultText(value, key, fallback) {
  const raw = String(value || '').trim();
  const defaults = Object.values(window.WKD_TRANSLATIONS || {}).map(dict => dict?.[key]).filter(Boolean);
  if (!raw || raw === fallback || defaults.includes(raw)) return t(key, fallback);
  return raw;
}
function settingsTitle(settings = {}) { return translatedDefaultText(settings.title, 'region.formTitle', 'Wasteland registration'); }
function settingsDescription(settings = {}) { return translatedDefaultText(settings.description, 'region.formDefaultDescription', 'Fill out the request for your region. A consul or officer will see it in the region table.'); }
const tiers = Array.from({ length: 14 }, (_, i) => `T${14 - i}`);
const readFarmFromUrl = () => new URLSearchParams(window.location.search).get('farm') || '';
const readShortLinkFromUrl = () => new URLSearchParams(window.location.search).get('s') || '';
let currentUser = null;
let currentProfile = null;
let currentRegion = '';
let regionFromLink = '';
let shortCodeFromLink = '';
let farmFromLink = '';
let formSettings = null;
let selectedFarmId = 'main';
let countdownId = null;
let ready = false;

function setStatus(text, type = 'muted') {
  const box = $('#regionStatus');
  if (!box) return;
  box.removeAttribute('data-i18n');
  box.textContent = text;
  box.dataset.type = type;
}

function fillTierSelect(select, selected = 'T10', settings = formSettings) {
  if (!select) return;
  const allowed = getAllowedTiers(settings || {});
  const value = allowed.includes(selected) ? selected : allowed[0] || 'T10';
  select.innerHTML = allowed.map(tier => `<option value="${tier}" ${tier === value ? 'selected' : ''}>${tier}</option>`).join('');
}

function fillExtraTierSelects(selectedByType = {}, settings = formSettings) {
  document.querySelectorAll('[data-extra-tier]').forEach(select => {
    const troopType = select.dataset.extraTier || '';
    fillTierSelect(select, selectedByType[troopType] || settings?.minTier || 'T10', settings);
  });
}

function normalizeExtraSquads(row = {}) {
  if (Array.isArray(row.extraSquads)) {
    return row.extraSquads
      .map(item => ({ troopType: String(item?.troopType || '').trim(), tier: String(item?.tier || '').trim().toUpperCase() }))
      .filter(item => item.troopType && item.tier);
  }
  if (row.extraEnabled && row.extraTroopType && row.extraTier) {
    return [{ troopType: String(row.extraTroopType).trim(), tier: String(row.extraTier).trim().toUpperCase() }];
  }
  return [];
}

function renderTroopOptions(settings = formSettings) {
  const options = [
    ['fighter', t('troop.fighter', 'Бійці')],
    ['rider', t('troop.rider', 'Наїзники')],
    ['shooter', t('troop.shooter', 'Стрільці')],
    ...(Array.isArray(settings?.customTroopTypes) ? settings.customTroopTypes.map(item => [item.id, item.label]) : [])
  ];
  const select = $('#wrTroopType');
  if (!select) return;
  const oldValue = select.value;
  select.innerHTML = `<option value="">${t('region.form.chooseTroopType', 'Вибери тип')}</option>` + options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
  if (options.some(([value]) => value === oldValue)) select.value = oldValue;
}

function renderCustomFields(settings = formSettings, saved = {}) {
  const wrap = $('#regionCustomFieldsWrap');
  const box = $('#regionCustomFields');
  if (!wrap || !box) return;
  const fields = Array.isArray(settings?.customFields) ? settings.customFields : [];
  wrap.hidden = !fields.length;
  box.innerHTML = fields.map(field => {
    const value = saved[field.id];
    if (field.type === 'checkbox') {
      return `<label class="region-check"><input type="checkbox" data-custom-field="${field.id}" ${value ? 'checked' : ''} /> ${field.label}</label>`;
    }
    return `<label class="region-field"><span>${field.label}</span><input data-custom-field="${field.id}" value="${String(value || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]))}" /></label>`;
  }).join('');
}

function renderShiftOptions(settings) {
  const box = $('#wrShiftOptions');
  if (!box) return;
  const shifts = settings?.shifts?.length ? settings.shifts : ['shift1', 'shift2'];
  box.innerHTML = shifts.map((shift, index) => `
    <label class="region-check">
      <input type="radio" name="wrShift" value="${shift}" ${index === 0 ? 'checked' : ''} required /> ${shiftLabel(shift, settings)}
    </label>`).join('');
}

function setFormState(settings) {
  const state = $('#regionFormState');
  if (!state) return;
  const status = getRegionFormStatus(settings);
  state.textContent = status.open ? t('region.formOpen', 'Form open') : t('region.formClosed', 'Form closed');
  state.classList.toggle('region-pill--open', status.open);
  state.classList.toggle('region-pill--closed', !status.open);
}

function renderEventInfo(settings = {}) {
  const box = $('#regionEventInfo');
  if (!box) return;
  const hostAlliance = String(settings.hostAlliance || '').trim();
  const governor = String(settings.governor || '').trim();
  box.hidden = !hostAlliance && !governor;
  $('#regionHostAllianceText') && ($('#regionHostAllianceText').textContent = tv('region.hostAllianceLabel', 'Host alliance: {value}', { value: hostAlliance || '—' }));
  $('#regionGovernorText') && ($('#regionGovernorText').textContent = tv('region.governorLabel', 'Governor: {value}', { value: governor || '—' }));
}

function startCountdown(settings) {
  const box = $('#regionCountdownBox');
  if (!box) return;
  const update = () => {
    const status = getRegionFormStatus(settings);
    box.hidden = false;
    $('#regionCloseText') && ($('#regionCloseText').textContent = tv('region.closeAtLabel', 'Closes: {value}', { value: formatUtcAndLocal(status.closeAtMs) }));
    $('#regionEventText') && ($('#regionEventText').textContent = tv('region.wastelandStartLabel', 'Wasteland start: {value} · until start {countdown}', { value: formatUtcAndLocal(status.eventStartAtMs), countdown: formatCountdown(status.eventStartAtMs - Date.now()) }));
    $('#regionCountdownText') && ($('#regionCountdownText').textContent = status.open
      ? tv('region.remainingLabel', 'Remaining: {value}', { value: formatCountdown(status.closeAtMs - Date.now()) })
      : (status.reason === 'notOpenYet' ? tv('regionSettings.openAtLabel', 'Opens: {value}', { value: formatUtcAndLocal(status.openAtMs) }) : t('region.registrationClosed', 'Requests are closed. A consul or officer will open the next set.')));
    setFormState(status);
  };
  clearInterval(countdownId);
  update();
  countdownId = setInterval(update, 30000);
}

function publicLockKey() {
  const cycle = formSettings?.currentCycleId || 'default';
  return `wkd.publicRegistration.${currentRegion}.${cycle}`;
}

function lockForm(message) {
  const form = $('#wastelandForm');
  if (!form) return;
  [...form.elements].forEach(element => {
    if (element.id !== 'openRegionTableBtn') element.disabled = true;
  });
  setStatus(message, 'success');
}

function getSavedFarms(profile = {}) {
  const main = { ...getGameProfile(profile), farmId: 'main', id: 'main' };
  return [main, ...getUserFarms(profile)].filter(farm => farm.nickname || farm.alliance || farm.region);
}

function regionPillText() {
  return currentRegion ? `R${currentRegion}` : 'R—';
}

function farmLabel(farm = {}, index = 0) {
  const name = farm.nickname || (farm.farmId === 'main' ? t('account.mainPlayer', 'Main player') : tv('account.farmNumber', 'Farm {number}', { number: index + 1 }));
  const region = farm.region ? ` · R${farm.region}` : '';
  return `${name}${region}`;
}

function renderSavedFarmTools(profile = {}) {
  const panel = $('#regionProfileTools');
  const select = $('#wrSavedFarmSelect');
  if (!panel || !select) return;
  const farms = getSavedFarms(profile);
  panel.hidden = !currentUser || !farms.length;
  if (!farms.length) return;
  select.innerHTML = farms.map((farm, index) => `
    <option value="${farm.farmId || farm.id || 'main'}" ${(farm.farmId || farm.id) === selectedFarmId ? 'selected' : ''}>${farmLabel(farm, index)}</option>
  `).join('');
  if (!getFarmById(profile, selectedFarmId)) selectedFarmId = farms[0].farmId || 'main';
  select.value = selectedFarmId;
}

function fillProfileFields(profile, farmId = selectedFarmId) {
  const game = getFarmById(profile || {}, farmId) || getGameProfile(profile || {});
  selectedFarmId = game.farmId || farmId || 'main';
  const saved = game.wastelandProfile || {};
  fillSavedRegistration({
    ...saved,
    nickname: game.nickname || saved.nickname || '',
    alliance: game.alliance || saved.alliance || '',
    rank: game.rank || saved.rank || 'p1',
    shk: game.shk || saved.shk || ''
  }, { copyEventFields: false });
}

function fillSavedRegistration(row, options = {}) {
  if (!row) return;
  const copyEventFields = options.copyEventFields !== false;
  $('#wrNickname').value = row.nickname || $('#wrNickname').value;
  $('#wrAlliance').value = row.alliance || $('#wrAlliance').value;
  renderTroopOptions(formSettings);
  fillTierSelect($('#wrTier'), row.tier || 'T10', formSettings);
  $('#wrTroopType').value = row.troopType || '';
  $('#wrLairLevel') && ($('#wrLairLevel').value = row.lairLevel || row.lair || '');
  $('#wrMarch').value = row.marchSize || '';
  $('#wrRally').value = row.rallySize || '';
  $('#wrReadyAttack') && ($('#wrReadyAttack').checked = copyEventFields ? Boolean(row.readyToAttack) : false);
  $('#wrCaptain') && ($('#wrCaptain').checked = copyEventFields ? Boolean(row.captainReady) : false);
  const shift = copyEventFields ? $(`input[name="wrShift"][value="${row.shift}"]`) : null;
  if (shift) shift.checked = true;
  $('#wrComment').value = copyEventFields ? (row.comment || '') : '';
  const extraSquads = copyEventFields ? normalizeExtraSquads(row) : [];
  const extraByType = Object.fromEntries(extraSquads.map(item => [item.troopType, item.tier]));
  $('#wrExtraEnabled').checked = Boolean(extraSquads.length);
  fillExtraTierSelects(extraByType, formSettings);
  document.querySelectorAll('[data-extra-troop]').forEach(input => {
    input.checked = Boolean(extraByType[input.dataset.extraTroop]);
  });
  renderCustomFields(formSettings, copyEventFields ? (row.customFields || {}) : {});
  toggleExtraFields();
}

function toggleExtraFields() {
  const enabled = Boolean($('#wrExtraEnabled')?.checked);
  const fields = $('#extraTroopFields');
  if (!fields) return;
  fields.hidden = false;
  fields.classList.toggle('is-disabled', !enabled);
  fields.querySelectorAll('[data-extra-troop]').forEach(input => { input.disabled = !enabled; });
  fields.querySelectorAll('.region-extra-card').forEach(card => {
    const troop = card.dataset.extraCard || '';
    const input = card.querySelector(`[data-extra-troop="${troop}"]`);
    const active = enabled && Boolean(input?.checked);
    card.classList.toggle('is-disabled', !enabled);
    card.classList.toggle('is-extra-selected', active);
    card.querySelectorAll('[data-extra-tier]').forEach(select => { select.disabled = !active; });
  });
}

function readExtraSquads() {
  if (!$('#wrExtraEnabled')?.checked) return [];
  return [...document.querySelectorAll('[data-extra-troop]:checked')]
    .map(input => {
      const troopType = input.dataset.extraTroop || '';
      const tier = document.querySelector(`[data-extra-tier="${troopType}"]`)?.value || '';
      return { troopType, tier };
    })
    .filter(item => item.troopType);
}

function readForm() {
  const extraSquads = readExtraSquads();
  const firstExtra = extraSquads[0] || {};
  return {
    farmId: selectedFarmId || 'main',
    nickname: $('#wrNickname')?.value,
    alliance: $('#wrAlliance')?.value,
    troopType: $('#wrTroopType')?.value,
    tier: $('#wrTier')?.value,
    lairLevel: $('#wrLairLevel')?.value,
    marchSize: $('#wrMarch')?.value,
    rallySize: $('#wrRally')?.value,
    readyToJoin: true,
    readyToAttack: $('#wrReadyAttack')?.checked,
    captainReady: $('#wrCaptain')?.checked,
    shift: $('input[name="wrShift"]:checked')?.value,
    comment: $('#wrComment')?.value,
    extraEnabled: Boolean(extraSquads.length),
    extraSquads,
    extraTroopType: firstExtra.troopType || '',
    extraTier: firstExtra.tier || '',
    customFields: Object.fromEntries([...document.querySelectorAll('[data-custom-field]')].map(input => [input.dataset.customField, input.type === 'checkbox' ? input.checked : input.value]))
  };
}

function validate(values) {
  const errors = [];
  if (!values.nickname?.trim()) errors.push(t('region.errorNickname', 'Enter nickname.'));
  if (!values.alliance?.trim()) errors.push(t('region.errorAlliance', 'Enter alliance.'));
  if (!values.troopType) errors.push(t('region.errorMainTroop', 'Choose the main troop type.'));
  if (!values.shift) errors.push(t('region.errorShift', 'Choose a shift.'));
  if (values.tier && !getAllowedTiers(formSettings || {}).includes(values.tier)) errors.push(tv('region.errorMinTier', 'Minimum tier in this region: {tier}.', { tier: formSettings?.minTier || 'T10' }));
  const troops = ['fighter', 'rider', 'shooter', ...(formSettings?.customTroopTypes || []).map(item => item.id)];
  if (values.troopType && !troops.includes(values.troopType)) errors.push(t('region.errorAllowedTroop', 'Choose a troop type from the region allowed list.'));
  if ($('#wrExtraEnabled')?.checked && !values.extraSquads.length) errors.push(t('region.errorExtraTroopRequired', 'Select at least one troop type for the additional squad.'));
  values.extraSquads.forEach(item => {
    if (!troops.includes(item.troopType)) errors.push(t('region.errorExtraTroopAllowed', 'Additional troop type must be from the region list.'));
    if (!item.tier) errors.push(t('region.errorExtraTier', 'Choose a tier for the additional squad.'));
    if (item.tier && !getAllowedTiers(formSettings || {}).includes(item.tier)) errors.push(tv('region.errorExtraMinTier', 'Additional tier must be at least: {tier}.', { tier: formSettings?.minTier || 'T10' }));
  });
  return errors;
}

async function handleSubmit(event) {
  event.preventDefault();
  const status = getRegionFormStatus(formSettings);
  if (!status.open) {
    setStatus(status.reason === 'notOpenYet' ? t('region.formNotOpenYet', 'Registration is not open yet. Wait for automatic opening or ask the consul to change the time.') : t('region.registrationClosedByTimer', 'Registration is already closed by timer.'), 'error');
    return;
  }
  if (!currentUser && localStorage.getItem(publicLockKey())) {
    lockForm(t('region.alreadySubmittedBrowserTable', 'A request has already been sent from this browser. Only a consul or officer can change it in the region table.'));
    return;
  }
  const values = readForm();
  const errors = validate(values);
  if (errors.length) {
    setStatus(errors.join(' '), 'error');
    return;
  }
  try {
    setStatus(t('region.savingRequest', 'Saving request...'), 'muted');
    await saveWastelandRegistration(currentUser, values, currentRegion);
    localStorage.setItem('wkd.players.sourceMode', 'region');
    if (!currentUser) {
      localStorage.setItem(publicLockKey(), String(Date.now()));
      lockForm(t('region.requestSavedGuestLocked', 'Request saved. Now only a consul or region officer can change it.'));
      return;
    }
    setStatus(t('region.requestSavedCurrentCycle', 'Request saved. This player is already submitted for the current set; choose another farm from the list if needed.'), 'success');
  } catch (error) {
    console.error(error);
    if (error?.message === 'registration-already-submitted') {
      lockForm(t('region.requestAlreadySavedLocked', 'Your request is already saved. Only a consul or officer can change it.'));
      return;
    }
    if (error?.message === 'region-form-closed') {
      setStatus(t('region.registrationClosedByTimer', 'Registration is already closed by timer.'), 'error');
      return;
    }
    setStatus(t('region.requestSaveFailed', 'Could not save the request. Check access rights or try again.'), 'error');
  }
}

async function prepareForm(settings) {
  formSettings = settings;
  $('#regionNumberPill').textContent = regionPillText();
  $('#regionFormTitleText').textContent = settingsTitle(settings);
  $('#regionFormDescText').textContent = settingsDescription(settings);
  setFormState(settings);
  renderEventInfo(settings);
  startCountdown(settings);

  const status = getRegionFormStatus(settings);
  if (!status.open) {
    $('#wastelandForm').hidden = true;
    setStatus(status.reason === 'disabled'
      ? t('region.formDisabledNow', 'The form for this region is currently disabled.')
      : (status.reason === 'notOpenYet' ? t('region.formNotOpenYet', 'Registration is not open yet. Wait for automatic opening or ask the consul to change the time.') : t('region.registrationClosedWaitNext', 'Registration is closed by timer. Wait for the next set.')), 'warn');
    return false;
  }

  const extraPanel = $('#extraTroopPanel');
  if (extraPanel) extraPanel.hidden = !settings.allowExtraTroop;
  renderTroopOptions(settings);
  fillTierSelect($('#wrTier'), settings.minTier || 'T10', settings);
  fillExtraTierSelects({}, settings);
  renderCustomFields(settings, {});
  renderShiftOptions(settings);
  toggleExtraFields();
  $('#wastelandForm').hidden = false;
  return true;
}

async function resolveShortLinkSettings() {
  const resolved = await resolveRegionShareLink(shortCodeFromLink);
  currentRegion = resolved.region;
  return resolved.settings;
}

async function loadPublicForm(region) {
  currentUser = null;
  currentProfile = null;
  const settings = shortCodeFromLink ? await resolveShortLinkSettings() : await getRegionSettings(region);
  currentRegion = shortCodeFromLink ? currentRegion : region;
  $('#openRegionTableBtn').hidden = true;
  const open = await prepareForm(settings);
  if (!open) return;
  if (localStorage.getItem(publicLockKey())) {
    lockForm(t('region.alreadySubmittedBrowser', 'A request has already been sent from this browser. Only a consul or region officer can change it.'));
    return;
  }
  setStatus(t('region.publicCanSubmit', 'You can fill out the request without Google sign-in. After sending, only a consul or officer can edit it.'), 'muted');
}

async function loadSignedInForm(user) {
  currentUser = user;
  await saveSignedInUser(user).catch(() => null);
  if (shortCodeFromLink) {
    currentProfile = await getUserProfile(user.uid).catch(() => null);
    await resolveShortLinkSettings();
    if (farmFromLink && getFarmById(currentProfile || {}, farmFromLink)) selectedFarmId = farmFromLink;
  } else if (regionFromLink) {
    currentProfile = await getUserProfile(user.uid).catch(() => null);
    currentRegion = regionFromLink;
    if (farmFromLink && getFarmById(currentProfile || {}, farmFromLink)) selectedFarmId = farmFromLink;
  } else {
    const context = await getMyRegionContext(user);
    currentProfile = context.profile;
    currentRegion = context.region;
  }
  const ownRegion = getGameProfile(currentProfile || {}).region;
  const settings = await getRegionSettings(currentRegion);
  $('#openRegionTableBtn').hidden = !(canViewAnyRegion(currentProfile, currentUser) || ownRegion === currentRegion);
  const open = await prepareForm(settings);
  if (!open) return;
  renderSavedFarmTools(currentProfile);
  fillProfileFields(currentProfile);
  const saved = await getMyWastelandRegistration(user, currentRegion, selectedFarmId).catch(() => null);
  fillSavedRegistration(saved);
  if (saved && !canManageRegion(currentProfile, currentRegion, currentUser)) {
    lockForm(t('region.requestAlreadySavedLocked', 'Your request is already saved. Only a consul or officer can change it.'));
    return;
  }
  setStatus(saved ? t('region.savedLeaderCanUpdate', 'Your request already exists. You are a region leader, so you can update it.') : t('region.fillRegionForm', 'Fill out the region form.'), saved ? 'success' : 'muted');
}


function handleLanguageChange() {
  if (!formSettings) return;
  $('#regionNumberPill') && ($('#regionNumberPill').textContent = regionPillText());
  $('#regionFormTitleText') && ($('#regionFormTitleText').textContent = settingsTitle(formSettings));
  $('#regionFormDescText') && ($('#regionFormDescText').textContent = settingsDescription(formSettings));
  const selectedTroop = $('#wrTroopType')?.value || '';
  const selectedShift = $('input[name="wrShift"]:checked')?.value || '';
  const extraEnabled = Boolean($('#wrExtraEnabled')?.checked);
  const extraSquads = readExtraSquads();
  const extraByType = Object.fromEntries(extraSquads.map(item => [item.troopType, item.tier]));
  renderTroopOptions(formSettings);
  if (selectedTroop) $('#wrTroopType') && ($('#wrTroopType').value = selectedTroop);
  renderShiftOptions(formSettings);
  const shiftInput = selectedShift ? $(`input[name="wrShift"][value="${selectedShift}"]`) : null;
  if (shiftInput) shiftInput.checked = true;
  $('#wrExtraEnabled') && ($('#wrExtraEnabled').checked = extraEnabled);
  fillExtraTierSelects(extraByType, formSettings);
  document.querySelectorAll('[data-extra-troop]').forEach(input => {
    input.checked = Boolean(extraByType[input.dataset.extraTroop]);
  });
  setFormState(formSettings);
  renderEventInfo(formSettings);
  startCountdown(formSettings);
  toggleExtraFields();
}

function bind() {
  $('#wastelandForm')?.addEventListener('submit', handleSubmit);
  document.addEventListener('change', event => {
    if (event.target?.matches?.('#wrExtraEnabled, [data-extra-troop]')) toggleExtraFields();
  });
  $('#wrSavedFarmSelect')?.addEventListener('change', event => {
    selectedFarmId = event.currentTarget.value || 'main';
    fillProfileFields(currentProfile, selectedFarmId);
    setStatus(t('region.selectedPlayerCopied', 'Selected player data copied to the form. Check troop type, tier and shift.'), 'success');
  });
  $('#wrFillFromProfileBtn')?.addEventListener('click', () => {
    selectedFarmId = $('#wrSavedFarmSelect')?.value || selectedFarmId || 'main';
    fillProfileFields(currentProfile, selectedFarmId);
    setStatus(t('region.profileCopied', 'Profile data copied into the request.'), 'success');
  });
  $('#resetWastelandFormBtn')?.addEventListener('click', () => {
    $('#wastelandForm')?.reset();
    if (currentProfile) fillProfileFields(currentProfile, selectedFarmId);
    toggleExtraFields();
  });
  $('#openRegionTableBtn')?.addEventListener('click', () => { window.location.href = 'region-table.html'; });
  document.addEventListener('wkd:language-changed', handleLanguageChange);
}

async function init() {
  if (ready) return;
  ready = true;
  bind();
  regionFromLink = readRegionFromUrl();
  shortCodeFromLink = readShortLinkFromUrl();
  farmFromLink = readFarmFromUrl();
  if (regionFromLink || shortCodeFromLink) {
    await watchAuth(user => {
      if (!shortCodeFromLink && !user) {
        setStatus(t('region.secretLinkRequired', 'For security, guest registration opens only through a short secret link from a consul or officer.'), 'warn');
        return;
      }
      (user ? loadSignedInForm(user) : loadPublicForm(regionFromLink)).catch(error => {
        console.error(error);
        const message = error?.message === 'short-link-expired' || error?.message === 'short-link-not-found'
          ? t('region.shortLinkInvalid', 'This short link is no longer valid. Ask the consul or officer for a new link.')
          : t('region.formOpenFailed', 'Could not open the region form. Check the link or access rights.');
        setStatus(message, 'error');
      });
    });
    return;
  }
  await watchAuth(user => {
    if (!user) {
      setStatus(t('region.openLinkOrSignIn', 'Open the link from a consul/officer or sign in with Google.'), 'warn');
      return;
    }
    loadSignedInForm(user).catch(error => {
      console.error(error);
      setStatus(t('region.fillProfileFirst', 'Fill in your player profile with a region first.'), 'error');
    });
  });
}

document.addEventListener('wkd:partials-ready', init);
document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
