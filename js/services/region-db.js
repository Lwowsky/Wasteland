import { getFirebase } from './firebase-service.js';
import {
  getUserProfile,
  getGameProfile,
  isModeratorUser,
  normalizeUserRole,
  roleLabel,
  timestampToMs,
  formatUserDate
} from './user-db.js';

const trim = value => String(value ?? '').trim();
const toUpper = value => trim(value).toUpperCase();
const MANAGER_ROLES = ['admin', 'moderator', 'consul', 'officer'];

export const DEFAULT_REGION_FORM = {
  enabled: true,
  title: 'Реєстрація на пустош',
  description: 'Заповни заявку для свого регіону. Консул або офіцер побачить її у таблиці регіону.',
  shifts: ['shift1', 'shift2'],
  requireCaptain: false,
  allowExtraTroop: true
};

export function shiftLabel(shift = '') {
  const labels = {
    shift1: 'Зміна 1',
    shift2: 'Зміна 2',
    shift3: 'Зміна 3',
    shift4: 'Зміна 4',
    both: 'Обидві'
  };
  return labels[shift] || '—';
}

export function troopLabel(type = '') {
  const labels = {
    fighter: 'Бійці',
    rider: 'Наїзники',
    shooter: 'Стрільці'
  };
  return labels[type] || '—';
}

export function normalizeRegion(region) {
  return trim(region).replace(/[^0-9]/g, '');
}

export function readRegionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return normalizeRegion(params.get('region') || params.get('r') || '');
}

export function canManageRegion(profile = {}, region = '') {
  const role = normalizeUserRole(profile?.role || 'player');
  if (role === 'admin' || role === 'moderator') return true;
  if (!['consul', 'officer'].includes(role)) return false;
  return normalizeRegion(getGameProfile(profile).region) === normalizeRegion(region);
}

export function canOpenRegionTools(profile = {}) {
  return MANAGER_ROLES.includes(normalizeUserRole(profile?.role || 'player'));
}

export function makeRegionPath(region) {
  return `regions/${normalizeRegion(region)}`;
}

function mergeRegionSettings(data = {}) {
  return {
    ...DEFAULT_REGION_FORM,
    ...data,
    shifts: Array.isArray(data.shifts) && data.shifts.length ? data.shifts : DEFAULT_REGION_FORM.shifts
  };
}

async function getFirebaseParts() {
  const firebase = await getFirebase();
  if (!firebase) throw new Error('firebase-not-configured');
  return firebase;
}

export async function getMyRegionContext(user, preferredRegion = '') {
  if (!user) throw new Error('auth-required');
  const profile = await getUserProfile(user.uid);
  const game = getGameProfile(profile || {});
  const ownRegion = normalizeRegion(game.region);
  const requestedRegion = normalizeRegion(preferredRegion);
  const role = normalizeUserRole(profile?.role || 'player');
  const region = requestedRegion && ['admin', 'moderator'].includes(role) ? requestedRegion : ownRegion;
  if (!profile || !region) throw new Error('profile-region-required');
  return { profile, game, region };
}

export async function getRegionSettings(region) {
  const { db, firestoreMod } = await getFirebaseParts();
  const safeRegion = normalizeRegion(region);
  if (!safeRegion) throw new Error('region-required');
  const ref = firestoreMod.doc(db, 'regions', safeRegion);
  const snap = await firestoreMod.getDoc(ref);
  return mergeRegionSettings(snap.exists() ? snap.data()?.registrationForm || {} : {});
}

export async function saveRegionSettings(user, region, settings) {
  if (!user) throw new Error('auth-required');
  const { db, firestoreMod } = await getFirebaseParts();
  const profile = await getUserProfile(user.uid);
  const safeRegion = normalizeRegion(region);
  if (!canManageRegion(profile, safeRegion)) throw new Error('region-access-denied');

  const clean = {
    enabled: Boolean(settings.enabled),
    title: trim(settings.title) || DEFAULT_REGION_FORM.title,
    description: trim(settings.description) || DEFAULT_REGION_FORM.description,
    shifts: Array.isArray(settings.shifts) && settings.shifts.length ? settings.shifts : DEFAULT_REGION_FORM.shifts,
    requireCaptain: Boolean(settings.requireCaptain),
    allowExtraTroop: Boolean(settings.allowExtraTroop),
    updatedAt: firestoreMod.serverTimestamp(),
    updatedBy: user.uid
  };

  await firestoreMod.setDoc(firestoreMod.doc(db, 'regions', safeRegion), {
    region: safeRegion,
    registrationForm: {
      ...clean,
      updatedByEmail: firestoreMod.deleteField()
    },
    updatedAt: clean.updatedAt,
    updatedBy: user.uid
  }, { merge: true });

  return clean;
}

function numberValue(value) {
  return Number(String(value || '').replace(/[^0-9]/g, '')) || 0;
}

function normalizeRegistration(values = {}, user = null, profile = {}, region = '') {
  const game = getGameProfile(profile || {});
  const shift = trim(values.shift || '');
  const extraEnabled = Boolean(values.extraEnabled);
  const publicLink = Boolean(values.publicLink);
  const role = normalizeUserRole(profile?.role || 'player');

  return {
    uid: user?.uid || '',
    displayName: user?.displayName || profile?.displayName || '',
    photoURL: user?.photoURL || profile?.photoURL || '',
    nickname: trim(values.nickname || game.nickname),
    region: normalizeRegion(region || values.region || game.region),
    alliance: toUpper(values.alliance || game.alliance),
    rank: trim(values.rank || game.rank).toLowerCase(),
    shk: trim(values.shk || game.shk),
    readyToJoin: Boolean(values.readyToJoin),
    readyToAttack: Boolean(values.readyToAttack),
    captainReady: Boolean(values.captainReady),
    shift,
    shiftLabel: shiftLabel(shift),
    troopType: trim(values.troopType),
    troopLabel: troopLabel(values.troopType),
    tier: trim(values.tier || 'T10').toUpperCase(),
    marchSize: numberValue(values.marchSize),
    rallySize: numberValue(values.rallySize),
    comment: trim(values.comment),
    extraEnabled,
    extraTroopType: extraEnabled ? trim(values.extraTroopType) : '',
    extraTier: extraEnabled ? trim(values.extraTier || '').toUpperCase() : '',
    extraMarchSize: extraEnabled ? numberValue(values.extraMarchSize) : 0,
    role,
    roleLabel: roleLabel(role),
    profileUpdatedAt: profile?.updatedAt || null,
    publicLink,
    createdByAuth: Boolean(user?.uid),
    source: publicLink && !user?.uid ? 'public-link' : 'account'
  };
}

function validateRegistration(data = {}) {
  if (!data.region || !data.nickname || !data.alliance || !data.shift || !data.troopType || !data.tier) {
    throw new Error('registration-invalid');
  }
}

export async function saveWastelandRegistration(user, values, regionOverride = '') {
  const { db, firestoreMod } = await getFirebaseParts();
  const safeRegion = normalizeRegion(regionOverride);
  let profile = null;
  let region = safeRegion;

  if (user && safeRegion) {
    profile = await getUserProfile(user.uid);
    region = safeRegion;
  } else if (user) {
    const context = await getMyRegionContext(user);
    profile = context.profile;
    region = context.region;
  }

  if (!region) throw new Error('region-required');
  const settings = await getRegionSettings(region);
  if (!settings.enabled) throw new Error('region-form-disabled');

  const data = normalizeRegistration({ ...values, region, publicLink: Boolean(safeRegion) }, user, profile, region);
  validateRegistration(data);

  const now = firestoreMod.serverTimestamp();
  const collectionRef = firestoreMod.collection(db, 'regions', region, 'wastelandRegistrations');
  const payload = { ...data, updatedAt: now, submittedAt: now };

  if (user?.uid) {
    await firestoreMod.setDoc(firestoreMod.doc(db, 'regions', region, 'wastelandRegistrations', user.uid), payload, { merge: true });
  } else {
    await firestoreMod.addDoc(collectionRef, payload);
  }

  return data;
}

export async function getMyWastelandRegistration(user, regionOverride = '') {
  if (!user) return null;
  const { db, firestoreMod } = await getFirebaseParts();
  const safeRegion = normalizeRegion(regionOverride);
  const region = safeRegion || (await getMyRegionContext(user)).region;
  const ref = firestoreMod.doc(db, 'regions', region, 'wastelandRegistrations', user.uid);
  const snap = await firestoreMod.getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

function playerToRegionRow(row = {}) {
  return {
    id: row.uid || row.id || '',
    uid: row.uid || row.id || '',
    nickname: row.nickname || row.gameNick || '',
    region: normalizeRegion(row.region),
    alliance: toUpper(row.alliance),
    rank: trim(row.rank).toLowerCase(),
    shk: trim(row.shk),
    role: normalizeUserRole(row.role || 'player'),
    roleLabel: row.roleLabel || roleLabel(row.role || 'player'),
    source: 'profile',
    rowType: 'Профіль',
    updatedAt: row.updatedAt || row.createdAt || null
  };
}

function mergeRows(players = [], registrations = []) {
  const map = new Map();
  players.forEach(player => {
    const key = player.uid || player.id || `profile-${map.size}`;
    map.set(key, playerToRegionRow(player));
  });

  registrations.forEach(registration => {
    const key = registration.uid || registration.id;
    const base = map.get(key) || {};
    map.set(key, {
      ...base,
      ...registration,
      id: registration.id || key,
      rowType: registration.source === 'public-link' ? 'Заявка з посилання' : 'Заявка',
      roleLabel: registration.roleLabel || base.roleLabel || roleLabel(registration.role || base.role || 'player')
    });
  });

  return [...map.values()].sort((a, b) => String(a.nickname || '').localeCompare(String(b.nickname || ''), 'uk'));
}

export async function listRegionRegistrations(user, regionOverride = '') {
  const { db, firestoreMod } = await getFirebaseParts();
  const { profile, region } = await getMyRegionContext(user, regionOverride);
  const settings = await getRegionSettings(region);

  const [playersSnap, registrationsSnap] = await Promise.all([
    firestoreMod.getDocs(firestoreMod.collection(db, 'regions', region, 'players')).catch(() => ({ docs: [] })),
    firestoreMod.getDocs(firestoreMod.collection(db, 'regions', region, 'wastelandRegistrations')).catch(() => ({ docs: [] }))
  ]);

  const players = playersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const registrations = registrationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return { profile, region, settings, rows: mergeRows(players, registrations) };
}

export function regionRegistrationToPlayer(row = {}) {
  return {
    name: row.nickname || '',
    alliance: row.alliance || '',
    role: row.troopLabel || troopLabel(row.troopType),
    tier: row.tier || '',
    march: row.marchSize || 0,
    rally: row.rallySize || 0,
    captainReady: row.captainReady ? 'Так' : 'Ні',
    shiftLabel: row.shiftLabel || shiftLabel(row.shift),
    placement: 'Не призначено'
  };
}

export { formatUserDate, timestampToMs };
