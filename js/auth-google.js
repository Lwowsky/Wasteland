import { isFirebaseConfigured, getFirebase, watchAuth } from './services/firebase-service.js';

const $ = selector => document.querySelector(selector);
let authReady = false;

function setUser(user) {
  const signedIn = Boolean(user);
  const name = user?.displayName || user?.email || 'Гість';
  const userText = $('#authUserText');
  const hint = $('#drawerAuthHint');
  const login = $('#googleLoginBtn');
  const logout = $('#googleLogoutBtn');

  if (userText) userText.textContent = name;
  if (hint) hint.textContent = signedIn ? `Ви увійшли як ${name}.` : 'Можна користуватись сайтом як гість.';
  if (login) login.hidden = signedIn;
  if (logout) logout.hidden = !signedIn;
}

function openLoginPage() {
  window.location.href = 'login.html';
}

async function logoutGoogle() {
  const firebase = await getFirebase();
  if (firebase) await firebase.authMod.signOut(firebase.auth);
  setUser(null);
}

async function initAuthGoogle() {
  if (authReady || !$('#googleLoginBtn')) return;
  authReady = true;

  $('#googleLoginBtn')?.addEventListener('click', openLoginPage);
  $('#drawerGoogleLoginBtn')?.addEventListener('click', openLoginPage);
  $('#googleLogoutBtn')?.addEventListener('click', logoutGoogle);

  if (!isFirebaseConfigured()) {
    setUser(null);
    return;
  }

  await watchAuth(setUser);
}

document.addEventListener('wkd:partials-ready', initAuthGoogle);
document.addEventListener('DOMContentLoaded', () => setTimeout(initAuthGoogle, 0));
