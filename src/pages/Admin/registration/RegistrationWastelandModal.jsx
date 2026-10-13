import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import Modal from "../../../components/Modal/Modal.jsx";
import RegistrationModalFooter from "./RegistrationModalFooter.jsx";
import { normalizeAllianceRotation } from "../../../features/registration/registrationSettings.js";

function RegistrationWastelandModal({
  open,
  onClose,
  r,
  settings,
  canEdit,
  saving,
  onSave,
}) {
  const initialAlliances = Array.isArray(settings.alliances)
    ? settings.alliances.map((item) => ({ ...item }))
    : [];

  const [activeTab, setActiveTab] = useState("wasteland");
  const [draft, setDraft] = useState(() => ({
    hostAlliance: settings.hostAlliance || "",
    governor: settings.governor || "",
    captureRegion1: settings.captureRegion1 === true,
    captureRegion2: settings.captureRegion2 === true,
    alliances: initialAlliances,
    allianceRotation: normalizeAllianceRotation(
      settings.allianceRotation,
      initialAlliances,
    ),
  }));
  const [allianceTag, setAllianceTag] = useState("");
  const [allianceName, setAllianceName] = useState("");

  const hostAllianceExists = useMemo(
    () => draft.alliances.some((alliance) => alliance.tag === draft.hostAlliance),
    [draft.alliances, draft.hostAlliance],
  );

  const alliancesByTag = useMemo(
    () => new Map(draft.alliances.map((alliance) => [alliance.tag, alliance])),
    [draft.alliances],
  );

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function addAlliance() {
    const tag = allianceTag.trim().toUpperCase();
    const name = allianceName.trim();

    if (tag.length !== 3 || !name) {
      return;
    }

    if (draft.alliances.some((alliance) => alliance.tag === tag)) {
      return;
    }

    setDraft((current) => ({
      ...current,
      alliances: [...current.alliances, { tag, name }],
      allianceRotation: [...current.allianceRotation, tag],
    }));
    setAllianceTag("");
    setAllianceName("");
  }

  function removeAlliance(tag) {
    setDraft((current) => ({
      ...current,
      alliances: current.alliances.filter((alliance) => alliance.tag !== tag),
      allianceRotation: current.allianceRotation.filter((item) => item !== tag),
      hostAlliance: current.hostAlliance === tag ? "" : current.hostAlliance,
    }));
  }

  function moveRotation(tag, direction) {
    setDraft((current) => {
      const rotation = [...current.allianceRotation];
      const index = rotation.indexOf(tag);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= rotation.length) {
        return current;
      }

      [rotation[index], rotation[nextIndex]] = [rotation[nextIndex], rotation[index]];

      return {
        ...current,
        allianceRotation: rotation,
      };
    });
  }

  async function handleSave() {
    await onSave(draft);
  }

  const canAddAlliance =
    canEdit &&
    allianceTag.trim().length === 3 &&
    allianceName.trim().length > 0 &&
    !draft.alliances.some(
      (alliance) => alliance.tag === allianceTag.trim().toUpperCase(),
    );

  const rotationLoop = draft.allianceRotation.length
    ? [...draft.allianceRotation, draft.allianceRotation[0]].join(" → ")
    : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="980px"
      title={r.wastelandModal.title}
      subtitle={r.wastelandModal.description}
      closeLabel={r.common.close}
      footer={
        <RegistrationModalFooter
          onClose={onClose}
          onSave={handleSave}
          cancelLabel={r.common.cancel}
          saveLabel={r.wastelandModal.save}
          savingLabel={r.common.saving}
          saving={saving}
          disabled={!canEdit}
        />
      }
    >
      <div className="registration-modal-stack">
        <div
          className="registration-modal-tabs registration-modal-tabs--three"
          role="tablist"
          aria-label={r.wastelandModal.tabsLabel}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "wasteland"}
            className={activeTab === "wasteland" ? "is-active" : ""}
            onClick={() => setActiveTab("wasteland")}
          >
            {r.wastelandModal.wastelandTab}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "alliances"}
            className={activeTab === "alliances" ? "is-active" : ""}
            onClick={() => setActiveTab("alliances")}
          >
            {r.wastelandModal.alliancesTab}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "rotation"}
            className={activeTab === "rotation" ? "is-active" : ""}
            onClick={() => setActiveTab("rotation")}
          >
            {r.wastelandModal.rotationTab}
          </button>
        </div>

        {activeTab === "wasteland" && (
          <section className="registration-modal-section registration-modal-section--compact">
            <h3>{r.wastelandModal.detailsTitle}</h3>

            <div className="admin-form-grid admin-form-grid--two">
              <label className="admin-field">
                <span>{r.wastelandModal.hostAlliance}</span>
                <select
                  value={hostAllianceExists ? draft.hostAlliance : ""}
                  disabled={!canEdit}
                  onChange={(event) => update("hostAlliance", event.target.value)}
                >
                  <option value="">{r.wastelandModal.hostAlliancePlaceholder}</option>
                  {draft.alliances.map((alliance) => (
                    <option key={alliance.tag} value={alliance.tag}>
                      {alliance.tag} — {alliance.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span>{r.wastelandModal.governor}</span>
                <input
                  type="text"
                  value={draft.governor}
                  disabled={!canEdit}
                  placeholder={r.wastelandModal.governorPlaceholder}
                  onChange={(event) => update("governor", event.target.value)}
                />
              </label>
            </div>

            <div className="registration-choice-grid registration-choice-grid--two registration-choice-grid--spaced">
              <label className="registration-choice-option">
                <input
                  type="checkbox"
                  checked={draft.captureRegion1}
                  disabled={!canEdit}
                  onChange={(event) => update("captureRegion1", event.target.checked)}
                />
                <span>{r.wastelandModal.captureRegion1}</span>
              </label>

              <label className="registration-choice-option">
                <input
                  type="checkbox"
                  checked={draft.captureRegion2}
                  disabled={!canEdit}
                  onChange={(event) => update("captureRegion2", event.target.checked)}
                />
                <span>{r.wastelandModal.captureRegion2}</span>
              </label>
            </div>
          </section>
        )}

        {activeTab === "alliances" && (
          <section className="registration-modal-section registration-modal-section--compact">
            <h3>{r.wastelandModal.alliancesTitle}</h3>

            <div className="registration-alliance-add">
              <label className="admin-field">
                <span>{r.wastelandModal.allianceTag}</span>
                <input
                  type="text"
                  value={allianceTag}
                  maxLength={3}
                  disabled={!canEdit}
                  placeholder={r.wastelandModal.allianceTagPlaceholder}
                  onChange={(event) => setAllianceTag(event.target.value.toUpperCase())}
                />
              </label>

              <label className="admin-field">
                <span>{r.wastelandModal.allianceFullName}</span>
                <input
                  type="text"
                  value={allianceName}
                  disabled={!canEdit}
                  placeholder={r.wastelandModal.allianceFullNamePlaceholder}
                  onChange={(event) => setAllianceName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addAlliance();
                    }
                  }}
                />
              </label>

              <button
                type="button"
                className="registration-secondary-button registration-alliance-add__button"
                disabled={!canAddAlliance}
                onClick={addAlliance}
              >
                <Plus size={17} aria-hidden="true" />
                {r.wastelandModal.addAlliance}
              </button>
            </div>

            {draft.alliances.length === 0 ? (
              <div className="registration-empty-state">
                {r.wastelandModal.alliancesEmpty}
              </div>
            ) : (
              <div className="registration-alliance-list">
                {draft.alliances.map((alliance) => (
                  <div key={alliance.tag} className="registration-alliance-item">
                    <strong>{alliance.tag}</strong>
                    <span>{alliance.name}</span>
                    <button
                      type="button"
                      disabled={!canEdit}
                      aria-label={r.wastelandModal.remove}
                      onClick={() => removeAlliance(alliance.tag)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "rotation" && (
          <section className="registration-modal-section registration-modal-section--compact">
            <div className="registration-rotation-head">
              <h3>{r.wastelandModal.rotationTitle}</h3>
              {rotationLoop && <span>{rotationLoop}</span>}
            </div>

            {draft.allianceRotation.length === 0 ? (
              <div className="registration-empty-state">
                {r.wastelandModal.rotationEmpty}
              </div>
            ) : (
              <div className="registration-rotation-list">
                {draft.allianceRotation.map((tag, index) => {
                  const alliance = alliancesByTag.get(tag);

                  if (!alliance) {
                    return null;
                  }

                  return (
                    <div key={tag} className="registration-rotation-item">
                      <span className="registration-rotation-item__number">
                        {index + 1}
                      </span>
                      <strong>{alliance.tag}</strong>
                      <span className="registration-rotation-item__name">
                        {alliance.name}
                      </span>
                      <div className="registration-rotation-item__actions">
                        <button
                          type="button"
                          disabled={!canEdit || index === 0}
                          aria-label={r.wastelandModal.moveUp}
                          onClick={() => moveRotation(tag, -1)}
                        >
                          <ArrowUp size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          disabled={!canEdit || index === draft.allianceRotation.length - 1}
                          aria-label={r.wastelandModal.moveDown}
                          onClick={() => moveRotation(tag, 1)}
                        >
                          <ArrowDown size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </Modal>
  );
}

export default RegistrationWastelandModal;
