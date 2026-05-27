import { initAuth } from "./auth.js";
import { initI18n } from "./i18n-core.js";
import { initRegionForms } from "./region-forms.js";

const toast = document.querySelector("#toast");
let i18n = null;
let toastTimer = 0;

function notify(keyOrText) {
  const message = i18n?.t?.(keyOrText) || keyOrText;
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

window.addEventListener("error", (event) => {
  console.error(event.error || event.message);
  notify("unexpected_error");
});

window.addEventListener("DOMContentLoaded", async () => {
  i18n = initI18n();
  const authApi = await initAuth({ notify });
  initRegionForms({
    authApi,
    t: i18n.t,
    notify,
    applyI18n: i18n.apply
  });
});
