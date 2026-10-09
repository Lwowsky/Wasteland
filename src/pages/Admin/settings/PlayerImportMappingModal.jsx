import { HardDrive, Save, Upload } from "lucide-react";

import Modal from "../../../components/Modal/Modal.jsx";
import {
  ImportDestinationSection,
  ImportFieldMappingSection,
  ImportUnknownColumnsSection,
  ImportValueMappingSection,
} from "./PlayerImportMappingFields.jsx";
import PlayerImportPreview from "./PlayerImportPreview.jsx";
import { getImportTargets } from "./playerImportMapping.js";
import usePlayerImportMapping from "./usePlayerImportMapping.js";
import "./PlayerImportShared.css";
import "./PlayerImportMappingModal.css";

function PlayerImportMappingModal({
  open,
  onClose,
  t,
  fileData,
  players,
  registrationSettings,
  initialMapping,
  initialManualFields = [],
  initialValueMappings = {},
  onImport,
  onStage,
  importing,
  onSaveMapping,
}) {
  const controller = usePlayerImportMapping({
    fileData,
    players,
    registrationSettings,
    initialMapping,
    initialManualFields,
    initialValueMappings,
    onSaveMapping,
    onStage,
  });
  const targets = getImportTargets(t, controller.customTargets);
  const canImport = controller.canImport && !importing;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.mapping.title}
      subtitle={t.mapping.subtitle.replace("{{file}}", fileData.fileName)}
      width="1180px"
      closeLabel={t.close}
      footer={
        <div className="settings-import-modal-footer">
          <div>
            <strong>{controller.preview.valid}</strong> {t.preview.valid}
            {controller.preview.invalid > 0 && (
              <span className="is-error">
                {" "}· {controller.preview.invalid}
                {t.preview.invalid}
              </span>
            )}
            {controller.preview.duplicates > 0 && (
              <span className="is-warning">
                {" "}· {controller.preview.duplicates}
                {t.preview.duplicates}
              </span>
            )}
          </div>

          <div className="settings-import-modal-footer__actions">
            <button
              type="button"
              className="admin-secondary-button"
              onClick={onClose}
            >
              {t.cancel}
            </button>

            {controller.destination === "staging" ? (
              <button
                type="button"
                className="admin-primary-button"
                disabled={controller.preview.total === 0}
                onClick={controller.stageDraft}
              >
                <HardDrive size={17} />
                {t.destination.saveDraft.replace(
                  "{{count}}",
                  controller.preview.total,
                )}
              </button>
            ) : (
              <button
                type="button"
                className="admin-primary-button"
                disabled={!canImport}
                onClick={() =>
                  onImport(
                    controller.preview.rows
                      .filter((row) => row.valid)
                      .map((row) => row.player),
                  )
                }
              >
                <Upload size={17} />
                {importing
                  ? t.importing
                  : t.mapping.importCount.replace(
                      "{{count}}",
                      controller.preview.valid,
                    )}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="settings-import-wizard">
        <section className="settings-import-file-summary">
          <div>
            <strong>{fileData.fileName}</strong>
            <span>
              {t.mapping.fileSummary
                .replace("{{columns}}", fileData.headers.length)
                .replace("{{rows}}", fileData.total)}
            </span>
          </div>
          <button
            type="button"
            className="admin-secondary-button"
            onClick={controller.saveMapping}
          >
            <Save size={16} />
            {controller.saved ? t.mapping.saved : t.mapping.saveMapping}
          </button>
        </section>

        <ImportDestinationSection
          t={t}
          destination={controller.destination}
          onChange={controller.setDestination}
        />

        <ImportFieldMappingSection
          t={t}
          fileData={fileData}
          targets={targets}
          mapping={controller.mapping}
          onUpdateMapping={controller.updateMapping}
          onRenameManualField={controller.renameManualField}
          onRemoveManualField={controller.removeManualField}
        />

        <ImportValueMappingSection
          t={t}
          mappedValueSections={controller.mappedValueSections}
          valueGroups={controller.valueGroups}
          valueMappings={controller.valueMappings}
          onUpdateValueMapping={controller.updateValueMapping}
        />

        <ImportUnknownColumnsSection
          t={t}
          unmappedHeaders={controller.unmappedHeaders}
          onAddUnknownColumn={controller.addUnknownColumn}
        />

        <PlayerImportPreview
          t={t}
          preview={controller.preview}
          destination={controller.destination}
        />
      </div>
    </Modal>
  );
}

export default PlayerImportMappingModal;
