import { getFirebase, watchAuth } from '../services/firebase-service.js';
import {
  deleteFarm,
  getActiveRoleRequest,
  getFarmById,
  getGameProfile,
  getUserFarms,
  getUserProfile,
  isProfileComplete,
  normalizeProfileVisibility,
  roleLabel,
  saveGameRegistration,
  saveSignedInUser
} from '../services/user-db.js';

const $ = selector => document.querySelector(selector);
const trim = value => String(value ?? '').trim();
const t = (key, fallback = '') => window.WKD_t ? window.WKD_t(key) : (fallback || key);
const tv = (key, fallback = '', vars = {}) => {
  let text = t(key, fallback);
  Object.entries(vars).forEach(([name, value]) => { text = text.replaceAll(`{${name}}`, String(value)); });
  return text;
};
const REQUESTABLE_ROLES = ['officer', 'consul'];
const SELECTABLE_ROLES = ['player', 'officer', 'consul'];

let currentUser = null;
let currentProfile = null;
let currentFarmId = 'main';
let draftFarm = null;
let accountReady = false;

function setStatus(text, type = 'muted') {
  const box = $('#accountStatus');
  if (!box) return;
  box.textContent = text;
  box.dataset.type = type;
}

function makeFarmId() {
  return `farm-${Date.now()}`;
}

function farmLabel(farm = {}, index = 0) {
  const name = farm.nickname || (farm.farmId === 'main' ? t('account.mainPlayer', 'Main player') : tv('account.farmNumber', 'Farm {index}', { index: index + 1 }));
  const region = farm.region ? ` · R${farm.region}` : '';
  return `${name}${region}`;
}

function profileFarms(profile = {}) {
  const main = { ...getGameProfile(profile), farmId: 'main', id: 'main' };
  return [main, ...getUserFarms(profile)];
}

function selectedFarm(profile = currentProfile) {
  if (draftFarm && currentFarmId === draftFarm.farmId) return draftFarm;
  return getFarmById(profile || {}, currentFarmId) || { farmId: currentFarmId || 'main', rank: 'p1' };
}

function renderFarmSelect() {
  const select = $('#farmSelect');
  if (!select) return;
  const farms = profileFarms(currentProfile || {});
  const hasDraft = draftFarm && !farms.some(farm => farm.farmId === draftFarm.farmId);
  const items = hasDraft ? [...farms, draftFarm] : farms;
  select.innerHTML = items.map((farm, index) => `
    <option value="${farm.farmId || farm.id || 'main'}" ${(farm.farmId || farm.id) === currentFarmId ? 'selected' : ''}>${farmLabel(farm, index)}</option>
  `).join('');
  $('#deleteFarmBtn') && ($('#deleteFarmBtn').hidden = currentFarmId === 'main' || Boolean(draftFarm && currentFarmId === draftFarm.farmId));
}

function setRoleHint(profile = {}) {
  const hint = $('#roleRequestHint');
  if (!hint) return;

  const role = profile.role || 'player';
  const request = getActiveRoleRequest(profile);
  if (request?.status === 'pending') {
    hint.textContent = tv('account.roleRequestSent', 'Role request “{role}” was sent. Wait for the admin decision.', { role: roleLabel(request.requestedRole) });
    hint.dataset.type = 'warn';
    return;
  }
  if (request?.status === 'approved') {
    hint.textContent = tv('account.roleApproved', 'Role approved: {role}.', { role: roleLabel(role) });
    hint.dataset.type = 'success';
    return;
  }
  if (request?.status === 'declined') {
    hint.textContent = t('account.roleDeclined', 'The previous request was declined. You can submit a new request or stay as a player.');
    hint.dataset.type = 'error';
    return;
  }
  hint.textContent = role === 'player'
    ? t('account.officerConsulAdminOnly', 'Only an admin can approve officer or consul.')
    : tv('account.currentRole', 'Current role: {role}.', { role: roleLabel(role) });
  hint.dataset.type = role === 'player' ? 'muted' : 'success';
}

function fillUserCard(user, profile = {}) {
  $('#accountAvatar')?.setAttribute('src', user?.photoURL || 'img/logo.webp');
  if ($('#accountGoogleName')) $('#accountGoogleName').textContent = user?.displayName || user?.email || t('profile.googleUser', 'Google user');
  if ($('#accountEmail')) $('#accountEmail').textContent = user?.email || '';
  if ($('#accountRole')) $('#accountRole').textContent = roleLabel(profile.role || 'player');
  if ($('#currentRoleText')) $('#currentRoleText').textContent = roleLabel(profile.role || 'player');
}

function fillFarmFields(farm = {}) {
  const set = (id, value) => { const el = $(id); if (el) el.value = value ?? ''; };
  set('#nickname', farm.nickname || '');
  set('#region', farm.region || '');
  set('#alliance', farm.alliance || '');
  set('#rank', farm.rank || 'p1');
  set('#shk', farm.shk || '');
}

function fillVisibilityFields(profile = {}) {
  const visibility = normalizeProfileVisibility(profile.profileVisibility || {});
  const showWasteland = $('#showWastelandInfo');
  const showFarms = $('#showFarmsInfo');
  if (showWasteland) showWasteland.checked = visibility.showWastelandInfo;
  if (showFarms) showFarms.checked = visibility.showFarmsInfo;
}

function fillForm(profile = {}) {
  const role = profile.role || 'player';
  const request = getActiveRoleRequest(profile);
  const requestedRole = request?.status === 'pending'
    ? request.requestedRole
    : (SELECTABLE_ROLES.includes(role) ? role : 'player');

  renderFarmSelect();
  fillFarmFields(selectedFarm(profile));
  const roleInput = $('#requestedRole');
  if (roleInput) roleInput.value = requestedRole || 'player';
  fillUserCard(currentUser, profile);
  fillVisibilityFields(profile);
  setRoleHint(profile);
}

function readForm() {
  return {
    farmId: currentFarmId || 'main',
    nickname: trim($('#nickname')?.value),
    region: trim($('#region')?.value),
    alliance: trim($('#alliance')?.value),
    rank: trim($('#rank')?.value || 'p1'),
    shk: trim($('#shk')?.value),
    requestedRole: trim($('#requestedRole')?.value || 'player'),
    profileVisibility: {
      showWastelandInfo: Boolean($('#showWastelandInfo')?.checked),
      showFarmsInfo: Boolean($('#showFarmsInfo')?.checked)
    }
  };
}

function validate(values) {
  const errors = [];
  if (!values.nickname) errors.push(t('account.errorNickname', 'Enter your in-game nickname.'));
  if (!values.region) errors.push(t('account.errorRegion', 'Enter your region.'));
  if (!/^\d{1,4}$/.test(values.region) || Number(values.region) < 1 || Number(values.region) > 1200) {
    errors.push(t('account.errorRegionRange', 'Region must be a number from 1 to 1200.'));
  }
  if (!values.alliance) errors.push(t('account.errorAlliance', 'Enter your alliance.'));
  if (!['p1', 'p2', 'p3', 'p4', 'p5'].includes(values.rank)) errors.push(t('account.errorRank', 'Choose rank P1–P5.'));
  if (!values.shk) errors.push(t('account.errorShk', 'Enter HQ level.'));
  if (values.shk && (!/^\d{1,2}$/.test(values.shk) || Number(values.shk) < 1 || Number(values.shk) > 45)) {
    errors.push(t('account.errorShkRange', 'HQ must be a number from 1 to 45.'));
  }
  if (!SELECTABLE_ROLES.includes(values.requestedRole)) errors.push(t('account.errorRole', 'Choose a valid role.'));
  return errors;
}

function buildSavedMessage(profile = {}) {
  const request = getActiveRoleRequest(profile);
  const farmName = currentFarmId === 'main' ? t('account.mainPlayerGenitive', 'main player') : t('account.farmGenitive', 'farm');
  if (request?.status === 'pending') {
    return tv('account.savedPending', '{farm} data saved. Role request “{role}” is waiting for admin approval.', { farm: farmName, role: roleLabel(request.requestedRole) });
  }
  return currentFarmId === 'main' ? t('account.savedMain', 'Main player data saved.') : t('account.savedFarm', 'Farm data saved.');
}

function needsRegionRoleReset(values) {
  const role = currentProfile?.role || 'player';
  if (!['consul', 'officer'].includes(role)) return false;
  if ((values.farmId || 'main') !== 'main') return false;
  const oldRegion = String(getGameProfile(currentProfile || {}).region || '').trim();
  const newRegion = String(values.region || '').trim();
  return Boolean(oldRegion && newRegion && oldRegion !== newRegion);
}

async function confirmRegionRoleReset(values) {
  if (!needsRegionRoleReset(values)) return true;
  const role = roleLabel(currentProfile?.role || 'player');
  const oldRegion = getGameProfile(currentProfile || {}).region;
  const message = tv('account.changeRegionMessage', 'You currently have the role “{role}” in region {oldRegion}. If you change the region to {newRegion}, the role will be reset to “Player”.', { role, oldRegion, newRegion: values.region });
  if (window.WKD?.confirmDialog) {
    return window.WKD.confirmDialog({
      title: t('account.changeRegionTitle', 'Change region and lose the role?'),
      message,
      note: t('account.changeRegionNote', 'Admin and moderator do not lose their role. After changing region, a consul or officer must request the higher role again.'),
      icon: '⚠',
      acceptText: t('account.changeRegionAccept', 'Change region')
    });
  }
  return window.confirm(`${message}

${t('common.confirm', 'Confirm')}?`);
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
  if (!await confirmRegionRoleReset(values)) {
    setStatus(t('account.regionChangeCancelled', 'Region change cancelled. The role stayed unchanged.'), 'muted');
    return;
  }

  try {
    setStatus(t('account.saving', 'Saving data...'), 'muted');
    currentProfile = await saveGameRegistration(currentUser, values);
    draftFarm = null;
    currentFarmId = values.farmId || 'main';
    fillForm(currentProfile);
    document.dispatchEvent(new CustomEvent('wkd:profile-updated', { detail: { profile: currentProfile } }));
    setStatus(buildSavedMessage(currentProfile), getActiveRoleRequest(currentProfile)?.status === 'pending' ? 'warn' : 'success');

    if (document.body.dataset.accountPage === 'register') {
      setTimeout(() => { window.location.href = 'profile.html'; }, 900);
    }
  } catch (error) {
    console.error(error);
    setStatus(t('account.saveFailed', 'Could not save the profile. Check access rights and Google sign-in.'), 'error');
  }
}

function handleRoleChange() {
  const role = $('#requestedRole')?.value || 'player';
  const hint = $('#roleRequestHint');
  if (!hint) return;
  if (REQUESTABLE_ROLES.includes(role)) {
    hint.textContent = tv('account.roleRequestSent', 'Role request “{role}” was sent. Wait for the admin decision.', { role: roleLabel(role) });
    hint.dataset.type = 'warn';
  } else {
    setRoleHint(currentProfile || {});
  }
}

function handleFarmChange(event) {
  currentFarmId = event.currentTarget.value || 'main';
  draftFarm = draftFarm && currentFarmId === draftFarm.farmId ? draftFarm : null;
  fillFarmFields(selectedFarm());
  $('#deleteFarmBtn') && ($('#deleteFarmBtn').hidden = currentFarmId === 'main' || Boolean(draftFarm));
  setStatus(currentFarmId === 'main' ? t('account.editingMainPlayer', 'Editing the main player.') : t('account.editingFarm', 'Editing an extra farm.'), 'muted');
}

function addFarm() {
  draftFarm = { farmId: makeFarmId(), id: '', nickname: '', region: getGameProfile(currentProfile || {}).region || '', alliance: '', rank: 'p1', shk: '' };
  currentFarmId = draftFarm.farmId;
  renderFarmSelect();
  fillFarmFields(draftFarm);
  setStatus(t('account.saveNewFarmHint', 'Fill in the new farm data and click “Save profile”.'), 'warn');
}

async function removeFarm() {
  if (!currentUser || currentFarmId === 'main') return;
  const ok = window.WKD?.confirmDialog
    ? await window.WKD.confirmDialog({
      title: t('account.deleteFarmTitle', 'Delete farm?'),
      message: t('account.deleteFarmMessage', 'This extra player will be removed from your profile.'),
      note: t('account.deleteFarmNote', 'The main profile will not change.'),
      icon: '✕',
      acceptText: t('common.delete', 'Delete')
    })
    : window.confirm(t('account.deleteFarmTitle', 'Delete farm?'));
  if (!ok) return;
  try {
    setStatus(t('account.deletingFarm', 'Deleting farm...'), 'muted');
    currentProfile = await deleteFarm(currentUser, currentFarmId);
    currentFarmId = 'main';
    draftFarm = null;
    fillForm(currentProfile || {});
    setStatus(t('account.farmDeleted', 'Farm deleted.'), 'success');
  } catch (error) {
    console.error(error);
    setStatus(t('account.farmDeleteFailed', 'Could not delete the farm.'), 'error');
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
  $('#farmSelect')?.addEventListener('change', handleFarmChange);
  $('#addFarmBtn')?.addEventListener('click', addFarm);
  $('#deleteFarmBtn')?.addEventListener('click', removeFarm);
  ['#nickname', '#region', '#alliance'].forEach(selector => {
    $(selector)?.addEventListener('blur', () => {
      if (!draftFarm || currentFarmId !== draftFarm.farmId) return;
      const values = readForm();
      draftFarm = { ...draftFarm, nickname: values.nickname, region: values.region, alliance: values.alliance, rank: values.rank, shk: values.shk };
      renderFarmSelect();
    });
  });
  $('#backToSiteBtn')?.addEventListener('click', () => { window.location.href = 'index.html'; });
  $('#signOutBtn')?.addEventListener('click', signOut);

  await watchAuth(async user => {
    currentUser = user;

    if (!user) {
      setStatus(t('account.signInRequired', 'You need to sign in with Google.'), 'warn');
      setTimeout(() => { window.location.href = 'login.html'; }, 600);
      return;
    }

    try {
      currentProfile = await saveSignedInUser(user);
      currentProfile = currentProfile || await getUserProfile(user.uid).catch(() => null);
      currentFarmId = currentProfile?.activeFarmId || 'main';
      if (!getFarmById(currentProfile || {}, currentFarmId)) currentFarmId = 'main';
      fillForm(currentProfile || {});
      const page = document.body.dataset.accountPage;
      if (page === 'profile' && !isProfileComplete(currentProfile)) {
        setStatus(t('account.completeMainFirst', 'Complete the main player registration first.'), 'warn');
      } else {
        const request = getActiveRoleRequest(currentProfile);
        setStatus(request?.status === 'pending'
          ? tv('account.requestPending', 'Role request “{role}” is waiting for approval.', { role: roleLabel(request.requestedRole) })
          : (page === 'register' ? t('account.fillMainFirst', 'Fill in the main player data for the first registration.') : t('account.profileHelp', 'Here you can update the main player and add farms.')), 
          request?.status === 'pending' ? 'warn' : 'muted');
      }
    } catch (error) {
      console.error(error);
      setStatus(t('account.readFailed', 'Could not read the profile.'), 'error');
    }
  });
}

document.addEventListener('wkd:partials-ready', initAccountPage);
document.addEventListener('DOMContentLoaded', () => setTimeout(initAccountPage, 0));
