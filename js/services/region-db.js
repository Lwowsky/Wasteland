import { getFirebase } from './firebase-service.js';
import {
  getUserProfile,
  getFarmById,
  getGameProfile,
  getUserFarms,
  normalizeUserRole,
  roleLabel,
  formatUserDate,
  timestampToMs
} from './user-db.js';

const trim = value => String(value ?? '').trim();
const toUpper = value => trim(value).toUpperCase();
const MANAGER_ROLES = ['admin', 'moderator', 'consul', 'officer'];
const OWNER_EMAILS = ['vovapotaychuk@gmail.com'];
const isOwnerEmail = email => OWNER_EMAILS.includes(String(email || '').trim().toLowerCase());
const DAY_MS = 24 * 60 * 60 * 1000;
function serviceT(key, fallback) {
  return globalThis.window?.WKD_t ? globalThis.window.WKD_t(key) : fallback;
}
function serviceLocale() {
  const lang = globalThis.window?.WKD_CURRENT_LANG || globalThis.document?.documentElement?.lang || globalThis.navigator?.language || 'en';
  const map = { uk: 'uk-UA', en: 'en-US', ru: 'ru-RU', pl: 'pl-PL', de: 'de-DE', ja: 'ja-JP', zh: 'zh-CN', ko: 'ko-KR', vi: 'vi-VN', ar: 'ar' };
  return map[String(lang).toLowerCase()] || lang || 'en-US';
}
const WASTELAND_PERIOD_MS = 14 * DAY_MS;
const WASTELAND_DURATION_MS = DAY_MS;
const DEFAULT_EVENT_ANCHOR_MS = Date.UTC(2026, 4, 30, 10, 0, 0); // Saturday 19:00 JST

export const DEFAULT_REGION_FORM = {
  enabled: false,
  title: 'Реєстрація на пустош',
  description: 'Заповни заявку для свого регіону. Консул або офіцер побачить її у таблиці регіону.',
  shifts: ['shift1', 'shift2'],
  requireCaptain: false,
  allowExtraTroop: true,
  minTier: 'T10',
  customTroopTypes: [],
  customFields: [],
  customShifts: [],
  closeRule: 'hoursBeforeEvent',
  closeHours: 24,
  autoOpenEnabled: true,
  autoOpenDay: 5,
  autoOpenTime: '00:00',
  rotationEnabled: false,
  rotationLoop: true,
  rotationActiveIndex: 0,
  rotationAlliances: []
};

export const DEFAULT_SHIFT_OPTIONS = [
  { id: 'shift1', labelKey: 'shift.shift1', label: 'Зміна 1' },
  { id: 'shift2', labelKey: 'shift.shift2', label: 'Зміна 2' },
  { id: 'shift3', labelKey: 'shift.shift3', label: 'Зміна 3' },
  { id: 'shift4', labelKey: 'shift.shift4', label: 'Зміна 4' },
  { id: 'both', labelKey: 'shift.both', label: 'Обидві' }
];

export function shiftLabel(shift = '', settings = {}) {
  const id = trim(shift);
  const basic = DEFAULT_SHIFT_OPTIONS.find(item => item.id === id);
  if (basic) return serviceT(basic.labelKey, basic.label);
  const custom = Array.isArray(settings.customShifts)
    ? settings.customShifts.find(item => item.id === id)
    : null;
  return custom?.label || id || '—';
}

export function troopLabel(type = '', settings = {}) {
  const labels = {
    fighter: serviceT('troop.fighter', 'Бійці'),
    rider: serviceT('troop.rider', 'Наїзники'),
    shooter: serviceT('troop.shooter', 'Стрільці')
  };
  const custom = Array.isArray(settings.customTroopTypes)
    ? settings.customTroopTypes.find(item => item.id === type || item.label === type)
    : null;
  return labels[type] || custom?.label || type || '—';
}


function bestRegionGame(profile = {}) {
  const main = getGameProfile(profile || {});
  if (main.region) return main;
  const active = getFarmById(profile || {}, profile?.activeFarmId || 'main');
  if (active?.region) return active;
  return getUserFarms(profile || {}).find(farm => farm.region) || main;
}

function troopTypeToPlayerRole(type = '') {
  const troopType = trim(type).toLowerCase();
  if (troopType === 'fighter') return 'Fighter';
  if (troopType === 'rider') return 'Rider';
  if (troopType === 'shooter') return 'Shooter';
  return '';
}

const TIER_LIST = Array.from({ length: 14 }, (_, index) => `T${14 - index}`);
function tierNumber(value = '') {
  return Number(String(value).replace(/[^0-9]/g, '')) || 1;
}
function normalizeTier(value = 'T10') {
  const tier = String(value || 'T10').trim().toUpperCase();
  return TIER_LIST.includes(tier) ? tier : 'T10';
}
function makeCustomId(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ_-]+/giu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || `custom-${Date.now()}`;
}
function normalizeCustomTroops(items = []) {
  return (Array.isArray(items) ? items : [])
    .map(item => {
      const label = trim(typeof item === 'string' ? item : item.label);
      const id = makeCustomId(typeof item === 'string' ? item : (item.id || label));
      return label ? { id, label } : null;
    })
    .filter(Boolean)
    .filter((item, index, arr) => arr.findIndex(other => other.id === item.id) === index)
    .slice(0, 12);
}
function normalizeCustomFields(items = []) {
  return (Array.isArray(items) ? items : [])
    .map(item => {
      const label = trim(item.label || item.name || item.id);
      const id = makeCustomId(item.id || label);
      const type = item.type === 'checkbox' ? 'checkbox' : 'text';
      return label ? { id, label, type } : null;
    })
    .filter(Boolean)
    .filter((item, index, arr) => arr.findIndex(other => other.id === item.id) === index)
    .slice(0, 20);
}
function normalizeCustomShifts(items = []) {
  const defaultIds = new Set(DEFAULT_SHIFT_OPTIONS.map(item => item.id));
  return (Array.isArray(items) ? items : [])
    .map(item => {
      const label = trim(typeof item === 'string' ? item : item.label);
      const id = makeCustomId(typeof item === 'string' ? item : (item.id || label));
      return label && !defaultIds.has(id) ? { id, label } : null;
    })
    .filter(Boolean)
    .filter((item, index, arr) => arr.findIndex(other => other.id === item.id) === index)
    .slice(0, 12);
}
export function getAllowedShifts(settings = {}) {
  const custom = normalizeCustomShifts(settings.customShifts);
  return [...DEFAULT_SHIFT_OPTIONS, ...custom];
}
function normalizeShiftValues(values = [], customShifts = []) {
  const allowed = new Set([...DEFAULT_SHIFT_OPTIONS, ...customShifts].map(item => item.id));
  const shifts = (Array.isArray(values) ? values : [])
    .map(value => trim(value))
    .filter(value => allowed.has(value))
    .filter((value, index, arr) => arr.indexOf(value) === index);
  return shifts.length ? shifts : DEFAULT_REGION_FORM.shifts;
}
function normalizeRotationAlliances(items = []) {
  return (Array.isArray(items) ? items : [])
    .map(item => {
      const tag = normalizeAllianceTag(typeof item === 'string' ? item : (item.tag || item.id));
      const name = trim(typeof item === 'string' ? '' : item.name);
      return tag ? { tag, name } : null;
    })
    .filter(Boolean)
    .filter((item, index, arr) => arr.findIndex(other => other.tag === item.tag) === index)
    .slice(0, 40);
}

function normalizeShortLinkCode(value = '') {
  return trim(value).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 36);
}
function makeShortLinkCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let code = '';
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(12);
    cryptoObj.getRandomValues(bytes);
    for (const byte of bytes) code += alphabet[byte % alphabet.length];
  } else {
    for (let index = 0; index < 12; index += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}
export function getAllowedTiers(settings = {}) {
  const minTier = normalizeTier(settings.minTier || DEFAULT_REGION_FORM.minTier);
  const min = tierNumber(minTier);
  return TIER_LIST.filter(tier => tierNumber(tier) >= min);
}

export function normalizeRegion(region) {
  return trim(region).replace(/[^0-9]/g, '');
}

export function readRegionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return normalizeRegion(params.get('region') || params.get('r') || '');
}

export function canManageRegion(profile = {}, region = '', actor = null) {
  const role = normalizeUserRole(profile?.role || 'player');
  if (isOwnerEmail(actor?.email || profile?.email)) return true;
  if (role === 'admin' || role === 'moderator') return true;
  if (!['consul', 'officer'].includes(role)) return false;
  return normalizeRegion(bestRegionGame(profile).region) === normalizeRegion(region);
}

export function canDeleteRegionRegistration(profile = {}, region = '', actor = null) {
  const role = normalizeUserRole(profile?.role || 'player');
  if (isOwnerEmail(actor?.email || profile?.email)) return true;
  if (role === 'admin' || role === 'moderator') return true;
  if (role !== 'consul') return false;
  return normalizeRegion(bestRegionGame(profile).region) === normalizeRegion(region);
}

export function canOpenRegionTools(profile = {}) {
  return MANAGER_ROLES.includes(normalizeUserRole(profile?.role || 'player'));
}

export function canViewAnyRegion(profile = {}, actor = null) {
  return isOwnerEmail(actor?.email || profile?.email) || ['admin', 'moderator'].includes(normalizeUserRole(profile?.role || 'player'));
}

export function makeRegionPath(region) {
  return `regions/${normalizeRegion(region)}`;
}

export function getNextWastelandStart(fromMs = Date.now(), anchorMs = DEFAULT_EVENT_ANCHOR_MS) {
  let start = Number(anchorMs) || DEFAULT_EVENT_ANCHOR_MS;
  const now = Number(fromMs) || Date.now();
  while (start + WASTELAND_DURATION_MS <= now) start += WASTELAND_PERIOD_MS;
  return start;
}

export function computeCloseAtMs(eventStartAtMs, closeRule = 'hoursBeforeEvent', closeHours = 24) {
  const eventMs = Number(eventStartAtMs) || getNextWastelandStart();
  if (closeRule === 'gameResetFridayUtc') {
    const date = new Date(eventMs);
    const daysSinceFriday = (date.getUTCDay() - 5 + 7) % 7;
    date.setUTCDate(date.getUTCDate() - daysSinceFriday);
    date.setUTCHours(0, 0, 0, 0);
    return date.getTime() >= eventMs ? eventMs - DAY_MS : date.getTime();
  }
  const hours = Math.max(1, Math.min(168, Number(closeHours) || 24));
  return eventMs - hours * 60 * 60 * 1000;
}

export function computeOpenAtMs(eventStartAtMs, autoOpenEnabled = true, autoOpenDay = 5, autoOpenTime = '00:00') {
  if (!autoOpenEnabled) return 0;
  const eventMs = Number(eventStartAtMs) || getNextWastelandStart();
  const day = Math.max(0, Math.min(6, Number(autoOpenDay)));
  const [hourRaw, minuteRaw] = String(autoOpenTime || '00:00').split(':');
  const hour = Math.max(0, Math.min(23, Number(hourRaw) || 0));
  const minute = Math.max(0, Math.min(59, Number(minuteRaw) || 0));
  const date = new Date(eventMs);
  const daysSinceTarget = (date.getUTCDay() - day + 7) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceTarget);
  date.setUTCHours(hour, minute, 0, 0);
  if (date.getTime() >= eventMs) date.setUTCDate(date.getUTCDate() - 7);
  return date.getTime();
}

export function makeCycleId(eventStartAtMs = getNextWastelandStart()) {
  return `wasteland-${Number(eventStartAtMs) || Date.now()}`;
}

function formatDateInZone(value, timeZone = undefined, suffix = '') {
  const ms = Number(value) || timestampToMs(value);
  if (!ms) return '—';
  const text = new Intl.DateTimeFormat(serviceLocale(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short'
  }).format(new Date(ms));
  return suffix ? `${text} ${suffix}` : text;
}

export function formatRegionDate(value) {
  return formatDateInZone(value);
}

export function formatUtcDate(value) {
  return formatDateInZone(value, 'UTC');
}

export function formatLocalDate(value) {
  return formatDateInZone(value);
}

export function formatUtcAndLocal(value) {
  return `${serviceT('common.utc', 'UTC')}: ${formatUtcDate(value)} · ${serviceT('region.yourTime', 'Your time')}: ${formatLocalDate(value)}`;
}

export function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(Number(ms) / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const d = serviceT('time.daysShort', 'd');
  const h = serviceT('time.hoursShort', 'h');
  const m = serviceT('time.minutesShort', 'm');
  if (days > 0) return `${days} ${d} ${hours} ${h} ${minutes} ${m}`;
  if (hours > 0) return `${hours} ${h} ${minutes} ${m}`;
  return `${minutes} ${m}`;
}

function mergeRegionSettings(data = {}) {
  const eventStartAtMs = Number(data.eventStartAtMs) || getNextWastelandStart();
  const closeRule = data.closeRule || DEFAULT_REGION_FORM.closeRule;
  const closeHours = Math.max(1, Math.min(168, Number(data.closeHours) || DEFAULT_REGION_FORM.closeHours));
  const closeAtMs = Number(data.closeAtMs) || computeCloseAtMs(eventStartAtMs, closeRule, closeHours);
  const autoOpenEnabled = 'autoOpenEnabled' in data ? Boolean(data.autoOpenEnabled) : DEFAULT_REGION_FORM.autoOpenEnabled;
  const autoOpenDay = Math.max(0, Math.min(6, Number(data.autoOpenDay ?? DEFAULT_REGION_FORM.autoOpenDay)));
  const autoOpenTime = /^\d{2}:\d{2}$/.test(trim(data.autoOpenTime)) ? trim(data.autoOpenTime) : DEFAULT_REGION_FORM.autoOpenTime;
  const openAtMs = Number(data.openAtMs) || computeOpenAtMs(eventStartAtMs, autoOpenEnabled, autoOpenDay, autoOpenTime);
  const rotationAlliances = normalizeRotationAlliances(data.rotationAlliances);
  const rotationActiveIndex = Math.max(0, Math.min(Math.max(0, rotationAlliances.length - 1), Number(data.rotationActiveIndex) || 0));
  const currentCycleId = trim(data.currentCycleId) || makeCycleId(eventStartAtMs);
  const customShifts = normalizeCustomShifts(data.customShifts);
  return {
    ...DEFAULT_REGION_FORM,
    ...data,
    enabled: Boolean(data.enabled),
    hostAlliance: trim(data.hostAlliance),
    governor: trim(data.governor),
    customShifts,
    shifts: normalizeShiftValues(data.shifts, customShifts),
    requireCaptain: false,
    minTier: normalizeTier(data.minTier || DEFAULT_REGION_FORM.minTier),
    customTroopTypes: normalizeCustomTroops(data.customTroopTypes),
    customFields: normalizeCustomFields(data.customFields),
    closeRule,
    closeHours,
    autoOpenEnabled,
    autoOpenDay,
    autoOpenTime,
    openAtMs,
    rotationEnabled: Boolean(settings.rotationEnabled),
    rotationLoop: 'rotationLoop' in settings ? Boolean(settings.rotationLoop) : DEFAULT_REGION_FORM.rotationLoop,
    rotationActiveIndex,
    rotationAlliances,
    eventStartAtMs,
    closeAtMs,
    currentCycleId
  };
}

export function getRegionFormStatus(settings = {}, nowMs = Date.now()) {
  const merged = mergeRegionSettings(settings);
  const closeAtMs = Number(merged.closeAtMs) || computeCloseAtMs(merged.eventStartAtMs, merged.closeRule, merged.closeHours);
  const openAtMs = Number(merged.openAtMs) || computeOpenAtMs(merged.eventStartAtMs, merged.autoOpenEnabled, merged.autoOpenDay, merged.autoOpenTime);
  const eventEndAtMs = Number(merged.eventStartAtMs) + WASTELAND_DURATION_MS;
  const open = Boolean(merged.enabled) && nowMs >= openAtMs && nowMs < closeAtMs && nowMs < eventEndAtMs;
  let reason = 'open';
  if (!merged.enabled) reason = 'disabled';
  else if (nowMs < openAtMs) reason = 'notOpenYet';
  else if (nowMs >= closeAtMs) reason = 'closedByTimer';
  else if (nowMs >= eventEndAtMs) reason = 'eventFinished';
  return { ...merged, open, reason, openAtMs, closeAtMs, eventEndAtMs };
}

async function getFirebaseParts() {
  const firebase = await getFirebase();
  if (!firebase) throw new Error('firebase-not-configured');
  return firebase;
}

export async function getMyRegionContext(user, preferredRegion = '') {
  if (!user) throw new Error('auth-required');
  const profile = await getUserProfile(user.uid);
  const game = bestRegionGame(profile || {});
  const ownRegion = normalizeRegion(game.region);
  const requestedRegion = normalizeRegion(preferredRegion);
  const role = normalizeUserRole(profile?.role || 'player');
  const isOwner = isOwnerEmail(user?.email || profile?.email);
  const region = requestedRegion && (isOwner || ['admin', 'moderator'].includes(role)) ? requestedRegion : ownRegion;
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

async function saveRegionShareLink({ db, firestoreMod }, user, region, settings, forceNew = false) {
  const safeRegion = normalizeRegion(region);
  const privateRef = firestoreMod.doc(db, 'regions', safeRegion, 'privateSettings', 'shortLink');
  const privateSnap = await firestoreMod.getDoc(privateRef).catch(() => null);
  const oldCode = normalizeShortLinkCode(privateSnap?.exists?.() ? privateSnap.data()?.code : '');
  const code = forceNew || !oldCode ? makeShortLinkCode() : oldCode;
  const now = firestoreMod.serverTimestamp();

  if (oldCode && oldCode !== code) {
    await firestoreMod.deleteDoc(firestoreMod.doc(db, 'shortRegionLinks', oldCode)).catch(() => null);
  }

  const payload = {
    code,
    region: safeRegion,
    cycleId: settings.currentCycleId,
    eventStartAtMs: settings.eventStartAtMs,
    closeAtMs: settings.closeAtMs,
    updatedAt: now,
    updatedBy: user.uid
  };

  await firestoreMod.setDoc(firestoreMod.doc(db, 'shortRegionLinks', code), payload);
  await firestoreMod.setDoc(privateRef, { ...payload, createdAt: privateSnap?.exists?.() ? (privateSnap.data()?.createdAt || now) : now }, { merge: true });
  return code;
}

export async function getRegionShareLinkCode(user, region) {
  if (!user) throw new Error('auth-required');
  const firebase = await getFirebaseParts();
  const { db, firestoreMod } = firebase;
  const profile = await getUserProfile(user.uid);
  const safeRegion = normalizeRegion(region);
  if (!canManageRegion(profile, safeRegion, user)) throw new Error('region-access-denied');
  const privateRef = firestoreMod.doc(db, 'regions', safeRegion, 'privateSettings', 'shortLink');
  const snap = await firestoreMod.getDoc(privateRef).catch(() => null);
  const code = normalizeShortLinkCode(snap?.exists?.() ? snap.data()?.code : '');
  if (code) return code;
  const settings = await getRegionSettings(safeRegion);
  return saveRegionShareLink(firebase, user, safeRegion, settings, false);
}

export async function resolveRegionShareLink(codeValue) {
  const { db, firestoreMod } = await getFirebaseParts();
  const code = normalizeShortLinkCode(codeValue);
  if (!code) throw new Error('short-link-required');
  const snap = await firestoreMod.getDoc(firestoreMod.doc(db, 'shortRegionLinks', code));
  if (!snap.exists()) throw new Error('short-link-not-found');
  const data = snap.data() || {};
  const region = normalizeRegion(data.region);
  if (!region) throw new Error('short-link-region-missing');
  const settings = await getRegionSettings(region);
  if (data.cycleId && settings.currentCycleId && data.cycleId !== settings.currentCycleId) {
    throw new Error('short-link-expired');
  }
  return { code, region, settings };
}

export async function saveRegionSettings(user, region, settings) {
  if (!user) throw new Error('auth-required');
  const { db, firestoreMod } = await getFirebaseParts();
  const profile = await getUserProfile(user.uid);
  const safeRegion = normalizeRegion(region);
  if (!canManageRegion(profile, safeRegion, user)) throw new Error('region-access-denied');

  const oldSettings = await getRegionSettings(safeRegion).catch(() => mergeRegionSettings({}));
  const eventStartAtMs = Number(settings.eventStartAtMs) || getNextWastelandStart();
  const closeRule = settings.closeRule || DEFAULT_REGION_FORM.closeRule;
  const closeHours = Math.max(1, Math.min(168, Number(settings.closeHours) || DEFAULT_REGION_FORM.closeHours));
  const closeAtMs = computeCloseAtMs(eventStartAtMs, closeRule, closeHours);
  const autoOpenEnabled = 'autoOpenEnabled' in settings ? Boolean(settings.autoOpenEnabled) : DEFAULT_REGION_FORM.autoOpenEnabled;
  const autoOpenDay = Math.max(0, Math.min(6, Number(settings.autoOpenDay ?? DEFAULT_REGION_FORM.autoOpenDay)));
  const autoOpenTime = /^\d{2}:\d{2}$/.test(trim(settings.autoOpenTime)) ? trim(settings.autoOpenTime) : DEFAULT_REGION_FORM.autoOpenTime;
  const openAtMs = computeOpenAtMs(eventStartAtMs, autoOpenEnabled, autoOpenDay, autoOpenTime);
  const rotationAlliances = normalizeRotationAlliances(settings.rotationAlliances);
  const rotationActiveIndex = Math.max(0, Math.min(Math.max(0, rotationAlliances.length - 1), Number(settings.rotationActiveIndex) || 0));
  const openNewCycle = Boolean(settings.openNewCycle) || (!oldSettings.enabled && Boolean(settings.enabled));
  const currentCycleId = openNewCycle ? makeCycleId(eventStartAtMs) : (oldSettings.currentCycleId || makeCycleId(eventStartAtMs));

  const clean = {
    enabled: Boolean(settings.enabled),
    title: trim(settings.title) || DEFAULT_REGION_FORM.title,
    description: trim(settings.description) || DEFAULT_REGION_FORM.description,
    hostAlliance: (Boolean(settings.rotationEnabled) && rotationAlliances[rotationActiveIndex]) ? rotationAlliances[rotationActiveIndex].tag : trim(settings.hostAlliance),
    governor: trim(settings.governor),
    customShifts: normalizeCustomShifts(settings.customShifts),
    shifts: normalizeShiftValues(settings.shifts, normalizeCustomShifts(settings.customShifts)),
    requireCaptain: false,
    allowExtraTroop: Boolean(settings.allowExtraTroop),
    minTier: normalizeTier(settings.minTier || DEFAULT_REGION_FORM.minTier),
    customTroopTypes: normalizeCustomTroops(settings.customTroopTypes),
    customFields: normalizeCustomFields(settings.customFields),
    closeRule,
    closeHours,
    autoOpenEnabled,
    autoOpenDay,
    autoOpenTime,
    openAtMs,
    rotationEnabled: Boolean(settings.rotationEnabled),
    rotationLoop: 'rotationLoop' in settings ? Boolean(settings.rotationLoop) : DEFAULT_REGION_FORM.rotationLoop,
    rotationActiveIndex,
    rotationAlliances,
    eventStartAtMs,
    closeAtMs,
    currentCycleId,
    openedAtMs: openNewCycle ? Date.now() : (oldSettings.openedAtMs || Date.now()),
    updatedAt: firestoreMod.serverTimestamp(),
    updatedBy: user.uid
  };

  const regionPatch = {
    region: safeRegion,
    registrationForm: clean,
    updatedAt: clean.updatedAt,
    updatedBy: user.uid
  };
  if (openNewCycle) {
    regionPatch.activeTable = {
      cycleId: currentCycleId,
      source: 'new-cycle',
      rowsCount: 0,
      replacedAt: clean.updatedAt,
      replacedBy: user.uid
    };
  }

  await firestoreMod.setDoc(firestoreMod.doc(db, 'regions', safeRegion), regionPatch, { merge: true });

  const shortLinkCode = await saveRegionShareLink({ db, firestoreMod }, user, safeRegion, clean, openNewCycle);
  return { ...clean, shortLinkCode };
}


function normalizeAllianceTag(value = '') {
  return toUpper(value).replace(/[^A-Z0-9_-]/g, '').slice(0, 12);
}

export async function listRegionAlliances(region) {
  const { db, firestoreMod } = await getFirebaseParts();
  const safeRegion = normalizeRegion(region);
  if (!safeRegion) throw new Error('region-required');
  const snapshot = await firestoreMod.getDocs(firestoreMod.collection(db, 'regions', safeRegion, 'alliances'));
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => String(a.tag || a.id).localeCompare(String(b.tag || b.id), 'uk'));
}


export function canManageAllianceColors(profile = {}, region = '', tag = '', actor = null) {
  const role = normalizeUserRole(profile?.role || 'player');
  const game = bestRegionGame(profile || {});
  const sameRegion = normalizeRegion(game.region) === normalizeRegion(region);
  const wanted = normalizeAllianceTag(tag);
  if (isOwnerEmail(actor?.email || profile?.email)) return true;
  if (role === 'admin' || role === 'moderator') return true;
  if (role === 'consul' && sameRegion) return true;
  const rank = trim(game.rank).toLowerCase();
  if (role === 'officer' && sameRegion && toUpper(game.alliance) === wanted && ['p4', 'p5', 'r4', 'r5', '4', '5'].includes(rank)) return true;
  return false;
}

export async function saveRegionAllianceColor(user, region, tagValue, hueValue = null) {
  if (!user) throw new Error('auth-required');
  const { db, firestoreMod } = await getFirebaseParts();
  const profile = await getUserProfile(user.uid);
  const safeRegion = normalizeRegion(region);
  const tag = normalizeAllianceTag(tagValue);
  if (!safeRegion || !tag) throw new Error('alliance-color-required');
  if (!canManageAllianceColors(profile, safeRegion, tag, user)) throw new Error('alliance-color-access');
  const hueNumber = Number(hueValue);
  const hue = Number.isFinite(hueNumber) ? ((Math.round(hueNumber) % 360) + 360) % 360 : null;
  const patch = hue === null
    ? { tag, colorHue: null, colorMode: 'auto', colorUpdatedAt: firestoreMod.serverTimestamp(), colorUpdatedBy: user.uid }
    : { tag, colorHue: hue, colorMode: 'manual', colorUpdatedAt: firestoreMod.serverTimestamp(), colorUpdatedBy: user.uid };
  await firestoreMod.setDoc(firestoreMod.doc(db, 'regions', safeRegion, 'alliances', tag), patch, { merge: true });
  return { id: tag, ...patch, colorHue: hue };
}

export async function saveRegionAlliance(user, region, values = {}) {
  if (!user) throw new Error('auth-required');
  const { db, firestoreMod } = await getFirebaseParts();
  const profile = await getUserProfile(user.uid);
  const safeRegion = normalizeRegion(region);
  if (!canManageRegion(profile, safeRegion, user)) throw new Error('region-access-denied');
  const tag = normalizeAllianceTag(values.tag || values.id);
  if (!tag) throw new Error('alliance-tag-required');
  const ref = firestoreMod.doc(db, 'regions', safeRegion, 'alliances', tag);
  const old = await firestoreMod.getDoc(ref);
  const now = firestoreMod.serverTimestamp();
  const clean = {
    tag,
    name: trim(values.name || tag),
    note: trim(values.note),
    updatedAt: now,
    updatedBy: user.uid
  };
  if ('colorHue' in values) {
    if (values.colorHue === null || values.colorHue === '' || values.colorHue === undefined) {
      clean.colorHue = null;
    } else {
      const hue = Number(values.colorHue);
      clean.colorHue = Number.isFinite(hue) ? ((Math.round(hue) % 360) + 360) % 360 : null;
    }
    clean.colorMode = clean.colorHue === null ? 'auto' : 'manual';
    clean.colorUpdatedAt = now;
    clean.colorUpdatedBy = user.uid;
  }
  if (!old.exists()) clean.createdAt = now;
  await firestoreMod.setDoc(ref, clean, { merge: true });
  return { id: tag, ...clean };
}

export async function deleteRegionAlliance(user, region, allianceId) {
  if (!user) throw new Error('auth-required');
  const { db, firestoreMod } = await getFirebaseParts();
  const profile = await getUserProfile(user.uid);
  const safeRegion = normalizeRegion(region);
  if (!canManageRegion(profile, safeRegion, user)) throw new Error('region-access-denied');
  const tag = normalizeAllianceTag(allianceId);
  if (!tag) throw new Error('alliance-tag-required');
  await firestoreMod.deleteDoc(firestoreMod.doc(db, 'regions', safeRegion, 'alliances', tag));
}

function numberValue(value) {
  return Number(String(value || '').replace(/[^0-9]/g, '')) || 0;
}

function lairLevelValue(value) {
  const n = numberValue(value);
  return n ? Math.max(1, Math.min(70, n)) : 0;
}

function normalizeExtraSquads(values = {}, settings = {}) {
  const allowedTroops = new Set(['fighter', 'rider', 'shooter', ...normalizeCustomTroops(settings.customTroopTypes).map(item => item.id)]);
  const allowedTiers = new Set(getAllowedTiers(settings));
  const source = Array.isArray(values.extraSquads)
    ? values.extraSquads
    : (values.extraEnabled && values.extraTroopType && values.extraTier ? [{ troopType: values.extraTroopType, tier: values.extraTier }] : []);
  const seen = new Set();
  return source
    .map(item => ({
      troopType: trim(item?.troopType),
      troopLabel: troopLabel(trim(item?.troopType), settings),
      tier: trim(item?.tier || 'T10').toUpperCase()
    }))
    .filter(item => item.troopType && item.tier && !seen.has(item.troopType) && seen.add(item.troopType))
    .filter(item => allowedTroops.has(item.troopType) && allowedTiers.has(item.tier));
}

function normalizeRegistration(values = {}, user = null, profile = {}, region = '', settings = {}) {
  const farmId = trim(values.farmId || 'main') || 'main';
  const game = getFarmById(profile || {}, farmId) || getGameProfile(profile || {});
  const shift = trim(values.shift || '');
  const extraSquads = normalizeExtraSquads(values, settings);
  const firstExtra = extraSquads[0] || {};
  const extraEnabled = Boolean(extraSquads.length);
  const publicLink = Boolean(values.publicLink);
  const role = normalizeUserRole(profile?.role || 'player');
  const status = getRegionFormStatus(settings);

  return {
    uid: user?.uid || '',
    farmId,
    ownerUid: user?.uid || '',
    displayName: user?.displayName || profile?.displayName || '',
    photoURL: user?.photoURL || profile?.photoURL || '',
    nickname: trim(values.nickname || game.nickname),
    region: normalizeRegion(region || values.region || game.region),
    alliance: toUpper(values.alliance || game.alliance),
    rank: trim(values.rank || game.rank).toLowerCase(),
    shk: trim(values.shk || game.shk),
    readyToJoin: values.readyToJoin !== false,
    readyToAttack: Boolean(values.readyToAttack),
    captainReady: Boolean(values.captainReady),
    shift,
    shiftLabel: shiftLabel(shift, status),
    troopType: trim(values.troopType),
    troopLabel: troopLabel(values.troopType, status),
    tier: trim(values.tier || 'T10').toUpperCase(),
    lairLevel: lairLevelValue(values.lairLevel),
    marchSize: numberValue(values.marchSize),
    rallySize: numberValue(values.rallySize),
    comment: trim(values.comment),
    extraEnabled,
    extraSquads,
    extraTroopType: firstExtra.troopType || '',
    extraTroopLabel: firstExtra.troopLabel || '',
    extraTier: firstExtra.tier || '',
    extraMarchSize: 0,
    customFields: Object.fromEntries(Object.entries(values.customFields || {}).map(([key, value]) => [makeCustomId(key), typeof value === 'boolean' ? value : trim(value)])),
    role,
    roleLabel: roleLabel(role),
    profileUpdatedAt: profile?.updatedAt || null,
    publicLink,
    createdByAuth: Boolean(user?.uid),
    source: publicLink && !user?.uid ? 'public-link' : 'account',
    cycleId: status.currentCycleId,
    eventStartAtMs: status.eventStartAtMs,
    closeAtMs: status.closeAtMs
  };
}

function validateRegistration(data = {}, settings = {}) {
  const allowedTroops = ['fighter', 'rider', 'shooter', ...normalizeCustomTroops(settings.customTroopTypes).map(item => item.id)];
  if (!data.region || !data.nickname || !data.alliance || !data.shift || !data.troopType || !data.tier) {
    throw new Error('registration-invalid');
  }
  const allowedShifts = normalizeShiftValues(settings.shifts, normalizeCustomShifts(settings.customShifts));
  if (!allowedTroops.includes(data.troopType)) throw new Error('registration-invalid-troop');
  if (!allowedShifts.includes(data.shift)) throw new Error('registration-invalid-shift');
  if (!getAllowedTiers(settings).includes(data.tier)) throw new Error('registration-invalid-tier');
  if (data.extraEnabled) {
    if (!Array.isArray(data.extraSquads) || !data.extraSquads.length) throw new Error('registration-invalid-extra-troop');
    data.extraSquads.forEach(item => {
      if (!allowedTroops.includes(item.troopType)) throw new Error('registration-invalid-extra-troop');
      if (!getAllowedTiers(settings).includes(item.tier)) throw new Error('registration-invalid-extra-tier');
    });
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
  const status = getRegionFormStatus(settings);
  if (!status.open) throw new Error('region-form-closed');

  const data = normalizeRegistration({ ...values, region, publicLink: Boolean(safeRegion) }, user, profile, region, status);
  validateRegistration(data, status);

  const now = firestoreMod.serverTimestamp();
  const collectionRef = firestoreMod.collection(db, 'regions', region, 'wastelandRegistrations');
  const payload = { ...data, updatedAt: now, submittedAt: now };

  if (user?.uid) {
    const docId = data.farmId && data.farmId !== 'main' ? `${user.uid}_${data.farmId}` : user.uid;
    const docRef = firestoreMod.doc(db, 'regions', region, 'wastelandRegistrations', docId);
    const existing = await firestoreMod.getDoc(docRef);
    const managerCanEdit = canManageRegion(profile, region, user);
    if (existing.exists() && existing.data()?.cycleId === status.currentCycleId && !managerCanEdit) {
      throw new Error('registration-already-submitted');
    }
    await firestoreMod.setDoc(docRef, payload, { merge: true });
  } else {
    await firestoreMod.addDoc(collectionRef, payload);
  }

  return data;
}

export async function getMyWastelandRegistration(user, regionOverride = '', farmId = 'main') {
  if (!user) return null;
  const { db, firestoreMod } = await getFirebaseParts();
  const safeRegion = normalizeRegion(regionOverride);
  const region = safeRegion || (await getMyRegionContext(user)).region;
  const settings = await getRegionSettings(region);
  const activeCycle = settings.currentCycleId;
  const safeFarmId = trim(farmId || 'main') || 'main';
  const docId = safeFarmId !== 'main' ? `${user.uid}_${safeFarmId}` : user.uid;
  const ref = firestoreMod.doc(db, 'regions', region, 'wastelandRegistrations', docId);
  const snap = await firestoreMod.getDoc(ref);
  if (!snap.exists()) return null;
  const data = { id: snap.id, ...snap.data() };
  return !activeCycle || data.cycleId === activeCycle ? data : null;
}

function playerToRegionRow(row = {}) {
  const info = row.wastelandProfile || getGameProfile(row).wastelandProfile || {};
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
    troopType: trim(info.troopType),
    troopLabel: troopLabel(info.troopType),
    tier: trim(info.tier).toUpperCase(),
    lairLevel: lairLevelValue(info.lairLevel),
    marchSize: numberValue(info.marchSize),
    rallySize: numberValue(info.rallySize),
    captainReady: Boolean(info.captainReady),
    readyToJoin: Boolean(info.readyToJoin),
    readyToAttack: Boolean(info.readyToAttack),
    shift: trim(info.shift),
    extraEnabled: Boolean(normalizeExtraSquads(info).length),
    extraSquads: normalizeExtraSquads(info),
    extraTroopType: normalizeExtraSquads(info)[0]?.troopType || '',
    extraTroopLabel: normalizeExtraSquads(info)[0]?.troopLabel || '',
    extraTier: normalizeExtraSquads(info)[0]?.tier || '',
    extraMarchSize: 0,
    shiftLabel: shiftLabel(info.shift),
    source: 'profile',
    rowType: 'Профіль',
    updatedAt: row.updatedAt || row.createdAt || null
  };
}

function mergeRows(players = [], registrations = [], activeCycle = '') {
  const map = new Map();
  players.forEach(player => {
    const key = player.uid || player.id || `profile-${map.size}`;
    map.set(key, playerToRegionRow(player));
  });

  registrations
    .filter(registration => !activeCycle || registration.cycleId === activeCycle)
    .forEach(registration => {
      const key = registration.uid && registration.farmId ? `${registration.uid}_${registration.farmId}` : (registration.uid || registration.id);
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
  const status = getRegionFormStatus(settings);

  const registrationsRef = firestoreMod.collection(db, 'regions', region, 'wastelandRegistrations');
  const registrationsQuery = status.currentCycleId
    ? firestoreMod.query(registrationsRef, firestoreMod.where('cycleId', '==', status.currentCycleId))
    : registrationsRef;
  const [playersSnap, registrationsSnap] = await Promise.all([
    firestoreMod.getDocs(firestoreMod.collection(db, 'regions', region, 'players')).catch(() => ({ docs: [] })),
    firestoreMod.getDocs(registrationsQuery).catch(() => ({ docs: [] }))
  ]);

  const players = playersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const game = bestRegionGame(profile || {});
  if (normalizeRegion(game.region) === region && game.nickname && !players.some(player => player.uid === profile.uid || player.id === profile.uid)) {
    players.push({ ...profile, ...game, uid: profile.uid, nickname: game.nickname, source: 'profile' });
  }
  const registrations = registrationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return { profile, region, settings: status, rows: mergeRows(players, registrations, status.currentCycleId) };
}

export async function deleteRegionRegistrations(user, region, registrationIds = []) {
  if (!user) throw new Error('auth-required');
  const ids = (Array.isArray(registrationIds) ? registrationIds : [registrationIds])
    .map(id => trim(id))
    .filter(Boolean);
  if (!ids.length) return { count: 0 };

  const { db, firestoreMod } = await getFirebaseParts();
  const profile = await getUserProfile(user.uid);
  const safeRegion = normalizeRegion(region || getGameProfile(profile || {}).region);
  if (!safeRegion) throw new Error('region-required');
  if (!canDeleteRegionRegistration(profile, safeRegion, user)) throw new Error('region-delete-access-denied');

  for (let index = 0; index < ids.length; index += 450) {
    const batch = firestoreMod.writeBatch(db);
    ids.slice(index, index + 450).forEach(id => {
      batch.delete(firestoreMod.doc(db, 'regions', safeRegion, 'wastelandRegistrations', id));
    });
    await batch.commit();
  }

  await firestoreMod.setDoc(firestoreMod.doc(db, 'regions', safeRegion), {
    region: safeRegion,
    updatedAt: firestoreMod.serverTimestamp(),
    updatedBy: user.uid,
    lastRegistrationDeleteAt: firestoreMod.serverTimestamp(),
    lastRegistrationDeleteBy: user.uid
  }, { merge: true }).catch(() => null);

  return { count: ids.length, region: safeRegion };
}


export async function updateRegionRegistration(user, region, registrationId, values = {}) {
  if (!user) throw new Error('auth-required');
  const id = trim(registrationId);
  if (!id) throw new Error('region-update-registration-only');

  const { db, firestoreMod } = await getFirebaseParts();
  const profile = await getUserProfile(user.uid);
  const safeRegion = normalizeRegion(region || getGameProfile(profile || {}).region);
  if (!safeRegion) throw new Error('region-required');
  if (!canManageRegion(profile, safeRegion, user)) throw new Error('region-update-access-denied');

  const troopType = normalizePlayerTroopType(values.role || values.troopType);
  const shift = trim(values.shift || 'both');
  const clean = {
    nickname: trim(values.name || values.nickname),
    alliance: toUpper(values.alliance),
    troopType,
    troopLabel: troopLabel(troopType),
    tier: normalizeTier(values.tier || 'T10'),
    lairLevel: lairLevelValue(values.lairLevel || values.denLevel),
    captureRegion: /^(1|true|yes|так|да|y)$/i.test(String(values.lair || values.captureRegion || '').trim()),
    marchSize: numberValue(values.march || values.marchSize),
    rallySize: numberValue(values.rally || values.rallySize),
    captainReady: Boolean(values.captain || values.captainReady),
    shift,
    shiftLabel: shiftLabel(shift),
    updatedAt: firestoreMod.serverTimestamp(),
    updatedBy: user.uid,
    manuallyEdited: true
  };

  if (!clean.nickname || !clean.alliance || !clean.troopType || !clean.shift) {
    throw new Error('registration-invalid');
  }

  await firestoreMod.setDoc(
    firestoreMod.doc(db, 'regions', safeRegion, 'wastelandRegistrations', id),
    clean,
    { merge: true }
  );

  await firestoreMod.setDoc(firestoreMod.doc(db, 'regions', safeRegion), {
    region: safeRegion,
    updatedAt: firestoreMod.serverTimestamp(),
    updatedBy: user.uid,
    lastRegistrationUpdateAt: firestoreMod.serverTimestamp(),
    lastRegistrationUpdateBy: user.uid
  }, { merge: true }).catch(() => null);

  return { region: safeRegion, id, data: clean };
}

function normalizePlayerTroopType(value = '') {
  const text = trim(value).toLowerCase();
  if (/fighter|fighters|infantry|бійц|боєц|боец|бойц|воїн|воин|wojownik|wojown|kämpfer|kaempfer|ファイター|战士|戰士|전사|đấu sĩ|dau si|مقاتل|المقاتل/.test(text)) return 'fighter';
  if (/rider|riders|cavalry|наїз|наезд|ездник|кавал|jeźdź|jezdz|reiter|ライダー|骑兵|騎兵|기병|kỵ sĩ|ky si|فارس|فرسان|الفرسان/.test(text)) return 'rider';
  if (/shooter|shooters|стріл|стрел|shoot|marksman|strzel|schütz|schuetz|シューター|射手|사수|xạ thủ|xa thu|رامي|الرماة/.test(text)) return 'shooter';
  return text || 'fighter';
}

function importDocId(userId = '', player = {}, index = 0) {
  const base = `${player.name || player.nickname || 'player'}-${player.alliance || ''}-${index}`
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ_-]+/giu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `row-${index + 1}`;
  return `local_${userId}_${base}`;
}

function playerToImportedRegistration(player = {}, user = {}, profile = {}, region = '', settings = {}) {
  const troopType = normalizePlayerTroopType(player.role || player.troopType);
  const shift = trim(player.shift || 'both');
  const nowMs = Date.now();
  return {
    uid: '',
    ownerUid: user.uid,
    importedBy: user.uid,
    displayName: user.displayName || profile.displayName || '',
    nickname: trim(player.name || player.nickname),
    region,
    alliance: toUpper(player.alliance),
    rank: '',
    shk: '',
    readyToJoin: true,
    readyToAttack: false,
    captainReady: Boolean(player.captain || player.captainReady),
    shift,
    shiftLabel: shiftLabel(shift),
    troopType,
    troopLabel: troopLabel(troopType, settings),
    tier: trim(player.tier).toUpperCase(),
    lairLevel: lairLevelValue(player.lairLevel || player.denLevel),
    captureRegion: /^(1|true|yes|так|да|y)$/i.test(String(player.lair || player.captureRegion || '').trim()),
    marchSize: numberValue(player.march || player.marchSize),
    rallySize: numberValue(player.rally || player.rallySize),
    comment: 'Перенесено з локального списку',
    extraEnabled: false,
    extraSquads: [],
    extraTroopType: '',
    extraTroopLabel: '',
    extraTier: '',
    extraMarchSize: 0,
    customFields: {},
    role: normalizeUserRole(profile?.role || 'player'),
    roleLabel: roleLabel(profile?.role || 'player'),
    publicLink: false,
    createdByAuth: true,
    source: 'local-import',
    rowType: 'Локальний імпорт',
    importedFromLocal: true,
    cycleId: settings.currentCycleId,
    eventStartAtMs: settings.eventStartAtMs,
    closeAtMs: settings.closeAtMs,
    importedAtMs: nowMs
  };
}

export async function importLocalPlayersToRegion(user, players = []) {
  if (!user) throw new Error('auth-required');
  const { db, firestoreMod } = await getFirebaseParts();
  const { profile, region } = await getMyRegionContext(user);
  if (!canManageRegion(profile, region, user)) throw new Error('region-access-denied');
  const settings = await getRegionSettings(region).then(getRegionFormStatus);
  const rows = (Array.isArray(players) ? players : [])
    .filter(player => trim(player.name || player.nickname) && trim(player.alliance))
    .map((player, index) => ({ id: importDocId(user.uid, player, index), data: playerToImportedRegistration(player, user, profile, region, settings) }));

  const collectionRef = firestoreMod.collection(db, 'regions', region, 'wastelandRegistrations');
  const activeCycle = settings.currentCycleId;
  const currentCycleQuery = activeCycle
    ? firestoreMod.query(collectionRef, firestoreMod.where('cycleId', '==', activeCycle))
    : collectionRef;
  const existingSnap = await firestoreMod.getDocs(currentCycleQuery).catch(() => ({ docs: [] }));
  const oldCycleRows = existingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const now = firestoreMod.serverTimestamp();
  const writes = [
    ...oldCycleRows.map(row => ({ type: 'delete', id: row.id })),
    ...rows.map(row => ({ type: 'set', id: row.id, data: row.data }))
  ];

  for (let index = 0; index < writes.length; index += 450) {
    const batch = firestoreMod.writeBatch(db);
    writes.slice(index, index + 450).forEach(write => {
      const ref = firestoreMod.doc(db, 'regions', region, 'wastelandRegistrations', write.id);
      if (write.type === 'delete') batch.delete(ref);
      else batch.set(ref, { ...write.data, updatedAt: now, submittedAt: now }, { merge: true });
    });
    await batch.commit();
  }

  await firestoreMod.setDoc(firestoreMod.doc(db, 'regions', region), {
    region,
    activeTable: {
      cycleId: activeCycle,
      source: 'local-import',
      rowsCount: rows.length,
      replacedAt: now,
      replacedBy: user.uid
    },
    updatedAt: now,
    updatedBy: user.uid
  }, { merge: true });
  return { profile, region, count: rows.length, replaced: oldCycleRows.length };
}

export function regionRegistrationToPlayer(row = {}) {
  const info = row.wastelandProfile || {};
  const troopType = row.troopType || info.troopType || '';
  const captainReady = Object.prototype.hasOwnProperty.call(row, 'captainReady')
    ? Boolean(row.captainReady)
    : Boolean(info.captainReady);
  const isRegistration = row.source !== 'profile' && row.rowType !== 'Профіль';
  return {
    id: row.id || row.uid || '',
    _rowId: row.id || row.uid || '',
    regionRegistrationId: isRegistration ? (row.id || '') : '',
    regionNumber: normalizeRegion(row.region),
    dbSource: isRegistration ? 'wastelandRegistration' : 'profile',
    name: row.nickname || '',
    alliance: row.alliance || '',
    role: troopTypeToPlayerRole(troopType) || row.troopLabel || troopLabel(troopType),
    tier: row.tier || info.tier || '',
    march: row.marchSize || info.marchSize || 0,
    rally: row.rallySize || info.rallySize || 0,
    extraEnabled: Boolean(normalizeExtraSquads(row).length || normalizeExtraSquads(info).length),
    extraSquads: normalizeExtraSquads(row).length ? normalizeExtraSquads(row) : normalizeExtraSquads(info),
    extraTroopType: (normalizeExtraSquads(row)[0] || normalizeExtraSquads(info)[0] || {}).troopType || '',
    extraTroopLabel: (normalizeExtraSquads(row)[0] || normalizeExtraSquads(info)[0] || {}).troopLabel || '',
    extraTier: (normalizeExtraSquads(row)[0] || normalizeExtraSquads(info)[0] || {}).tier || '',
    extraMarch: 0,
    extraMarchSize: 0,
    captainReady: captainReady ? 'Так' : 'Ні',
    shift: row.shift || info.shift || '',
    shiftLabel: row.shiftLabel || shiftLabel(row.shift || info.shift),
    lair: (row.captureRegion ?? info.captureRegion) ? 'Так' : 'Ні',
    lairLevel: row.lairLevel || info.lairLevel || '',
    registeredAt: row.submittedAt || row.updatedAt || row.createdAt || '',
    placement: 'Не призначено'
  };
}


export async function getRegionTowerPlan(user, regionOverride = '') {
  if (!user) throw new Error('auth-required');
  const { db, firestoreMod } = await getFirebaseParts();
  const { profile, region } = await getMyRegionContext(user, regionOverride);
  if (!region) throw new Error('region-required');
  const ref = firestoreMod.doc(db, 'regions', region, 'wastelandTowerPlans', 'current');
  const snap = await firestoreMod.getDoc(ref);
  return {
    profile,
    region,
    plan: snap.exists() ? (snap.data()?.plan || null) : null,
    updatedAt: snap.exists() ? snap.data()?.updatedAt || null : null,
    updatedBy: snap.exists() ? snap.data()?.updatedBy || '' : ''
  };
}

export async function saveRegionTowerPlan(user, region, plan = {}) {
  if (!user) throw new Error('auth-required');
  const { db, firestoreMod } = await getFirebaseParts();
  const profile = await getUserProfile(user.uid);
  const safeRegion = normalizeRegion(region || getGameProfile(profile || {}).region);
  if (!safeRegion) throw new Error('region-required');
  if (!canManageRegion(profile, safeRegion, user)) throw new Error('region-plan-access-denied');
  const cleanPlan = plan && typeof plan === 'object' ? plan : {};
  await firestoreMod.setDoc(
    firestoreMod.doc(db, 'regions', safeRegion, 'wastelandTowerPlans', 'current'),
    {
      region: safeRegion,
      plan: cleanPlan,
      updatedAt: firestoreMod.serverTimestamp(),
      updatedAtMs: Date.now(),
      updatedBy: user.uid
    },
    { merge: true }
  );
  await firestoreMod.setDoc(firestoreMod.doc(db, 'regions', safeRegion), {
    region: safeRegion,
    updatedAt: firestoreMod.serverTimestamp(),
    updatedBy: user.uid,
    lastTowerPlanUpdateAt: firestoreMod.serverTimestamp(),
    lastTowerPlanUpdateBy: user.uid
  }, { merge: true }).catch(() => null);
  return { region: safeRegion, plan: cleanPlan };
}

export { formatUserDate, timestampToMs };
