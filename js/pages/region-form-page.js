import { watchAuth } from '../services/firebase-service.js';
import { saveSignedInUser, getGameProfile, getUserProfile } from '../services/user-db.js';
import {
  getMyRegionContext,
  getRegionSettings,
  getMyWastelandRegistration,
  saveWastelandRegistration,
  readRegionFromUrl,
  shiftLabel
} from '../services/region-db.js';

const $ = selector => document.querySelector(selector);
const tiers = Array.from({ length: 14 }, (_, i) => `T${14 - i}`);
let currentUser = null;
let currentProfile = null;
let currentRegion = '';
let regionFromLink = '';
let formSettings = null;
let ready = false;

function setStatus(text, type = 'muted') {
  const box = $('#regionStatus');
  if (!box) return;
  box.textContent = text;
  box.dataset.type = type;
}

function fillTierSelect(select, selected = 'T10') {
  if (!select) return;
  select.innerHTML = tiers.map(tier => `<option value="${tier}" ${tier === selected ? 'selected' : ''}>${tier}</option>`).join('');
}

function renderShiftOptions(settings) {
  const box = $('#wrShiftOptions');
  if (!box) return;
  const shifts = settings?.shifts?.length ? settings.shifts : ['shift1', 'shift2'];
  box.innerHTML = shifts.map((shift, index) => `
    <label class="region-check">
      <input type="radio" name="wrShift" value="${shift}" ${index === 0 ? 'checked' : ''} required /> ${shiftLabel(shift)}
    </label>`).join('');
}

function setFormState(settings) {
  const state = $('#regionFormState');
  if (!state) return;
  state.textContent = settings.enabled ? 'Форма включена' : 'Форма відключена';
  state.classList.toggle('region-pill--open', settings.enabled);
  state.classList.toggle('region-pill--closed', !settings.enabled);
}

function fillProfileFields(profile) {
  const game = getGameProfile(profile || {});
  $('#wrNickname').value = game.nickname || '';
  $('#wrAlliance').value = game.alliance || '';
}

function fillSavedRegistration(row) {
  if (!row) return;
  $('#wrNickname').value = row.nickname || $('#wrNickname').value;
  $('#wrAlliance').value = row.alliance || $('#wrAlliance').value;
  $('#wrTroopType').value = row.troopType || '';
  $('#wrTier').value = row.tier || 'T10';
  $('#wrMarch').value = row.marchSize || '';
  $('#wrRally').value = row.rallySize || '';
  $('#wrReadyJoin').checked = Boolean(row.readyToJoin);
  $('#wrReadyAttack').checked = Boolean(row.readyToAttack);
  $('#wrCaptain').checked = Boolean(row.captainReady);
  const shift = $(`input[name="wrShift"][value="${row.shift}"]`);
  if (shift) shift.checked = true;
  $('#wrComment').value = row.comment || '';
  $('#wrExtraEnabled').checked = Boolean(row.extraEnabled);
  $('#wrExtraTroopType').value = row.extraTroopType || '';
  $('#wrExtraTier').value = row.extraTier || 'T10';
  $('#wrExtraMarch').value = row.extraMarchSize || '';
  toggleExtraFields();
}

function toggleExtraFields() {
  const enabled = $('#wrExtraEnabled')?.checked;
  const fields = $('#extraTroopFields');
  if (fields) fields.hidden = !enabled;
}

function readForm() {
  return {
    nickname: $('#wrNickname')?.value,
    alliance: $('#wrAlliance')?.value,
    troopType: $('#wrTroopType')?.value,
    tier: $('#wrTier')?.value,
    marchSize: $('#wrMarch')?.value,
    rallySize: $('#wrRally')?.value,
    readyToJoin: $('#wrReadyJoin')?.checked,
    readyToAttack: $('#wrReadyAttack')?.checked,
    captainReady: $('#wrCaptain')?.checked,
    shift: $('input[name="wrShift"]:checked')?.value,
    comment: $('#wrComment')?.value,
    extraEnabled: $('#wrExtraEnabled')?.checked,
    extraTroopType: $('#wrExtraTroopType')?.value,
    extraTier: $('#wrExtraTier')?.value,
    extraMarchSize: $('#wrExtraMarch')?.value
  };
}

function validate(values) {
  const errors = [];
  if (!values.nickname?.trim()) errors.push('Вкажи нік.');
  if (!values.alliance?.trim()) errors.push('Вкажи альянс.');
  if (!values.troopType) errors.push('Вибери основний тип військ.');
  if (!values.shift) errors.push('Вибери зміну.');
  if (formSettings?.requireCaptain && !values.captainReady) errors.push('У цьому регіоні треба вказати готовність бути капітаном.');
  return errors;
}

async function handleSubmit(event) {
  event.preventDefault();
  const values = readForm();
  const errors = validate(values);
  if (errors.length) {
    setStatus(errors.join(' '), 'error');
    return;
  }
  try {
    setStatus('Зберігаю заявку...', 'muted');
    await saveWastelandRegistration(currentUser, values, currentRegion);
    setStatus('Заявку збережено. Консул або офіцер побачить її у таблиці регіону.', 'success');
  } catch (error) {
    console.error(error);
    setStatus('Не вдалося зберегти заявку. Перевір Firestore Rules або спробуй ще раз.', 'error');
  }
}

async function loadPublicForm(region) {
  currentUser = null;
  currentProfile = null;
  currentRegion = region;
  formSettings = await getRegionSettings(region);
  $('#regionNumberPill').textContent = `Регіон ${region}`;
  $('#regionFormTitleText').textContent = formSettings.title;
  $('#regionFormDescText').textContent = formSettings.description;
  $('#openRegionTableBtn').hidden = true;
  setFormState(formSettings);

  if (!formSettings.enabled) {
    setStatus('Форма для цього регіону зараз відключена.', 'warn');
    return;
  }

  fillTierSelect($('#wrTier'), 'T10');
  fillTierSelect($('#wrExtraTier'), 'T10');
  renderShiftOptions(formSettings);
  $('#wastelandForm').hidden = false;
  setStatus('Можеш заповнити заявку без Google-входу. Таблицю регіону бачать тільки гравці цього регіону.', 'muted');
}

async function loadSignedInForm(user) {
  currentUser = user;
  await saveSignedInUser(user).catch(() => null);
  if (regionFromLink) {
    currentProfile = await getUserProfile(user.uid).catch(() => null);
    currentRegion = regionFromLink;
  } else {
    const context = await getMyRegionContext(user);
    currentProfile = context.profile;
    currentRegion = context.region;
  }
  const ownRegion = getGameProfile(currentProfile || {}).region;
  formSettings = await getRegionSettings(currentRegion);
  $('#regionNumberPill').textContent = `Регіон ${currentRegion}`;
  $('#regionFormTitleText').textContent = formSettings.title;
  $('#regionFormDescText').textContent = formSettings.description;
  $('#openRegionTableBtn').hidden = Boolean(regionFromLink && regionFromLink !== ownRegion);
  setFormState(formSettings);

  if (!formSettings.enabled) {
    setStatus('Форма для цього регіону зараз відключена.', 'warn');
    return;
  }

  fillTierSelect($('#wrTier'), 'T10');
  fillTierSelect($('#wrExtraTier'), 'T10');
  renderShiftOptions(formSettings);
  fillProfileFields(currentProfile);
  const saved = await getMyWastelandRegistration(user, currentRegion).catch(() => null);
  fillSavedRegistration(saved);
  $('#wastelandForm').hidden = false;
  setStatus(saved ? 'Твоя заявка вже є. Можеш оновити дані.' : 'Заповни форму для регіону.', saved ? 'success' : 'muted');
}

function bind() {
  $('#wastelandForm')?.addEventListener('submit', handleSubmit);
  $('#wrExtraEnabled')?.addEventListener('change', toggleExtraFields);
  $('#resetWastelandFormBtn')?.addEventListener('click', () => {
    $('#wastelandForm')?.reset();
    if (currentProfile) fillProfileFields(currentProfile);
    toggleExtraFields();
  });
  $('#openRegionTableBtn')?.addEventListener('click', () => { window.location.href = 'region-table.html'; });
}

async function init() {
  if (ready) return;
  ready = true;
  bind();
  regionFromLink = readRegionFromUrl();
  if (regionFromLink) {
    await watchAuth(user => (user ? loadSignedInForm(user) : loadPublicForm(regionFromLink)).catch(error => {
      console.error(error);
      setStatus('Не вдалося відкрити форму регіону. Перевір посилання або Firestore Rules.', 'error');
    }));
    return;
  }
  await watchAuth(user => {
    if (!user) {
      setStatus('Відкрий посилання від консула/офіцера або увійди через Google.', 'warn');
      return;
    }
    loadSignedInForm(user).catch(error => {
      console.error(error);
      setStatus('Спочатку заповни профіль гравця з регіоном.', 'error');
    });
  });
}

document.addEventListener('wkd:partials-ready', init);
document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
