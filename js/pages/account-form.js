import { getFirebase, watchAuth } from '../services/firebase-service.js';
import {
  getUserProfile,
  getActiveRoleRequest,
  isProfileComplete,
  roleLabel,
  roleRequestStatusLabel,
  saveGameRegistration,
  saveSignedInUser
} from '../services/user-db.js';

const $ = selector => document.querySelector(selector);
const trim = value => String(value ?? '').trim();
const REQUESTABLE_ROLES = ['officer', 'consul'];
const SELECTABLE_ROLES = ['player', 'officer', 'consul'];

let currentUser = null;
let currentProfile = null;
let accountReady = false;

function setStatus(text, type = 'muted') {
  const box = $('#accountStatus');
  if (!box) return;
  box.textContent = text;
  box.dataset.type = type;
}

function setRoleHint(profile = {}) {
  const hint = $('#roleRequestHint');
  if (!hint) return;

  const role = profile.role || 'player';
  const request = getActiveRoleRequest(profile);
  if (request?.status === 'pending') {
    hint.textContent = `Заявка на роль «${roleLabel(request.requestedRole)}» відправлена. Потрібно зачекати рішення адміна.`;
    hint.dataset.type = 'warn';
    return;
  }
  if (request?.status === 'approved') {
    hint.textContent = `Роль підтверджено: ${roleLabel(role)}.`;
    hint.dataset.type = 'success';
    return;
  }
  if (request?.status === 'declined') {
    hint.textContent = `Попередню заявку відхилено. Можеш залишити нову заявку або залишитись простим гравцем.`;
    hint.dataset.type = 'error';
    return;
  }
  hint.textContent = role === 'player'
    ? 'Офіцера або консула підтверджує тільки адмін.'
    : `Поточна роль: ${roleLabel(role)}.`;
  hint.dataset.type = role === 'player' ? 'muted' : 'success';
}

function fillUserCard(user, profile = {}) {
  $('#accountAvatar')?.setAttribute('src', user?.photoURL || 'img/logo.webp');
  if ($('#accountGoogleName')) $('#accountGoogleName').textContent = user?.displayName || user?.email || 'Google user';
  if ($('#accountEmail')) $('#accountEmail').textContent = user?.email || '';
  if ($('#accountRole')) $('#accountRole').textContent = roleLabel(profile.role || 'player');
  if ($('#currentRoleText')) $('#currentRoleText').textContent = roleLabel(profile.role || 'player');
}


function fillForm(profile = {}) {
  const game = profile.gameProfile || {};
  const set = (id, value) => { const el = $(id); if (el) el.value = value ?? ''; };
  const role = profile.role || 'player';
  const request = getActiveRoleRequest(profile);
  const requestedRole = request?.status === 'pending'
    ? request.requestedRole
    : (SELECTABLE_ROLES.includes(role) ? role : 'player');

  set('#nickname', game.nickname || profile.gameNick || '');
  set('#region', game.region || profile.region || '');
  set('#alliance', game.alliance || profile.alliance || '');
  set('#rank', game.rank || profile.rank || 'p1');
  set('#shk', game.shk || profile.shk || '');
  set('#requestedRole', requestedRole || 'player');

  fillUserCard(currentUser, profile);
  setRoleHint(profile);
}

function readForm() {
  return {
    nickname: trim($('#nickname')?.value),
    region: trim($('#region')?.value),
    alliance: trim($('#alliance')?.value),
    rank: trim($('#rank')?.value),
    shk: trim($('#shk')?.value),
    requestedRole: trim($('#requestedRole')?.value || 'player')
  };
}

function validate(values) {
  const errors = [];
  if (!values.nickname) errors.push('Вкажи нік у грі.');
  if (!values.region) errors.push('Вкажи регіон.');
  if (!/^\d{1,4}$/.test(values.region) || Number(values.region) < 1 || Number(values.region) > 1200) {
    errors.push('Регіон має бути числом від 1 до 1200.');
  }
  if (!values.alliance) errors.push('Вкажи альянс.');
  if (!['p1', 'p2', 'p3', 'p4', 'p5'].includes(values.rank)) errors.push('Вибери ранг P1–P5.');
  if (!values.shk) errors.push('Вкажи ШК.');
  if (values.shk && (!/^\d{1,2}$/.test(values.shk) || Number(values.shk) < 1 || Number(values.shk) > 45)) {
    errors.push('ШК має бути числом від 1 до 45.');
  }
  if (!SELECTABLE_ROLES.includes(values.requestedRole)) {
    errors.push('Вибери коректну роль.');
  }
  return errors;
}

function buildSavedMessage(profile = {}) {
  const request = getActiveRoleRequest(profile);
  if (request?.status === 'pending') {
    return `Профіль збережено. Заявка на роль «${roleLabel(request.requestedRole)}» очікує підтвердження адміна.`;
  }
  return 'Профіль збережено. Дані записані у Firestore.';
}

async function handleSave(event) {
  event.preventDefault();
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  const values = readForm();
  const errors = validate(values);
  if (errors.length) {
    setStatus(errors.join(' '), 'error');
    return;
  }

  try {
    setStatus('Зберігаю профіль...', 'muted');
    currentProfile = await saveGameRegistration(currentUser, values);
    fillForm(currentProfile);
    setStatus(buildSavedMessage(currentProfile), getActiveRoleRequest(currentProfile)?.status === 'pending' ? 'warn' : 'success');

    if (document.body.dataset.accountPage === 'register') {
      setTimeout(() => { window.location.href = 'profile.html'; }, 900);
    }
  } catch (error) {
    console.error(error);
    setStatus('Не вдалося зберегти профіль. Перевір Firestore Rules і Google-вхід.', 'error');
  }
}

function handleRoleChange() {
  const role = $('#requestedRole')?.value || 'player';
  const hint = $('#roleRequestHint');
  if (!hint) return;
  if (REQUESTABLE_ROLES.includes(role)) {
    hint.textContent = `Після збереження буде створена заявка на роль «${roleLabel(role)}». Потрібно зачекати рішення адміна.`;
    hint.dataset.type = 'warn';
  } else {
    setRoleHint(currentProfile || {});
  }
}

async function signOut() {
  const firebase = await getFirebase();
  if (firebase) await firebase.authMod.signOut(firebase.auth);
  window.location.href = 'login.html';
}

async function initAccountPage() {
  if (accountReady || !$('#accountForm')) return;
  accountReady = true;
  $('#accountForm')?.addEventListener('submit', handleSave);
  $('#requestedRole')?.addEventListener('change', handleRoleChange);
  $('#backToSiteBtn')?.addEventListener('click', () => { window.location.href = 'index.html'; });
  $('#signOutBtn')?.addEventListener('click', signOut);

  await watchAuth(async user => {
    currentUser = user;

    if (!user) {
      setStatus('Потрібно увійти через Google.', 'warn');
      setTimeout(() => { window.location.href = 'login.html'; }, 600);
      return;
    }

    try {
      currentProfile = await saveSignedInUser(user);
      currentProfile = currentProfile || await getUserProfile(user.uid).catch(() => null);
      fillForm(currentProfile || {});
      const page = document.body.dataset.accountPage;
      if (page === 'profile' && !isProfileComplete(currentProfile)) {
        setStatus('Спочатку заверши реєстрацію гравця.', 'warn');
      } else {
        const request = getActiveRoleRequest(currentProfile);
        setStatus(request?.status === 'pending'
          ? `Заявка на роль «${roleLabel(request.requestedRole)}» очікує підтвердження.`
          : (page === 'register' ? 'Заповни дані гравця для першої реєстрації.' : 'Тут можна оновити свій профіль.'),
          request?.status === 'pending' ? 'warn' : 'muted');
      }
    } catch (error) {
      console.error(error);
      setStatus('Не вдалося прочитати профіль з Firestore.', 'error');
    }
  });
}

document.addEventListener('wkd:partials-ready', initAccountPage);
document.addEventListener('DOMContentLoaded', () => setTimeout(initAccountPage, 0));
