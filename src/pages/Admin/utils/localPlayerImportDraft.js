export const PLAYER_IMPORT_DRAFT_STORAGE_KEY =
  "wasteland-player-import-draft-v2";

export const PLAYER_IMPORT_DRAFT_EVENT =
  "wasteland-player-import-draft-updated";

function emitDraftUpdated() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent(PLAYER_IMPORT_DRAFT_EVENT));
}

export function loadPlayerImportDraft() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(PLAYER_IMPORT_DRAFT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed?.fileData?.rows ? parsed : null;
  } catch {
    return null;
  }
}

export function savePlayerImportDraft(draft) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    PLAYER_IMPORT_DRAFT_STORAGE_KEY,
    JSON.stringify(draft),
  );
  emitDraftUpdated();
}

export function clearPlayerImportDraft() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(PLAYER_IMPORT_DRAFT_STORAGE_KEY);
  emitDraftUpdated();
}

