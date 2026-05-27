window.WKD = window.WKD || {};
WKD.initHeader = () => {
  const { $, $$, showNotice } = WKD;
  const drawer = $('#drawer'), burger = $('#burgerBtn'), close = $('#drawerClose'), backdrop = $('#drawerBackdrop');
  const langBtn = $('#langBtn'), langMenu = $('#langMenu');
  if (!drawer || !burger || !close || !backdrop || !langBtn || !langMenu) return;

  const openDrawer = () => {
    drawer.classList.add('is-open');
    burger.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('drawer-open');
  };
  const closeDrawer = () => {
    drawer.classList.remove('is-open');
    burger.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('drawer-open');
  };

  burger.addEventListener('click', () => drawer.classList.contains('is-open') ? closeDrawer() : openDrawer());
  close.addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);
  $('#drawerImportBtn')?.addEventListener('click', () => {
    closeDrawer();
    if (typeof WKD.openImportModal === 'function') WKD.openImportModal();
    else window.location.href = 'index.html#playersPanel';
  });

  $$('[data-scroll]').forEach(button => button.addEventListener('click', () => {
    closeDrawer();
    const target = $(button.dataset.scroll);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  $$('[data-disabled-note]').forEach(button => button.addEventListener('click', () => showNotice(button.dataset.disabledNote || 'Цей блок додамо пізніше.')));

  renderLanguages();
  langBtn.addEventListener('click', () => {
    const isOpen = langMenu.classList.toggle('is-open');
    langBtn.setAttribute('aria-expanded', String(isOpen));
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    closeDrawer();
    if (typeof WKD.closeImportModal === 'function') WKD.closeImportModal();
    langMenu.classList.remove('is-open');
    langBtn.setAttribute('aria-expanded', 'false');
  });
};

function renderLanguages() {
  const { $, $$, showNotice } = WKD;
  const menu = $('#langMenu');
  const langs = window.WKD_LANGUAGES || [{ id: 'uk', code: 'UK', name: 'Українська', icon: 'img/lang/lang-uk.svg' }];
  menu.innerHTML = langs.map(lang => `
    <button class="lang-item ${lang.id === 'uk' ? 'is-active' : ''}" type="button" role="option" data-lang="${lang.id}" aria-selected="${lang.id === 'uk'}">
      <span class="lang-flag"><img src="${lang.icon}" alt="" width="40" height="40"></span>
      <span class="lang-name">${lang.name}</span><span class="lang-code">${lang.code}</span>
    </button>`).join('');
  $$('.lang-item', menu).forEach(item => item.addEventListener('click', () => {
    $$('.lang-item', menu).forEach(btn => { btn.classList.remove('is-active'); btn.setAttribute('aria-selected', 'false'); });
    item.classList.add('is-active');
    item.setAttribute('aria-selected', 'true');
    window.WKD_CURRENT_LANG = item.dataset.lang || 'uk';
    localStorage.setItem('wkd.lang', window.WKD_CURRENT_LANG);
    $('#currentLangLabel').textContent = item.querySelector('.lang-name').textContent;
    if (typeof window.WKD_applyI18n === 'function') window.WKD_applyI18n();
    menu.classList.remove('is-open');
    $('#langBtn').setAttribute('aria-expanded', 'false');
    showNotice('Мови додані. Переклад поки не підключений — працюємо з українською.');
  }));
}
