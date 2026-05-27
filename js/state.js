const STORE_KEY = "wkd-region-forms-v1";

const emptyState = {
  version: 1,
  lang: "uk",
  user: null,
  activeFormId: "",
  forms: [],
  registrations: []
};

let state = readState();
const listeners = new Set();

function readState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return structuredClone(emptyState);
    const saved = JSON.parse(raw);
    return normalizeState({ ...emptyState, ...saved });
  } catch (error) {
    console.warn("Cannot read local state", error);
    return structuredClone(emptyState);
  }
}

function normalizeState(next) {
  return {
    ...next,
    forms: Array.isArray(next.forms) ? next.forms : [],
    registrations: Array.isArray(next.registrations) ? next.registrations : []
  };
}

function persist() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function emit() {
  const snapshot = getState();
  listeners.forEach((listener) => listener(snapshot));
}

function patch(mutator) {
  const draft = structuredClone(state);
  mutator(draft);
  state = normalizeState(draft);
  persist();
  emit();
  return getState();
}

function makeId(prefix) {
  const cryptoId = crypto?.randomUUID?.();
  return `${prefix}_${cryptoId || Date.now().toString(36)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export function getState() {
  return structuredClone(state);
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setLanguage(lang) {
  patch((draft) => {
    draft.lang = lang || "uk";
  });
}

export function setUser(user) {
  patch((draft) => {
    draft.user = user || null;
  });
}

export function createBlankForm(user) {
  return {
    id: makeId("form"),
    ownerUid: user?.uid || "guest",
    ownerName: user?.name || "Guest",
    regionNumber: "",
    title: "",
    eventDate: "",
    status: "draft",
    shifts: ["1", "2"],
    description: "",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

export function upsertForm(form) {
  const normalized = {
    ...form,
    id: form.id || makeId("form"),
    shifts: Array.isArray(form.shifts) && form.shifts.length ? form.shifts : ["1", "2"],
    updatedAt: nowIso()
  };

  patch((draft) => {
    const index = draft.forms.findIndex((item) => item.id === normalized.id);
    if (index >= 0) draft.forms[index] = { ...draft.forms[index], ...normalized };
    else draft.forms.unshift({ ...normalized, createdAt: normalized.createdAt || nowIso() });
    draft.activeFormId = normalized.id;
  });

  return normalized;
}

export function mergeForms(forms = []) {
  patch((draft) => {
    forms.forEach((form) => {
      const index = draft.forms.findIndex((item) => item.id === form.id);
      if (index >= 0) draft.forms[index] = { ...draft.forms[index], ...form };
      else draft.forms.unshift(form);
    });
  });
}

export function removeForm(formId) {
  patch((draft) => {
    draft.forms = draft.forms.filter((form) => form.id !== formId);
    draft.registrations = draft.registrations.filter((item) => item.formId !== formId);
    if (draft.activeFormId === formId) draft.activeFormId = draft.forms[0]?.id || "";
  });
}

export function setActiveForm(formId) {
  patch((draft) => {
    draft.activeFormId = formId || "";
  });
}

export function getActiveForm(snapshot = state) {
  return snapshot.forms.find((form) => form.id === snapshot.activeFormId) || snapshot.forms[0] || null;
}

export function createRegistration(data) {
  const entry = {
    id: makeId("reg"),
    formId: data.formId,
    playerName: data.playerName.trim(),
    allianceTag: data.allianceTag.trim(),
    troopType: data.troopType,
    tier: data.tier,
    marchSize: Number(data.marchSize || 0),
    rallySize: Number(data.rallySize || 0),
    preferredShift: data.preferredShift,
    captainReady: Boolean(data.captainReady),
    comment: data.comment.trim(),
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  patch((draft) => {
    draft.registrations.unshift(entry);
  });

  return entry;
}

export function mergeRegistrations(registrations = []) {
  patch((draft) => {
    registrations.forEach((registration) => {
      const index = draft.registrations.findIndex((item) => item.id === registration.id);
      if (index >= 0) draft.registrations[index] = { ...draft.registrations[index], ...registration };
      else draft.registrations.unshift(registration);
    });
  });
}

export function removeRegistration(id) {
  patch((draft) => {
    draft.registrations = draft.registrations.filter((item) => item.id !== id);
  });
}

export function getRegistrationsForForm(formId, snapshot = state) {
  return snapshot.registrations.filter((item) => item.formId === formId);
}

export function exportSnapshot() {
  return JSON.stringify(getState(), null, 2);
}
