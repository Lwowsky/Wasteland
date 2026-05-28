import { watchAuth } from '../services/firebase-service.js';
import { saveSignedInUser } from '../services/user-db.js';
import { canManageRegion, getMyRegionContext, getRegionSettings, readRegionFromUrl, saveRegionSettings } from '../services/region-db.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
let currentUser = null;
let currentRegion = '';
let ready = false;

function setStatus(text, type = 'muted') {
  const box = $('#regionSettingsStatus');
  if (!box) return;
  box.textContent = text;
  box.dataset.type = type;
}

function buildShareLink(region) {
  const url = new URL('region-form.html', window.location.href);
  url.searchParams.set('region', region);
  return url.toString();
}

function updateShareLink() {
  const input = $('#regionShareLink');
  if (input && currentRegion) input.value = buildShareLink(currentRegion);
}

function fill(settings) {
  $('#settingsEnabled').value = String(Boolean(settings.enabled));
  $('#settingsTitle').value = settings.title || '';
  $('#settingsDescription').value = settings.description || '';
  $('#settingsRequireCaptain').checked = Boolean(settings.requireCaptain);
  $('#settingsExtraTroop').checked = Boolean(settings.allowExtraTroop);
  $$('input[name="settingsShift"]').forEach(input => {
    input.checked = settings.shifts?.includes(input.value);
  });
  updateShareLink();
}

function read() {
  return {
    enabled: $('#settingsEnabled').value === 'true',
    title: $('#settingsTitle').value,
    description: $('#settingsDescription').value,
    shifts: $$('input[name="settingsShift"]:checked').map(input => input.value),
    requireCaptain: $('#settingsRequireCaptain').checked,
    allowExtraTroop: $('#settingsExtraTroop').checked
  };
}

async function save(event) {
  event.preventDefault();
  const values = read();
  if (!values.shifts.length) {
    setStatus('Вибери хоча б одну зміну для форми.', 'error');
    return;
  }
  try {
    setStatus('Зберігаю форму регіону...', 'muted');
    await saveRegionSettings(currentUser, currentRegion, values);
    setStatus('Форму регіону збережено. Можеш кинути посилання гравцям.', 'success');
  } catch (error) {
    console.error(error);
    setStatus('Не вдалося зберегти форму. Перевір роль і Firestore Rules.', 'error');
  }
}

async function copyShareLink() {
  const input = $('#regionShareLink');
  if (!input?.value) return;
  try {
    await navigator.clipboard.writeText(input.value);
    setStatus('Посилання скопійовано. Його можна кинути гравцям без реєстрації на сайті.', 'success');
  } catch {
    input.select();
    document.execCommand('copy');
    setStatus('Посилання виділено. Скопіюй його вручну, якщо браузер не дозволив копіювання.', 'warn');
  }
}

async function load(user) {
  currentUser = user;
  if (!user) {
    setStatus('Щоб налаштовувати форму, потрібно увійти через Google.', 'warn');
    setTimeout(() => { window.location.href = 'login.html'; }, 800);
    return;
  }
  await saveSignedInUser(user).catch(() => null);
  const { profile, region } = await getMyRegionContext(user, readRegionFromUrl());
  currentRegion = region;
  $('#settingsRegionPill').textContent = `Регіон ${region}`;
  if (!canManageRegion(profile, region)) {
    setStatus('Форму регіону може змінювати тільки адмін, модератор, консул або офіцер свого регіону.', 'error');
    return;
  }
  const settings = await getRegionSettings(region);
  fill(settings);
  $('#regionSettingsForm').hidden = false;
  setStatus('Налаштуй форму і скопіюй посилання для гравців свого регіону.', 'success');
}

function bind() {
  $('#regionSettingsForm')?.addEventListener('submit', save);
  $('#copyRegionShareBtn')?.addEventListener('click', copyShareLink);
  $('#openRegionTableFromSettingsBtn')?.addEventListener('click', () => { window.location.href = `region-table.html?region=${currentRegion}`; });
}

async function init() {
  if (ready) return;
  ready = true;
  bind();
  await watchAuth(user => load(user).catch(error => {
    console.error(error);
    setStatus('Не вдалося відкрити налаштування регіону.', 'error');
  }));
}

document.addEventListener('wkd:partials-ready', init);
document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
