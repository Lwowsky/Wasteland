import { getFirebase } from './firebase-service.js';

export const OWNER_EMAILS = ['vovapotaychuk@gmail.com'];
export const ADMIN_EMAILS = OWNER_EMAILS;

export const USER_ROLES = {
  admin: 'Адмін',
  moderator: 'Модератор',
  consul: 'Консул',
  officer: 'Офіцер',
  player: 'Гравець',
  guest: 'Гість'
};

export const ROLE_REQUEST_STATUS = {
  none: 'Без заявки',
  pending: 'Очікує підтвердження',
  approved: 'Підтверджено',
  declined: 'Відхилено',
  cancelled: 'Скасовано'
};

const REQUESTABLE_ROLES = ['officer', 'consul'];
const normalizeText = value => String(value ?? '').trim();
const normalizeRole = role => Object.hasOwn(USER_ROLES, role) ? role : 'player';
const isRequestableRole = role => REQUESTABLE_ROLES.includes(role);
function serviceT(key, fallback) { return globalThis.window?.WKD_t ? globalThis.window.WKD_t(key) : fallback; }
function serviceLocale() {
  const lang = globalThis.window?.WKD_CURRENT_LANG || globalThis.document?.documentElement?.lang || globalThis.navigator?.language || 'en';
  const map = { uk: 'uk-UA', en: 'en-US', ru: 'ru-RU', pl: 'pl-PL', de: 'de-DE', ja: 'ja-JP', zh: 'zh-CN', ko: 'ko-KR', vi: 'vi-VN', ar: 'ar' };
  return map[String(lang).toLowerCase()] || lang || 'en-US';
}

export function normalizeWastelandProfile(raw = {}) {
  const extraSquads = (Array.isArray(raw.extraSquads)
    ? raw.extraSquads
    : (raw.extraEnabled && raw.extraTroopType && raw.extraTier ? [{ troopType: raw.extraTroopType, tier: raw.extraTier }] : []))
    .map(item => ({ troopType: normalizeText(item?.troopType), tier: normalizeText(item?.tier || 'T10').toUpperCase() }))
    .filter(item => item.troopType && item.tier)
    .filter((item, index, arr) => arr.findIndex(other => other.troopType === item.troopType) === index);
  const firstExtra = extraSquads[0] || {};
  return {
    troopType: normalizeText(raw.troopType),
    tier: normalizeText(raw.tier || 'T10').toUpperCase(),
    lairLevel: normalizeText(raw.lairLevel || raw.lair),
    marchSize: normalizeText(raw.marchSize),
    rallySize: normalizeText(raw.rallySize),
    readyToJoin: Boolean(raw.readyToJoin),
    readyToAttack: Boolean(raw.readyToAttack),
    captainReady: Boolean(raw.captainReady),
    shift: normalizeText(raw.shift),
    comment: normalizeText(raw.comment),
    extraEnabled: Boolean(extraSquads.length),
    extraSquads,
    extraTroopType: firstExtra.troopType || '',
    extraTier: firstExtra.tier || '',
    extraMarchSize: ''
  };
}
const isOwnerEmail = email => OWNER_EMAILS.includes(String(email || '').trim().toLowerCase());
const isAdminEmail = email => ADMIN_EMAILS.includes(String(email || '').trim().toLowerCase());

export function roleLabel(role = 'player') {
  const key = normalizeRole(role);
  return serviceT(`role.${key}`, USER_ROLES[key] || USER_ROLES.player);
}

export function roleRequestStatusLabel(status = 'none') {
  const key = Object.hasOwn(ROLE_REQUEST_STATUS, status) ? status : 'none';
  return serviceT(`roleRequest.${key}`, ROLE_REQUEST_STATUS[key] || ROLE_REQUEST_STATUS.none);
}

export function normalizeUserRole(role = 'player') {
  return normalizeRole(role);
}

export function isOwnerUser(user, profile = null) {
  const email = user?.email || profile?.email || '';
  return isOwnerEmail(email);
}

export function isAdminUser(user, profile = null) {
  const email = user?.email || profile?.email || '';
  return isAdminEmail(email) || profile?.role === 'admin';
}

export function isModeratorUser(user, profile = null) {
  return profile?.role === 'moderator';
}

export function canUseAdminPanel(user, profile = null) {
  return isOwnerUser(user, profile) || profile?.role === 'admin' || profile?.role === 'moderator';
}

export function assignableRolesForActor(user, profile = null) {
  if (isOwnerUser(user, profile)) return ['admin', 'moderator', 'consul', 'officer', 'player'];
  if (profile?.role === 'admin') return ['moderator', 'consul', 'officer', 'player'];
  if (profile?.role === 'moderator') return ['consul', 'officer', 'player'];
  return [];
}

export function canAssignRole(user, profile = null, role = 'player') {
  return assignableRolesForActor(user, profile).includes(normalizeRole(role));
}

export function timestampToMs(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value === 'number') return value;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatUserDate(value) {
  const ms = timestampToMs(value);
  if (!ms) return '—';
  return new Intl.DateTimeFormat(serviceLocale(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(ms));
}

export function isProfileComplete(data = {}) {
  const profile = data.gameProfile || {};
  return Boolean(
    data.profileComplete &&
    normalizeText(profile.nickname || data.gameNick) &&
    normalizeText(profile.region || data.region) &&
    normalizeText(profile.alliance || data.alliance) &&
    normalizeText(profile.rank || data.rank) &&
    normalizeText(profile.shk || data.shk)
  );
}

export function getActiveRoleRequest(profile = {}) {
  const request = profile.roleRequest || {};
  if (!request.status || request.status === 'none') return null;
  return request;
}

export function getGameProfile(data = {}) {
  const game = data.gameProfile || {};
  return {
    farmId: game.farmId || 'main',
    nickname: normalizeText(game.nickname || data.gameNick || data.nickname),
    region: normalizeText(game.region || data.region),
    alliance: normalizeText(game.alliance || data.alliance).toUpperCase(),
    rank: normalizeText(game.rank || data.rank || 'p1').toLowerCase(),
    shk: normalizeText(game.shk || data.shk),
    state: game.state || (data.profileComplete ? 'complete' : 'new'),
    wastelandProfile: normalizeWastelandProfile(game.wastelandProfile || data.wastelandProfile || {})
  };
}

export function normalizeFarm(raw = {}, fallbackId = '') {
  const id = normalizeText(raw.farmId || raw.id || fallbackId || `farm-${Date.now()}`);
  return {
    farmId: id,
    id,
    nickname: normalizeText(raw.nickname || raw.gameNick),
    region: normalizeText(raw.region),
    alliance: normalizeText(raw.alliance).toUpperCase(),
    rank: normalizeText(raw.rank || 'p1').toLowerCase(),
    shk: normalizeText(raw.shk),
    state: raw.state || 'complete',
    wastelandProfile: normalizeWastelandProfile(raw.wastelandProfile || {}),
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null
  };
}

export function getUserFarms(data = {}) {
  const farms = Array.isArray(data.farms) ? data.farms : [];
  return farms.map((farm, index) => normalizeFarm(farm, farm.farmId || farm.id || `farm-${index + 1}`));
}

export function getFarmCount(data = {}) {
  return getUserFarms(data).filter(farm => farm.nickname && farm.region).length;
}

export function getFarmById(data = {}, farmId = 'main') {
  if (!farmId || farmId === 'main') return { ...getGameProfile(data), farmId: 'main', id: 'main' };
  return getUserFarms(data).find(farm => farm.farmId === farmId || farm.id === farmId) || null;
}

export function normalizeProfileVisibility(raw = {}) {
  return {
    showWastelandInfo: Boolean(raw.showWastelandInfo),
    showFarmsInfo: Boolean(raw.showFarmsInfo)
  };
}

function makePublicWastelandInfo(profile = {}) {
  const data = normalizeWastelandProfile(profile);
  return {
    lairLevel: data.lairLevel,
    troopType: data.troopType,
    tier: data.tier,
    marchSize: data.marchSize,
    rallySize: data.rallySize,
    captainReady: data.captainReady,
    readyToJoin: data.readyToJoin,
    readyToAttack: data.readyToAttack,
    shift: data.shift,
    extraEnabled: data.extraEnabled,
    extraSquads: data.extraSquads,
    extraTroopType: data.extraTroopType,
    extraTier: data.extraTier
  };
}

function makePublicFarm(farm = {}, index = 0, showWastelandInfo = false) {
  const item = normalizeFarm(farm, farm.farmId || farm.id || `farm-${index + 1}`);
  return {
    farmId: item.farmId,
    nickname: item.nickname,
    region: item.region,
    alliance: item.alliance,
    rank: item.rank,
    shk: item.shk,
    wastelandProfile: showWastelandInfo ? makePublicWastelandInfo(item.wastelandProfile || {}) : null
  };
}

export function makePublicPlayer(data = {}) {
  const game = getGameProfile(data);
  const role = normalizeRole(data.role || 'player');
  const visibility = normalizeProfileVisibility(data.profileVisibility || {});
  const publicPlayer = {
    uid: data.uid || data.id || '',
    gameNick: game.nickname,
    nickname: game.nickname,
    region: game.region,
    alliance: game.alliance,
    rank: game.rank,
    shk: game.shk,
    role,
    roleLabel: roleLabel(role),
    displayName: data.displayName || '',
    photoURL: data.photoURL || '',
    farmCount: getFarmCount(data),
    profileComplete: Boolean(data.profileComplete),
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    lastLoginAt: data.lastLoginAt || null,
    profileVisibility: visibility,
    wastelandProfile: visibility.showWastelandInfo ? makePublicWastelandInfo(game.wastelandProfile || {}) : null,
    farms: visibility.showFarmsInfo
      ? getUserFarms(data).filter(farm => farm.nickname || farm.region || farm.alliance).map((farm, index) => makePublicFarm(farm, index, visibility.showWastelandInfo))
      : []
  };
  return publicPlayer;
}


async function writePublicPlayerFromProfile(db, firestoreMod, profile = {}) {
  if (!profile?.uid || !isProfileComplete(profile)) return null;
  const publicPlayer = makePublicPlayer(profile);
  const region = normalizeText(publicPlayer.region);
  await firestoreMod.setDoc(firestoreMod.doc(db, 'publicPlayers', profile.uid), publicPlayer, { merge: true });
  if (region) {
    await firestoreMod.setDoc(firestoreMod.doc(db, 'regions', region, 'players', profile.uid), publicPlayer, { merge: true });
  }
  return publicPlayer;
}

export async function getUserProfile(uid) {
  if (!uid) return null;
  const firebase = await getFirebase();
  if (!firebase) return null;

  const { db, firestoreMod } = firebase;
  const ref = firestoreMod.doc(db, 'users', uid);
  const snapshot = await firestoreMod.getDoc(ref);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function saveSignedInUser(user) {
  if (!user) return null;
  const firebase = await getFirebase();
  if (!firebase) return null;

  const { db, firestoreMod } = firebase;
  const ref = firestoreMod.doc(db, 'users', user.uid);
  const snapshot = await firestoreMod.getDoc(ref);
  const now = firestoreMod.serverTimestamp();

  if (!snapshot.exists()) {
    await firestoreMod.setDoc(ref, {
      uid: user.uid,
      displayName: user.displayName || '',
      email: user.email || '',
      photoURL: user.photoURL || '',
      providerId: user.providerData?.[0]?.providerId || 'google.com',
      role: 'player',
      roleRequest: { requestedRole: 'player', status: 'none' },
      profileComplete: false,
      createdAt: now,
      lastLoginAt: now,
      updatedAt: now,
      gameProfile: {
        nickname: '',
        region: '',
        alliance: '',
        rank: 'p1',
        shk: '',
        state: 'new'
      },
      farms: [],
      activeFarmId: 'main',
      profileVisibility: { showWastelandInfo: false, showFarmsInfo: false }
    }, { merge: true });
  } else {
    const old = snapshot.data();
    await firestoreMod.setDoc(ref, {
      displayName: user.displayName || old.displayName || '',
      photoURL: user.photoURL || old.photoURL || '',
      lastLoginAt: now,
      updatedAt: now
    }, { merge: true });
  }

  let profile = await getUserProfile(user.uid);

  if (isAdminUser(user, profile) && profile?.role !== 'admin') {
    try {
      await firestoreMod.setDoc(ref, {
        role: 'admin',
        roleLabel: roleLabel('admin'),
        updatedAt: now
      }, { merge: true });
      profile = await getUserProfile(user.uid);
    } catch (error) {
      console.warn('Admin role sync failed', error);
    }
  }

  if (isProfileComplete(profile)) {
    await writePublicPlayerFromProfile(db, firestoreMod, profile).catch(error => {
      console.warn('Public profile sync failed', error);
    });
  }

  return profile;
}

export async function ensureCurrentUserPublished(user) {
  if (!user) return null;
  const firebase = await getFirebase();
  if (!firebase) return null;
  const { db, firestoreMod } = firebase;
  const profile = await saveSignedInUser(user);
  if (isProfileComplete(profile)) {
    await writePublicPlayerFromProfile(db, firestoreMod, profile).catch(error => {
      console.warn('Public profile sync failed', error);
    });
  }
  return getUserProfile(user.uid);
}

function makeRoleRequestPayload({ user, oldProfile, clean, requestedRole, now }) {
  return {
    uid: user.uid,
    requestedRole,
    requestedRoleLabel: roleLabel(requestedRole),
    currentRole: normalizeRole(oldProfile?.role || 'player'),
    currentRoleLabel: roleLabel(oldProfile?.role || 'player'),
    status: 'pending',
    nickname: clean.nickname,
    region: clean.region,
    alliance: clean.alliance,
    rank: clean.rank,
    shk: clean.shk,
    email: user.email || oldProfile?.email || '',
    displayName: user.displayName || oldProfile?.displayName || '',
    photoURL: user.photoURL || oldProfile?.photoURL || '',
    updatedAt: now,
    requestedAt: now
  };
}

export async function saveGameRegistration(user, values) {
  if (!user) throw new Error('auth-required');
  const firebase = await getFirebase();
  if (!firebase) throw new Error('firebase-not-configured');

  const { db, firestoreMod } = firebase;
  const uid = user.uid;
  const userRef = firestoreMod.doc(db, 'users', uid);
  const requestRef = firestoreMod.doc(db, 'roleRequests', uid);
  const oldProfile = await getUserProfile(uid);
  const now = firestoreMod.serverTimestamp();
  const currentRole = normalizeRole(oldProfile?.role || 'player');
  const requestedRole = normalizeRole(values.requestedRole || 'player');
  const farmId = normalizeText(values.farmId || 'main') || 'main';
  const profileVisibility = normalizeProfileVisibility(values.profileVisibility || oldProfile?.profileVisibility || {});

  const oldMain = getGameProfile(oldProfile || {});
  const oldFarms = getUserFarms(oldProfile || {});
  const oldSelectedFarm = farmId === 'main'
    ? oldMain
    : (oldFarms.find(farm => farm.farmId === farmId || farm.id === farmId) || {});
  const clean = normalizeFarm({
    ...oldSelectedFarm,
    farmId,
    nickname: values.nickname,
    region: values.region,
    alliance: values.alliance,
    rank: values.rank || 'p1',
    shk: values.shk,
    state: 'complete',
    updatedAt: Date.now()
  }, farmId);

  const regionChangedByLeader = farmId === 'main'
    && ['consul', 'officer'].includes(currentRole)
    && oldMain.region
    && clean.region
    && oldMain.region !== clean.region;
  const effectiveCurrentRole = regionChangedByLeader ? 'player' : currentRole;
  let nextRolePatch = regionChangedByLeader
    ? { role: 'player', roleLabel: roleLabel('player') }
    : {};

  let roleRequest = oldProfile?.roleRequest || { requestedRole: 'player', status: 'none' };
  const roleRequestWrites = [];

  if (isRequestableRole(requestedRole) && requestedRole !== effectiveCurrentRole) {
    const requestPayload = makeRoleRequestPayload({ user, oldProfile, clean, requestedRole, now });
    roleRequest = {
      requestedRole,
      requestedRoleLabel: roleLabel(requestedRole),
      status: 'pending',
      statusLabel: roleRequestStatusLabel('pending'),
      requestedAt: now,
      updatedAt: now
    };
    roleRequestWrites.push(() => firestoreMod.setDoc(requestRef, requestPayload, { merge: true }));
  } else if (requestedRole === 'player' && oldProfile?.roleRequest?.status === 'pending') {
    roleRequest = { requestedRole: 'player', status: 'cancelled', statusLabel: roleRequestStatusLabel('cancelled'), updatedAt: now };
    roleRequestWrites.push(() => firestoreMod.setDoc(requestRef, { status: 'cancelled', updatedAt: now }, { merge: true }));
  } else if (requestedRole === effectiveCurrentRole && effectiveCurrentRole !== 'player') {
    roleRequest = { requestedRole: effectiveCurrentRole, status: 'approved', statusLabel: roleRequestStatusLabel('approved'), updatedAt: now };
  } else if (!isRequestableRole(requestedRole)) {
    roleRequest = oldProfile?.roleRequest?.status === 'pending'
      ? oldProfile.roleRequest
      : { requestedRole: 'player', status: 'none', statusLabel: roleRequestStatusLabel('none') };
  }

  const nextFarms = farmId === 'main'
    ? oldFarms
    : [clean, ...oldFarms.filter(farm => farm.farmId !== farmId && farm.id !== farmId)];
  const mainGame = farmId === 'main' ? clean : oldMain;
  const profileComplete = Boolean(mainGame.nickname && mainGame.region && mainGame.alliance && mainGame.rank && mainGame.shk);

  // Не переписуємо захищені поля uid/email/role/createdAt.
  // Так звичайний гравець може зберегти ферми без помилок права доступу.
  await firestoreMod.setDoc(userRef, {
    ...nextRolePatch,
    roleRequest,
    profileComplete,
    gameNick: mainGame.nickname,
    region: mainGame.region,
    alliance: mainGame.alliance,
    rank: mainGame.rank,
    shk: mainGame.shk,
    gameProfile: mainGame,
    farms: nextFarms,
    farmCount: getFarmCount({ gameProfile: mainGame, farms: nextFarms, profileComplete }),
    activeFarmId: farmId,
    profileVisibility,
    updatedAt: now
  }, { merge: true });

  await Promise.all(roleRequestWrites.map(write => write())).catch(error => {
    console.warn('Role request sync failed', error);
  });

  const savedProfile = await getUserProfile(uid);
  if (regionChangedByLeader && oldMain.region) {
    await firestoreMod.deleteDoc(firestoreMod.doc(db, 'regions', oldMain.region, 'players', uid)).catch(() => null);
  }
  if (isProfileComplete(savedProfile)) {
    await writePublicPlayerFromProfile(db, firestoreMod, savedProfile).catch(error => {
      console.warn('Public player sync failed after profile save', error);
    });
  }

  return getUserProfile(uid);
}

export async function saveFarmWastelandProfile(user, farmId = 'main', values = {}) {
  if (!user) throw new Error('auth-required');
  const firebase = await getFirebase();
  if (!firebase) throw new Error('firebase-not-configured');

  const { db, firestoreMod } = firebase;
  const oldProfile = await getUserProfile(user.uid);
  if (!oldProfile) throw new Error('profile-not-found');

  const now = firestoreMod.serverTimestamp();
  const safeFarmId = normalizeText(farmId || 'main') || 'main';
  const oldMain = getGameProfile(oldProfile);
  const oldFarms = getUserFarms(oldProfile);
  const currentFarm = safeFarmId === 'main'
    ? oldMain
    : (oldFarms.find(farm => farm.farmId === safeFarmId || farm.id === safeFarmId) || null);
  if (!currentFarm) throw new Error('farm-not-found');

  const cleanForm = normalizeWastelandProfile(values);
  const updatedFarm = normalizeFarm({
    ...currentFarm,
    nickname: values.nickname || currentFarm.nickname,
    alliance: values.alliance || currentFarm.alliance,
    wastelandProfile: cleanForm,
    updatedAt: Date.now()
  }, safeFarmId);

  let nextMain = oldMain;
  let nextFarms = oldFarms;
  if (safeFarmId === 'main') {
    nextMain = updatedFarm;
  } else {
    nextFarms = [updatedFarm, ...oldFarms.filter(farm => farm.farmId !== safeFarmId && farm.id !== safeFarmId)];
  }

  const profileComplete = Boolean(nextMain.nickname && nextMain.region && nextMain.alliance && nextMain.rank && nextMain.shk);
  await firestoreMod.setDoc(firestoreMod.doc(db, 'users', user.uid), {
    profileComplete,
    gameNick: nextMain.nickname,
    region: nextMain.region,
    alliance: nextMain.alliance,
    rank: nextMain.rank,
    shk: nextMain.shk,
    gameProfile: nextMain,
    farms: nextFarms,
    farmCount: getFarmCount({ gameProfile: nextMain, farms: nextFarms, profileComplete }),
    activeFarmId: safeFarmId,
    updatedAt: now
  }, { merge: true });

  const savedProfile = await getUserProfile(user.uid);
  if (isProfileComplete(savedProfile)) {
    await writePublicPlayerFromProfile(db, firestoreMod, savedProfile).catch(error => {
      console.warn('Public player sync failed after saved Wasteland data', error);
    });
  }
  return savedProfile;
}

export async function deleteFarm(user, farmId) {
  if (!user || !farmId || farmId === 'main') throw new Error('farm-delete-denied');
  const firebase = await getFirebase();
  if (!firebase) throw new Error('firebase-not-configured');
  const { db, firestoreMod } = firebase;
  const oldProfile = await getUserProfile(user.uid);
  if (!oldProfile) throw new Error('profile-not-found');
  const farms = getUserFarms(oldProfile).filter(farm => farm.farmId !== farmId && farm.id !== farmId);
  const now = firestoreMod.serverTimestamp();
  await firestoreMod.setDoc(firestoreMod.doc(db, 'users', user.uid), {
    farms,
    farmCount: getFarmCount({ ...oldProfile, farms }),
    activeFarmId: 'main',
    updatedAt: now
  }, { merge: true });
  const savedProfile = await getUserProfile(user.uid);
  await writePublicPlayerFromProfile(db, firestoreMod, savedProfile).catch(() => null);
  return savedProfile;
}

export async function listRoleRequests(status = 'pending') {
  const firebase = await getFirebase();
  if (!firebase) return [];
  const { db, firestoreMod } = firebase;
  const queryRef = firestoreMod.query(
    firestoreMod.collection(db, 'roleRequests'),
    firestoreMod.where('status', '==', status)
  );
  const snapshot = await firestoreMod.getDocs(queryRef);
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => String(a.nickname || '').localeCompare(String(b.nickname || ''), 'uk'));
}

export async function listRegisteredUsers() {
  const firebase = await getFirebase();
  if (!firebase) return [];
  const { db, firestoreMod } = firebase;
  const snapshot = await firestoreMod.getDocs(firestoreMod.collection(db, 'users'));
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(user => user.profileComplete)
    .sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt));
}

export async function listPublicPlayers() {
  const firebase = await getFirebase();
  if (!firebase) return [];
  const { db, firestoreMod } = firebase;
  const snapshot = await firestoreMod.getDocs(firestoreMod.collection(db, 'publicPlayers'));
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(player => player.profileComplete !== false)
    .sort((a, b) => String(a.region || '').localeCompare(String(b.region || ''), 'uk', { numeric: true }) || String(a.nickname || '').localeCompare(String(b.nickname || ''), 'uk'));
}


export async function syncPublicPlayersFromUsers() {
  const firebase = await getFirebase();
  if (!firebase) return 0;
  const { db, firestoreMod } = firebase;
  const allUsers = await listRegisteredUsers();
  let batch = firestoreMod.writeBatch(db);
  let count = 0;

  for (const user of allUsers) {
    const publicPlayer = makePublicPlayer(user);
    batch.set(firestoreMod.doc(db, 'publicPlayers', user.uid), publicPlayer, { merge: true });
    if (publicPlayer.region) batch.set(firestoreMod.doc(db, 'regions', publicPlayer.region, 'players', user.uid), publicPlayer, { merge: true });
    count += 1;
    if (count % 400 === 0) {
      await batch.commit();
      batch = firestoreMod.writeBatch(db);
    }
  }

  if (count % 400 !== 0) await batch.commit();
  return count;
}

export async function updateUserByAdmin(uid, values) {
  if (!uid) throw new Error('missing-user-id');
  const firebase = await getFirebase();
  if (!firebase) throw new Error('firebase-not-configured');

  const { db, firestoreMod } = firebase;
  const oldProfile = await getUserProfile(uid);
  if (!oldProfile) throw new Error('user-not-found');

  const now = firestoreMod.serverTimestamp();
  const oldGame = getGameProfile(oldProfile);
  const clean = {
    nickname: normalizeText(values.nickname),
    region: normalizeText(values.region),
    alliance: normalizeText(values.alliance).toUpperCase(),
    rank: normalizeText(values.rank || 'p1').toLowerCase(),
    shk: normalizeText(values.shk),
    state: 'complete'
  };
  const role = normalizeRole(values.role || oldProfile.role || 'player');
  const actor = firebase.auth?.currentUser || null;
  const actorProfile = actor ? await getUserProfile(actor.uid) : null;
  if (!canAssignRole(actor, actorProfile, role)) {
    throw new Error('role-not-allowed');
  }
  const fullUser = {
    uid,
    gameNick: clean.nickname,
    nickname: clean.nickname,
    region: clean.region,
    alliance: clean.alliance,
    rank: clean.rank,
    shk: clean.shk,
    role,
    roleLabel: roleLabel(role),
    gameProfile: clean,
    profileComplete: true,
    updatedAt: now
  };
  const publicPlayer = makePublicPlayer({ ...oldProfile, ...fullUser, updatedAt: now });
  publicPlayer.updatedAt = now;
  publicPlayer.createdAt = oldProfile.createdAt || now;
  publicPlayer.lastLoginAt = oldProfile.lastLoginAt || null;

  const batch = firestoreMod.writeBatch(db);
  batch.set(firestoreMod.doc(db, 'users', uid), fullUser, { merge: true });
  batch.set(firestoreMod.doc(db, 'publicPlayers', uid), publicPlayer, { merge: true });
  batch.set(firestoreMod.doc(db, 'regions', clean.region, 'players', uid), publicPlayer, { merge: true });
  if (oldGame.region && oldGame.region !== clean.region) {
    batch.delete(firestoreMod.doc(db, 'regions', oldGame.region, 'players', uid));
  }
  await batch.commit();
  return getUserProfile(uid);
}

export async function approveRoleRequest(uid) {
  const firebase = await getFirebase();
  if (!firebase) throw new Error('firebase-not-configured');
  const { auth, db, firestoreMod } = firebase;
  const requestRef = firestoreMod.doc(db, 'roleRequests', uid);
  const requestSnap = await firestoreMod.getDoc(requestRef);
  if (!requestSnap.exists()) throw new Error('request-not-found');

  const request = requestSnap.data();
  const role = normalizeRole(request.requestedRole);
  if (!isRequestableRole(role)) throw new Error('bad-role');

  const userRef = firestoreMod.doc(db, 'users', uid);
  const userSnap = await firestoreMod.getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};
  const region = normalizeText(userData.gameProfile?.region || userData.region || request.region);
  const now = firestoreMod.serverTimestamp();
  const approvedBy = auth.currentUser?.email || '';
  const roleRequest = {
    requestedRole: role,
    requestedRoleLabel: roleLabel(role),
    status: 'approved',
    statusLabel: roleRequestStatusLabel('approved'),
    approvedBy,
    approvedAt: now,
    updatedAt: now
  };

  const batch = firestoreMod.writeBatch(db);
  const updatedPublic = makePublicPlayer({ ...userData, uid, role, roleRequest, updatedAt: now });
  updatedPublic.updatedAt = now;
  updatedPublic.createdAt = userData.createdAt || request.requestedAt || now;
  batch.set(userRef, { role, roleLabel: roleLabel(role), roleRequest, updatedAt: now }, { merge: true });
  batch.set(requestRef, { status: 'approved', approvedBy, approvedAt: now, updatedAt: now }, { merge: true });
  batch.set(firestoreMod.doc(db, 'publicPlayers', uid), updatedPublic, { merge: true });
  if (region) batch.set(firestoreMod.doc(db, 'regions', region, 'players', uid), updatedPublic, { merge: true });
  await batch.commit();
}

export async function declineRoleRequest(uid) {
  const firebase = await getFirebase();
  if (!firebase) throw new Error('firebase-not-configured');
  const { auth, db, firestoreMod } = firebase;
  const requestRef = firestoreMod.doc(db, 'roleRequests', uid);
  const requestSnap = await firestoreMod.getDoc(requestRef);
  if (!requestSnap.exists()) throw new Error('request-not-found');

  const request = requestSnap.data();
  const userRef = firestoreMod.doc(db, 'users', uid);
  const now = firestoreMod.serverTimestamp();
  const declinedBy = auth.currentUser?.email || '';
  const roleRequest = {
    requestedRole: normalizeRole(request.requestedRole),
    requestedRoleLabel: roleLabel(request.requestedRole),
    status: 'declined',
    statusLabel: roleRequestStatusLabel('declined'),
    declinedBy,
    declinedAt: now,
    updatedAt: now
  };

  const userSnap = await firestoreMod.getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};
  const publicPlayer = makePublicPlayer({ ...userData, uid, roleRequest, updatedAt: now });
  publicPlayer.updatedAt = now;
  publicPlayer.createdAt = userData.createdAt || request.requestedAt || now;

  const batch = firestoreMod.writeBatch(db);
  batch.set(userRef, { roleRequest, updatedAt: now }, { merge: true });
  batch.set(requestRef, { status: 'declined', declinedBy, declinedAt: now, updatedAt: now }, { merge: true });
  if (userData.profileComplete) batch.set(firestoreMod.doc(db, 'publicPlayers', uid), publicPlayer, { merge: true });
  await batch.commit();
}
