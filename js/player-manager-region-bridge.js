import { getFirebase, watchAuth } from './services/firebase-service.js';
import { getGameProfile, getUserProfile, isProfileComplete, normalizeUserRole } from './services/user-db.js';
import { canDeleteRegionRegistration, canManageRegion, deleteRegionRegistrations, listRegionRegistrations, regionRegistrationToPlayer, updateRegionRegistration } from './services/region-db.js';

window.WKD = window.WKD || {};

const SOURCE_KEY = 'wkd.players.sourceMode';
const REGION_SOURCE = 'regionForm';

let currentUser = null;
let currentProfile = null;
let currentRegion = '';
let currentMode = normalizeMode(localStorage.getItem(SOURCE_KEY) || 'local');
let loadedRows = [];
let loadedAlliances = [];
let loadingPromise = null;
let allianceLoadingPromise = null;
let authReadyResolve = null;
const authReady = new Promise(resolve => { authReadyResolve = resolve; });

function tr(key, fallback = '') { return window.WKD_t ? window.WKD_t(key) : fallback; }
function normalizeMode(mode) { return mode === 'region' ? 'region' : 'local'; }
function regionOf(profile = currentProfile) { return String(getGameProfile(profile || {}).region || currentRegion || '').trim(); }
function canUseRegion() { return Boolean(currentUser && isProfileComplete(currentProfile)); }
function canEditRegion() { return Boolean(currentUser && currentRegion && canManageRegion(currentProfile, currentRegion)); }
function canDeleteRegion() { return Boolean(currentUser && currentRegion && canDeleteRegionRegistration(currentProfile, currentRegion)); }
function rowKey(player = {}) { return String(player._rowId || player.id || player.uid || ''); }
function normTag(value = '') { return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 12); }
function gameProfile() { return getGameProfile(currentProfile || {}); }
function ownAlliance() { return normTag(gameProfile().alliance); }
function ownRank() { return String(gameProfile().rank || '').trim().toLowerCase(); }
function currentRole() { return normalizeUserRole(currentProfile?.role || 'player'); }
function isOwnerAdmin() { return String(currentUser?.email || '').trim().toLowerCase() === 'vovapotaychuk@gmail.com'; }
function isRankR4R5(rank = ownRank()) {
  return ['p4', 'p5', 'r4', 'r5', '4', '5'].includes(String(rank || '').trim().toLowerCase());
}
function canEditAllAllianceColors() {
  const role = currentRole();
  const sameRegion = regionOf() === currentRegion;
  return Boolean(currentUser && (isOwnerAdmin() || role === 'admin' || role === 'moderator' || (role === 'consul' && sameRegion)));
}
function canEditAllianceColor(tag = '') {
  const wanted = normTag(tag);
  if (!wanted || !canUseRegion()) return false;
  if (canEditAllAllianceColors()) return true;
  return currentRole() === 'officer' && regionOf() === currentRegion && ownAlliance() === wanted && isRankR4R5();
}
function normalizeBool(value) {
  if (value === true || value === false) return value;
  return /^(1|true|yes|так|да|y)$/i.test(String(value || '').trim());
}
function mergePlayerValues(player = {}, values = {}) {
  return {
    ...player,
    name: String(values.name ?? player.name ?? '').trim(),
    alliance: String(values.alliance ?? player.alliance ?? '').trim().toUpperCase(),
    role: values.role || player.role || 'Shooter',
    tier: String(values.tier ?? player.tier ?? 'T10').trim().toUpperCase(),
    march: Number(values.march ?? player.march ?? 0) || 0,
    rally: Number(values.rally ?? player.rally ?? 0) || 0,
    captain: normalizeBool(values.captain ?? player.captain),
    captainReady: normalizeBool(values.captain ?? player.captain) ? 'Так' : 'Ні',
    shift: values.shift || player.shift || 'both',
    lair: values.lair ?? player.lair ?? (player.captureRegion ? 'Так' : 'Ні'),
    lairLevel: Number(values.lairLevel ?? player.lairLevel ?? 0) || '',
    placement: values.placement || player.placement || 'Резерв'
  };
}
function nextRegionId(values = {}) {
  const name = String(values.name || values.nickname || 'player').toLowerCase().replace(/[^a-z0-9а-яіїєґ_-]+/giu, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'player';
  return `manual_${currentUser?.uid || 'user'}_${Date.now()}_${name}`;
}

function expandRegionPlayerRow(row = {}) {
  const main = regionRegistrationToPlayer(row);
  const extraSquads = Array.isArray(main.extraSquads)
    ? main.extraSquads
    : (main.extraEnabled && main.extraTroopType && main.extraTier ? [{ troopType: main.extraTroopType, troopLabel: main.extraTroopLabel, tier: main.extraTier }] : []);
  if (!extraSquads.length) return [main];
  const baseId = rowKey(main) || main.id || main.uid || row.id || row.uid || 'extra';
  const extras = extraSquads.map((extra, index) => {
    const extraId = `${baseId}__extra_${extra.troopType || index}`;
    return {
      ...main,
      id: extraId,
      _rowId: extraId,
      regionRegistrationId: main.regionRegistrationId || main.id || row.id || '',
      name: `${main.name || row.nickname || 'Гравець'} · додатковий загін`,
      role: extra.troopLabel || extra.troopType,
      tier: extra.tier,
      march: Number(main.extraMarchSize || main.extraMarch || 0) || Number(main.march || 0) || 0,
      rally: 0,
      captain: false,
      captainReady: 'Ні',
      isExtraTroopRow: true,
      extraTroopType: extra.troopType || '',
      extraTroopLabel: extra.troopLabel || extra.troopType || '',
      extraTier: extra.tier || '',
      placement: 'Додатковий загін'
    };
  });
  return [main, ...extras];
}

async function loadRegionRows(force = false) {
  await authReady;
  if (!canUseRegion()) return { rows: [], region: '', profile: currentProfile, canUseRegion: false };
  if (loadingPromise) return loadingPromise;
  if (!force && loadedRows.length) return { rows: loadedRows, region: currentRegion, profile: currentProfile, canUseRegion: true };
  loadingPromise = listRegionRegistrations(currentUser).then(result => {
    currentProfile = result.profile || currentProfile;
    currentRegion = result.region || currentRegion || regionOf(result.profile || currentProfile);
    loadedRows = (result.rows || []).flatMap(row => expandRegionPlayerRow(row).map(player => ({ ...player, source: REGION_SOURCE })));
    return { rows: loadedRows, region: currentRegion, profile: currentProfile, canUseRegion: true };
  }).finally(() => { loadingPromise = null; });
  return loadingPromise;
}

async function loadRegionAlliances(force = false) {
  await authReady;
  if (!canUseRegion()) return [];
  if (allianceLoadingPromise) return allianceLoadingPromise;
  if (!force && loadedAlliances.length) return loadedAlliances;
  const region = currentRegion || regionOf();
  if (!region) return [];
  allianceLoadingPromise = getFirebase().then(async firebase => {
    if (!firebase) return [];
    const { db, firestoreMod } = firebase;
    const snapshot = await firestoreMod.getDocs(firestoreMod.collection(db, 'regions', region, 'alliances'));
    loadedAlliances = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    window.WKD.regionAllianceColorMap = Object.fromEntries(loadedAlliances.map(item => {
      const tag = normTag(item.tag || item.id);
      const hue = Number(item.colorHue);
      return tag && Number.isFinite(hue) ? [tag, ((Math.round(hue) % 360) + 360) % 360] : null;
    }).filter(Boolean));
    document.dispatchEvent(new CustomEvent('wkd:alliance-colors-updated', { detail: { source: 'region-bridge-load' } }));
    return loadedAlliances;
  }).catch(error => {
    console.warn('[WKD] alliance colors load failed:', error);
    return [];
  }).finally(() => { allianceLoadingPromise = null; });
  return allianceLoadingPromise;
}

async function saveAllianceColor(tag, values = null) {
  await authReady;
  const safeTag = normTag(tag);
  if (!safeTag) throw new Error('alliance-tag-required');
  if (!canEditAllianceColor(safeTag)) throw new Error('alliance-color-access');
  const firebase = await getFirebase();
  if (!firebase) throw new Error('firebase-not-configured');
  const { db, firestoreMod } = firebase;
  const region = currentRegion || regionOf();
  if (!region) throw new Error('region-required');
  const ref = firestoreMod.doc(db, 'regions', region, 'alliances', safeTag);
  const hue = values && Number.isFinite(Number(values.colorHue)) ? ((Math.round(Number(values.colorHue)) % 360) + 360) % 360 : null;
  const patch = hue === null
    ? { tag: safeTag, colorHue: null, colorMode: 'auto', colorUpdatedAt: firestoreMod.serverTimestamp(), colorUpdatedBy: currentUser.uid }
    : { tag: safeTag, colorHue: hue, colorMode: 'manual', colorUpdatedAt: firestoreMod.serverTimestamp(), colorUpdatedBy: currentUser.uid };
  await firestoreMod.setDoc(ref, patch, { merge: true });
  const index = loadedAlliances.findIndex(item => normTag(item.tag || item.id) === safeTag);
  const next = { ...(index >= 0 ? loadedAlliances[index] : { id: safeTag, tag: safeTag }), ...patch, colorHue: hue };
  if (index >= 0) loadedAlliances[index] = next;
  else loadedAlliances.push(next);
  return next;
}

function sourceInfo(mode = currentMode) {
  const region = currentRegion || regionOf();
  return {
    mode: normalizeMode(mode),
    region,
    label: normalizeMode(mode) === 'region' ? (region ? `R${region}` : tr('playerManager.regionList', 'region table')) : tr('playerManager.localList', 'local list'),
    canUpdate: normalizeMode(mode) !== 'region' || canEditRegion(),
    canDelete: normalizeMode(mode) !== 'region' || canDeleteRegion(),
    canPlan: normalizeMode(mode) !== 'region' || canEditRegion(),
    canViewRegion: canUseRegion(),
    userRole: normalizeUserRole(currentProfile?.role || 'player')
  };
}

function setMode(mode) {
  currentMode = normalizeMode(mode);
  localStorage.setItem(SOURCE_KEY, currentMode);
  document.dispatchEvent(new CustomEvent('wkd:player-manager-source-changed', { detail: sourceInfo() }));
}
function getMode() { return currentMode; }

async function updateRegionPlayer(id, values = {}) {
  await authReady;
  if (!canEditRegion()) throw new Error('region-update-access-denied');
  let wanted = String(id || '').trim();
  if (!wanted) wanted = nextRegionId(values);
  const existing = loadedRows.find(player => rowKey(player) === wanted);
  if (existing?.isExtraTroopRow) throw new Error('extra-troop-row-readonly');
  const registrationId = existing?.regionRegistrationId || existing?.id || wanted;
  const result = await updateRegionRegistration(currentUser, currentRegion || regionOf(), registrationId, values);
  const merged = mergePlayerValues(existing || { _rowId: registrationId, id: registrationId, regionRegistrationId: registrationId, source: REGION_SOURCE }, values);
  merged._rowId = registrationId;
  merged.id = registrationId;
  merged.regionRegistrationId = registrationId;
  merged.source = REGION_SOURCE;
  const index = loadedRows.findIndex(player => rowKey(player) === wanted || rowKey(player) === registrationId);
  if (index >= 0) loadedRows[index] = { ...loadedRows[index], ...merged };
  else loadedRows.push(merged);
  return { updated: true, player: merged, result };
}

async function deleteRegionPlayers(ids = []) {
  await authReady;
  if (!canDeleteRegion()) throw new Error('region-delete-access-denied');
  const wanted = [...new Set((Array.isArray(ids) ? ids : [ids]).map(id => String(id || '').trim()).filter(Boolean))];
  const dbIds = wanted.map(id => {
    const row = loadedRows.find(player => rowKey(player) === id);
    if (row?.isExtraTroopRow) return '';
    return row?.regionRegistrationId || row?.id || '';
  }).filter(Boolean);
  if (dbIds.length !== wanted.length) throw new Error('region-delete-registration-only');
  const result = await deleteRegionRegistrations(currentUser, currentRegion || regionOf(), dbIds);
  const set = new Set(wanted);
  loadedRows = loadedRows.filter(player => !set.has(rowKey(player)));
  return { removed: dbIds.length, result };
}

async function handleAuth(user) {
  currentUser = user || null;
  currentProfile = null;
  currentRegion = '';
  loadedRows = [];
  if (currentUser) {
    currentProfile = await getUserProfile(currentUser.uid).catch(() => null);
    currentRegion = regionOf(currentProfile);
  }
  authReadyResolve?.();
  document.dispatchEvent(new CustomEvent('wkd:player-manager-auth-ready', { detail: sourceInfo() }));
}

watchAuth(handleAuth).catch(error => console.warn('[WKD] player manager auth bridge skipped:', error));

window.WKD.playerManagerRegion = {
  authReady,
  loadRegionRows,
  loadRegionAlliances,
  saveAllianceColor,
  canEditAllianceColor,
  updateRegionPlayer,
  deleteRegionPlayers,
  getSourceInfo: sourceInfo,
  setMode,
  getMode
};

document.addEventListener('wkd:language-changed', () => {
  document.dispatchEvent(new CustomEvent('wkd:player-manager-source-changed', { detail: sourceInfo() }));
});
