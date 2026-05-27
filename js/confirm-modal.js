window.WKD = window.WKD || {};
WKD.confirmDialog = options => new Promise(resolve => {
  const modal = WKD.$('#confirmModal');
  if (!modal) return resolve(window.confirm(options?.title || 'Підтвердити дію?'));
  const title = WKD.$('#confirmTitle', modal);
  const message = WKD.$('#confirmMessage', modal);
  const note = WKD.$('#confirmNote', modal);
  const icon = WKD.$('#confirmIcon', modal);
  const accept = WKD.$('#confirmAcceptBtn', modal);
  title.textContent = options?.title || 'Підтвердити дію?';
  message.textContent = options?.message || 'Цю дію не можна скасувати.';
  note.textContent = options?.note || 'Перевір дані перед підтвердженням.';
  icon.textContent = options?.icon || '⚠';
  accept.textContent = options?.acceptText || 'Підтвердити';
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  const finish = value => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    accept.removeEventListener('click', onAccept);
    WKD.$$('[data-confirm-cancel]', modal).forEach(btn => btn.removeEventListener('click', onCancel));
    resolve(value);
  };
  const onAccept = () => finish(true);
  const onCancel = () => finish(false);
  accept.addEventListener('click', onAccept);
  WKD.$$('[data-confirm-cancel]', modal).forEach(btn => btn.addEventListener('click', onCancel));
});
