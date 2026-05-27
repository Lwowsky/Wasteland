import { createAuth } from './auth.js';
import { createStore } from './store.js';
import { initI18n, t, languages } from './i18n.js';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const store = createStore('wkd_clean_start_v1');
const auth = createAuth({ onChange: renderAuth });
let currentUser = auth.getUser();
let registrations = [];

function toast(message) {
  const box = $('#toast');
  box.textContent = message;
  box.classList.add('is-open');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => box.classList.remove('is-open'), 2600);
}

function init() {
  initI18n({ onChange: () => { renderLangMenus(); renderPlayers(); } });
  fillTiers();
  renderLangMenus();
  bindDrawer();
  bindNav();
  bindAuth();
  bindForm();
  bindPlayersTools();
  currentUser = auth.getUser();
  loadPlayers();
  renderAuth(currentUser);
  renderPlayers();
}

function fillTiers() {
  const select = $('#tierSelect');
  select.innerHTML = '';
  for (let i = 14; i >= 1; i--) select.append(new Option(`T${i}`, `T${i}`));
}

function renderLangMenus() {
  const html = languages.map(item => {
    const active = item.code === document.documentElement.lang ? ' is-active' : '';
    return `<button class="lang-item${active}" data-lang="${item.code}" role="option" type="button"><span class="lang-flag"><img class="lang-flag-img" src="img/lang/lang-${item.code}.svg" alt="" loading="lazy" width="40" height="40"></span><span class="lang-name">${item.name}</span><span class="lang-code">${item.short}</span></button>`;
  }).join('');
  $('#langMenu').innerHTML = html;
  $('#drawerLangList').innerHTML = html;
  $$('.lang-item').forEach(btn => btn.addEventListener('click', () => window.WKD_setLang(btn.dataset.lang)));
}

function bindDrawer() {
  const drawer = $('#drawer');
  const burger = $('#burgerBtn');
  const toggle = force => {
    const open = typeof force === 'boolean' ? force : !drawer.classList.contains('is-open');
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
  };
  burger.addEventListener('click', () => toggle());
  $$('[data-close-drawer]').forEach(el => el.addEventListener('click', () => toggle(false)));
  $('#langBtn').addEventListener('click', () => $('.desktop-lang').classList.toggle('is-open'));
  document.addEventListener('click', e => { if (!e.target.closest('.desktop-lang')) $('.desktop-lang')?.classList.remove('is-open'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
}

function bindNav() {
  $$('[data-open-section]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.openSection;
    const target = document.getElementById(id) || document.getElementById('registration');
    $('#drawer').classList.remove('is-open');
    $('#burgerBtn').classList.remove('is-open');
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
}

function bindAuth() {
  $('#googleLoginBtn').addEventListener('click', async () => {
    const result = await auth.signInWithGoogle();
    toast(t(result.ok ? 'guest_ready' : result.message));
  });
  $('#guestLoginBtn').addEventListener('click', () => {
    auth.signInAsGuest();
    toast(t('guest_ready'));
  });
  $('#logoutBtn').addEventListener('click', async () => {
    await auth.signOut();
    toast(t('signed_out'));
  });
}

function renderAuth(user) {
  currentUser = user || auth.getUser();
  $('#authName').textContent = currentUser.name;
  $('#authEmail').textContent = currentUser.email || currentUser.type;
  $('#authStatus').textContent = currentUser.type === 'google' ? 'Google' : t('guest_mode');
  $('#authAvatar').textContent = (currentUser.name || 'G').trim().charAt(0).toUpperCase();
  if (currentUser.photo) $('#authAvatar').style.backgroundImage = `url(${currentUser.photo})`;
  else $('#authAvatar').style.backgroundImage = '';
  loadPlayers();
  renderPlayers();
}

function bindForm() {
  $('#playerForm').addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const region = Number(data.get('region'));
    const nickname = String(data.get('nickname') || '').trim();
    if (!region || region < 1) return toast(t('need_region'));
    if (!nickname) return toast(t('need_name'));
    const item = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      createdAt: new Date().toISOString(),
      owner: currentUser.id,
      region,
      nickname,
      alliance: String(data.get('alliance') || '').trim().toUpperCase(),
      troop: data.get('troop'),
      tier: data.get('tier'),
      march: Number(data.get('march') || 0),
      rally: Number(data.get('rally') || 0),
      captain: data.get('captain'),
      shifts: data.getAll('shifts'),
      note: String(data.get('note') || '').trim()
    };
    registrations.unshift(item);
    savePlayers();
    renderPlayers();
    e.currentTarget.reset();
    fillTiers();
    toast(t('saved'));
  });
}

function bindPlayersTools() {
  $('#searchInput').addEventListener('input', renderPlayers);
  $('#regionFilter').addEventListener('input', renderPlayers);
  $('#clearBtn').addEventListener('click', () => {
    registrations = [];
    savePlayers();
    renderPlayers();
    toast(t('cleared'));
  });
  $('#exportBtn').addEventListener('click', () => {
    if (!registrations.length) return toast(t('export_empty'));
    const blob = new Blob([JSON.stringify(registrations, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wkd-region-registrations-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

function storageKey() { return `registrations:${currentUser?.id || 'guest'}`; }
function loadPlayers() { registrations = store.get(storageKey(), []); }
function savePlayers() { store.set(storageKey(), registrations); }

function renderPlayers() {
  const term = ($('#searchInput')?.value || '').trim().toLowerCase();
  const region = Number($('#regionFilter')?.value || 0);
  const rows = registrations.filter(item => {
    const text = `${item.region} ${item.nickname} ${item.alliance}`.toLowerCase();
    return (!term || text.includes(term)) && (!region || item.region === region);
  });
  $('#emptyText').classList.toggle('hide', rows.length > 0);
  $('#playersTbody').innerHTML = rows.length ? rows.map(rowTemplate).join('') : `<tr><td colspan="8" class="empty-row">${t('empty_list')}</td></tr>`;
  $$('.delete-row').forEach(btn => btn.addEventListener('click', () => {
    registrations = registrations.filter(item => item.id !== btn.dataset.id);
    savePlayers();
    renderPlayers();
    toast(t('deleted'));
  }));
}

function rowTemplate(item) {
  const shifts = item.shifts?.length ? item.shifts.map(s => `${t('shift')} ${s}`).join(', ') : '—';
  return `<tr><td><span class="badge">${escapeHtml(item.region)}</span></td><td>${escapeHtml(item.nickname)}</td><td>${escapeHtml(item.alliance || '—')}</td><td class="troop-${item.troop}">${t(item.troop?.toLowerCase() || 'troop_type')}</td><td>${escapeHtml(item.tier)}</td><td>${escapeHtml(shifts)}</td><td>${item.captain === 'yes' ? t('yes') : t('no')}</td><td class="row-actions"><button class="btn delete-row" data-id="${item.id}" type="button">✕</button></td></tr>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

document.addEventListener('DOMContentLoaded', init);
