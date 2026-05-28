import { getFirebase } from './firebase-service.js';

export const OWNER_EMAILS = ['vovapotaychuk@gmail.com'];
export const ADMIN_EMAILS = OWNER_EMAILS;

export const USER_ROLES = {
  admin: 'Адмін',
  moderator: 'Модератор',
  consul: 'Консул',
  officer: 'Офіцер',
  player: 'Простий гравець',
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
const isOwnerEmail = email => OWNER_EMAILS.includes(String(email || '').trim().toLowerCase());
const isAdminEmail = email => ADMIN_EMAILS.includes(String(email || '').trim().toLowerCase());

export function roleLabel(role = 'player') {
  return USER_ROLES[normalizeRole(role)] || USER_ROLES.player;
}

export function roleRequestStatusLabel(status = 'none') {
  return ROLE_REQUEST_STATUS[status] || ROLE_REQUEST_STATUS.none;
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
  return new Intl.DateTimeFormat('uk-UA', {
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
    nickname: normalizeText(game.nickname || data.gameNick || data.nickname),
    region: normalizeText(game.region || data.region),
    alliance: normalizeText(game.alliance || data.alliance).toUpperCase(),
    rank: normalizeText(game.rank || data.rank || 'p1').toLowerCase(),
    shk: normalizeText(game.shk || data.shk),
    state: game.state || (data.profileComplete ? 'complete' : 'new')
  };
}

export function makePublicPlayer(data = {}) {
  const game = getGameProfile(data);
  const role = normalizeRole(data.role || 'player');
  return {
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
    profileComplete: Boolean(data.profileComplete),
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    lastLoginAt: data.lastLoginAt || null
  };
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
      }
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
  const publicRef = firestoreMod.doc(db, 'publicPlayers', uid);
  const requestRef = firestoreMod.doc(db, 'roleRequests', uid);
  const oldProfile = await getUserProfile(uid);
  const now = firestoreMod.serverTimestamp();
  const currentRole = normalizeRole(oldProfile?.role || 'player');
  const requestedRole = normalizeRole(values.requestedRole || 'player');

  const clean = {
    nickname: normalizeText(values.nickname),
    region: normalizeText(values.region),
    alliance: normalizeText(values.alliance).toUpperCase(),
    rank: normalizeText(values.rank || 'p1').toLowerCase(),
    shk: normalizeText(values.shk),
    state: 'complete'
  };

  let roleRequest = oldProfile?.roleRequest || { requestedRole: 'player', status: 'none' };
  const batch = firestoreMod.writeBatch(db);

  if (isRequestableRole(requestedRole) && requestedRole !== currentRole) {
    const requestPayload = makeRoleRequestPayload({ user, oldProfile, clean, requestedRole, now });
    roleRequest = {
      requestedRole,
      requestedRoleLabel: roleLabel(requestedRole),
      status: 'pending',
      statusLabel: roleRequestStatusLabel('pending'),
      requestedAt: now,
      updatedAt: now
    };
    batch.set(requestRef, requestPayload, { merge: true });
  } else if (requestedRole === 'player' && oldProfile?.roleRequest?.status === 'pending') {
    roleRequest = { requestedRole: 'player', status: 'cancelled', statusLabel: roleRequestStatusLabel('cancelled'), updatedAt: now };
    batch.set(requestRef, { status: 'cancelled', updatedAt: now }, { merge: true });
  } else if (requestedRole === currentRole && currentRole !== 'player') {
    roleRequest = { requestedRole: currentRole, status: 'approved', statusLabel: roleRequestStatusLabel('approved'), updatedAt: now };
  } else if (!isRequestableRole(requestedRole)) {
    roleRequest = oldProfile?.roleRequest?.status === 'pending'
      ? oldProfile.roleRequest
      : { requestedRole: 'player', status: 'none', statusLabel: roleRequestStatusLabel('none') };
  }

  const fullUser = {
    uid,
    displayName: user.displayName || oldProfile?.displayName || '',
    email: user.email || oldProfile?.email || '',
    photoURL: user.photoURL || oldProfile?.photoURL || '',
    role: currentRole,
    roleRequest,
    profileComplete: true,
    gameNick: clean.nickname,
    region: clean.region,
    alliance: clean.alliance,
    rank: clean.rank,
    shk: clean.shk,
    gameProfile: clean,
    createdAt: oldProfile?.createdAt || now,
    updatedAt: now,
    lastLoginAt: oldProfile?.lastLoginAt || now
  };

  const publicPlayer = makePublicPlayer(fullUser);
  publicPlayer.createdAt = oldProfile?.createdAt || now;
  publicPlayer.updatedAt = now;
  publicPlayer.lastLoginAt = fullUser.lastLoginAt;

  batch.set(userRef, fullUser, { merge: true });
  batch.set(publicRef, publicPlayer, { merge: true });

  const newRegionRef = firestoreMod.doc(db, 'regions', clean.region, 'players', uid);
  batch.set(newRegionRef, publicPlayer, { merge: true });

  const oldRegion = normalizeText(oldProfile?.gameProfile?.region || oldProfile?.region);
  if (oldRegion && oldRegion !== clean.region) {
    const oldRegionRef = firestoreMod.doc(db, 'regions', oldRegion, 'players', uid);
    batch.delete(oldRegionRef);
  }

  await batch.commit();
  return getUserProfile(uid);
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
