import { isFirebaseConfigured, getFirebase, watchAuth } from './services/firebase-service.js';
import { saveSignedInUser } from './services/user-db.js';

const $ = selector => document.querySelector(selector);

function setStatus(text, type = 'muted') {
  const box = $('#loginStatus');
  if (!box) return;
  box.textContent = text;
  box.dataset.type = type;
}

function renderUser(user) {
  const signed = Boolean(user);
  $('#loginUserCard')?.classList.toggle('is-hidden', !signed);
  $('#loginGoogleBtn')?.toggleAttribute('hidden', signed);
  $('#loginLogoutBtn')?.toggleAttribute('hidden', !signed);
  $('#goAppBtn')?.toggleAttribute('hidden', !signed);

  if (!signed) {
    setStatus(isFirebaseConfigured()
      ? 'Увійди через Google або продовжуй як гість.'
      : 'Firebase config ще не заповнений. Скопіюй дані з Firebase Console у js/config/firebase.config.js.',
      isFirebaseConfigured() ? 'muted' : 'warn');
    return;
  }

  $('#loginAvatar')?.setAttribute('src', user.photoURL || 'img/logo.webp');
  $('#loginName').textContent = user.displayName || 'Google user';
  $('#loginEmail').textContent = user.email || '';
  setStatus('Акаунт підключено. Дані гравця збережені у Firestore.', 'success');
}

async function signInGoogle() {
  if (!isFirebaseConfigured()) {
    setStatus('Спочатку встав Firebase config у js/config/firebase.config.js.', 'warn');
    return;
  }

  try {
    setStatus('Відкриваю Google вхід...', 'muted');
    const firebase = await getFirebase();
    const provider = new firebase.authMod.GoogleAuthProvider();
    const result = await firebase.authMod.signInWithPopup(firebase.auth, provider);
    await saveSignedInUser(result.user);
    renderUser(result.user);
  } catch (error) {
    console.error(error);
    setStatus('Не вдалося увійти. Перевір Firebase config, Google provider і Authorized domains.', 'error');
  }
}

async function signOutGoogle() {
  const firebase = await getFirebase();
  if (firebase) await firebase.authMod.signOut(firebase.auth);
  renderUser(null);
}

async function initLoginPage() {
  $('#loginGoogleBtn')?.addEventListener('click', signInGoogle);
  $('#loginLogoutBtn')?.addEventListener('click', signOutGoogle);
  $('#guestBtn')?.addEventListener('click', () => { window.location.href = 'index.html'; });
  $('#goAppBtn')?.addEventListener('click', () => { window.location.href = 'index.html'; });

  await watchAuth(async user => {
    if (user) await saveSignedInUser(user).catch(console.error);
    renderUser(user);
  });
}

document.addEventListener('DOMContentLoaded', initLoginPage);
