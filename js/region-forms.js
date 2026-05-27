import {
  createBlankForm,
  createRegistration,
  exportSnapshot,
  getActiveForm,
  getRegistrationsForForm,
  getState,
  removeForm,
  removeRegistration,
  setActiveForm,
  subscribe,
  upsertForm
} from "./state.js";

let authApi = null;
let t = (key) => key;
let notify = () => {};
let applyI18n = () => {};

const troopLabels = {
  fighter: "fighter",
  rider: "rider",
  shooter: "shooter",
  mixed: "mixed"
};

export function initRegionForms(options = {}) {
  authApi = options.authApi;
  t = options.t || t;
  notify = options.notify || notify;
  applyI18n = options.applyI18n || applyI18n;

  fillTierSelect();
  bindTabs();
  bindRegionForm();
  bindPlayerForm();
  bindButtons();
  applyUrlForm();

  subscribe(renderAll);
  renderAll();
}

function fillTierSelect() {
  const select = document.querySelector("#tier");
  if (!select || select.children.length) return;
  for (let level = 14; level >= 1; level -= 1) {
    const option = document.createElement("option");
    option.value = `T${level}`;
    option.textContent = `T${level}`;
    select.append(option);
  }
}

function bindTabs() {
  document.querySelectorAll(".tab[data-panel]").forEach((button) => {
    button.addEventListener("click", () => showPanel(button.dataset.panel));
  });
}

function showPanel(name) {
  document.querySelectorAll(".tab[data-panel]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.panel === name);
  });
  document.querySelectorAll("[data-panel-view]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panelView === name);
  });
}

function bindRegionForm() {
  const form = document.querySelector("#regionForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const state = getState();
    const user = state.user;
    const active = getActiveForm(state);
    const formData = new FormData(form);
    const regionNumber = Number(formData.get("regionNumber"));
    const shifts = formData.getAll("shifts");

    if (!Number.isInteger(regionNumber) || regionNumber < 1) return notify("invalid_region");
    if (!shifts.length) return notify("choose_shift");

    const saved = upsertForm({
      ...(active || createBlankForm(user)),
      ownerUid: user?.uid || "guest",
      ownerName: user?.name || "Guest",
      regionNumber: String(regionNumber),
      title: String(formData.get("formTitle") || "").trim(),
      eventDate: String(formData.get("eventDate") || ""),
      status: String(formData.get("formStatus") || "draft"),
      shifts,
      description: String(formData.get("formDescription") || "").trim()
    });

    const synced = await safeCloudSave(() => authApi?.saveRegionForm(saved));
    notify(synced ? "form_saved_cloud" : user ? "form_saved_local" : "guest_form_saved");
  });
}

function bindPlayerForm() {
  const form = document.querySelector("#playerForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const formId = String(data.get("activeRegionSelect") || document.querySelector("#activeRegionSelect")?.value || "");
    if (!formId) return notify("select_region_first");

    const entry = createRegistration({
      formId,
      playerName: String(data.get("playerName") || ""),
      allianceTag: String(data.get("allianceTag") || ""),
      troopType: String(data.get("troopType") || "mixed"),
      tier: String(data.get("tier") || "T1"),
      marchSize: data.get("marchSize"),
      rallySize: data.get("rallySize"),
      preferredShift: String(data.get("preferredShift") || "1"),
      captainReady: data.get("captainReady") === "on",
      comment: String(data.get("playerComment") || "")
    });

    const synced = await safeCloudSave(() => authApi?.savePlayerRegistration(entry));
    form.reset();
    fillTierSelect();
    notify(synced ? "registration_saved_cloud" : "registration_saved_local");
    showPanel("roster");
  });
}

function bindButtons() {
  document.querySelector("#resetRegionFormBtn")?.addEventListener("click", () => {
    setActiveForm("");
    document.querySelector("#regionForm")?.reset();
    notify("clean_form_ready");
  });

  document.querySelector("#copyActiveLinkBtn")?.addEventListener("click", copyActiveLink);
  document.querySelector("#refreshFormsBtn")?.addEventListener("click", async () => {
    await authApi?.pullCloudData?.();
    notify(authApi?.isReady?.() ? "forms_refreshed" : "local_mode");
  });

  document.querySelector("#clearPlayerFormBtn")?.addEventListener("click", () => {
    document.querySelector("#playerForm")?.reset();
    fillTierSelect();
  });

  document.querySelector("#exportJsonBtn")?.addEventListener("click", exportJson);
}

function applyUrlForm() {
  const id = new URLSearchParams(location.search).get("form");
  if (id) setActiveForm(id);
}

async function safeCloudSave(action) {
  try {
    return Boolean(await action?.());
  } catch (error) {
    console.error("Cloud save failed", error);
    notify("cloud_save_failed");
    return false;
  }
}

function copyActiveLink() {
  const active = getActiveForm(getState());
  if (!active) return notify("select_region_first");
  const url = new URL(location.href);
  url.searchParams.set("form", active.id);
  url.searchParams.set("region", active.regionNumber);
  navigator.clipboard?.writeText(url.toString());
  notify("link_copied");
}

function exportJson() {
  const blob = new Blob([exportSnapshot()], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `wasteland-region-forms-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function renderAll() {
  const state = getState();
  const active = getActiveForm(state);
  const activeEntries = active ? getRegistrationsForForm(active.id, state) : [];

  renderProfile(state);
  renderStats(state);
  renderFormsList(state, active);
  renderRegionForm(active, state);
  renderActiveRegionSelect(state, active);
  renderRegistrations(activeEntries);
  applyI18n();
}

function renderProfile(state) {
  const user = state.user;
  const name = user?.name || t("guest");
  const email = user?.email || t("guest_note");
  const avatar = document.querySelector("#avatar");
  const authPill = document.querySelector("#authPill");

  setText("#accountStatus", user ? t("signed_in") : t("guest"));
  setText("#profileName", name);
  setText("#profileEmail", email);
  setText("#authPill", user ? "Google" : "Guest");

  authPill?.classList.toggle("is-online", Boolean(user));
  if (avatar) {
    avatar.innerHTML = user?.photoURL ? `<img alt="" src="${escapeAttr(user.photoURL)}">` : (name[0] || "G").toUpperCase();
  }

  document.querySelector("#signInBtn")?.classList.toggle("is-hidden", Boolean(user && authApi?.isReady?.()));
  document.querySelector("#signOutBtn")?.classList.toggle("is-hidden", !user || !authApi?.isReady?.());
}

function renderStats(state) {
  setText("#formsCount", state.forms.length);
  setText("#playersCount", state.registrations.length);
  const sync = authApi?.isReady?.() && state.user ? t("cloud_mode") : t("local_mode");
  setText("#syncStatus", sync);
}

function renderFormsList(state, active) {
  const list = document.querySelector("#formsList");
  const empty = document.querySelector("#formsEmpty");
  if (!list) return;

  empty?.classList.toggle("is-hidden", state.forms.length > 0);
  list.innerHTML = "";

  state.forms.forEach((form) => {
    const card = document.createElement("article");
    card.className = `form-card${active?.id === form.id ? " is-active" : ""}`;
    card.innerHTML = `
      <div class="form-card-top">
        <div>
          <h3>${escapeHtml(form.title || t("untitled_form"))}</h3>
          <p>${t("region_short", { region: escapeHtml(form.regionNumber || "—") })} · ${escapeHtml(form.status || "draft")}</p>
        </div>
        <span class="tag">${escapeHtml((form.shifts || []).map((shift) => `S${shift}`).join(" / "))}</span>
      </div>
      <div class="form-card-actions">
        <button class="btn btn-soft" type="button" data-action="open">${t("open")}</button>
        <button class="btn btn-soft" type="button" data-action="copy">${t("copy")}</button>
        <button class="btn btn-soft" type="button" data-action="delete">${t("delete")}</button>
      </div>
    `;
    card.querySelector('[data-action="open"]').addEventListener("click", () => setActiveForm(form.id));
    card.querySelector('[data-action="copy"]').addEventListener("click", () => {
      setActiveForm(form.id);
      copyActiveLink();
    });
    card.querySelector('[data-action="delete"]').addEventListener("click", () => removeForm(form.id));
    list.append(card);
  });
}

function renderRegionForm(active, state) {
  const form = document.querySelector("#regionForm");
  if (!form) return;

  const data = active || createBlankForm(state.user);
  setInput("#regionNumber", data.regionNumber);
  setInput("#formTitle", data.title);
  setInput("#eventDate", data.eventDate);
  setInput("#formStatus", data.status || "draft");
  setInput("#formDescription", data.description);

  form.querySelectorAll('input[name="shifts"]').forEach((input) => {
    input.checked = (data.shifts || []).includes(input.value);
  });
}

function renderActiveRegionSelect(state, active) {
  const select = document.querySelector("#activeRegionSelect");
  const shiftSelect = document.querySelector("#preferredShift");
  if (!select || !shiftSelect) return;

  select.innerHTML = "";
  if (!state.forms.length) {
    select.append(new Option(t("no_forms_yet"), ""));
  } else {
    state.forms.forEach((form) => {
      select.append(new Option(`${t("region_short", { region: form.regionNumber || "—" })} · ${form.title || t("untitled_form")}`, form.id));
    });
  }
  select.value = active?.id || "";
  select.onchange = () => setActiveForm(select.value);

  shiftSelect.innerHTML = "";
  (active?.shifts || ["1", "2"]).forEach((shift) => {
    shiftSelect.append(new Option(t(`shift_${shift}`), shift));
  });
}

function renderRegistrations(entries) {
  const tbody = document.querySelector("#registrationsTable");
  const empty = document.querySelector("#registrationsEmpty");
  if (!tbody) return;

  tbody.innerHTML = "";
  empty?.classList.toggle("is-hidden", entries.length > 0);

  entries.forEach((entry) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${escapeHtml(entry.playerName)}</strong><br><span class="muted">${escapeHtml(entry.comment || "")}</span></td>
      <td>${escapeHtml(entry.allianceTag || "—")}</td>
      <td>${t(troopLabels[entry.troopType] || "mixed")}</td>
      <td>${escapeHtml(entry.tier)}</td>
      <td>${t(`shift_${entry.preferredShift}`)}</td>
      <td>${entry.captainReady ? t("yes") : t("no")}</td>
      <td><div class="row-actions"><button class="btn btn-soft" type="button">${t("delete")}</button></div></td>
    `;
    row.querySelector("button").addEventListener("click", () => removeRegistration(entry.id));
    tbody.append(row);
  });
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value ?? "";
}

function setInput(selector, value) {
  const node = document.querySelector(selector);
  if (node && document.activeElement !== node) node.value = value ?? "";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
