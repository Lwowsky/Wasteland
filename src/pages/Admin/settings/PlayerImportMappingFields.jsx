import { Database, HardDrive, Plus, Trash2 } from "lucide-react";

import { IMPORT_VALUE_OPTIONS } from "../utils/importPlayers.js";
import { getImportValueLabel } from "./playerImportMapping.js";

export function ImportDestinationSection({ t, destination, onChange }) {
  return (
    <section className="settings-import-destination-section">
      <div className="settings-import-section-head">
        <div>
          <h3>{t.destination.title}</h3>
          <p>{t.destination.text}</p>
        </div>
      </div>

      <div className="settings-import-destination-grid">
        <button
          type="button"
          className={destination === "staging" ? "is-active" : ""}
          onClick={() => onChange("staging")}
        >
          <HardDrive size={22} />
          <span>
            <strong>{t.destination.staging}</strong>
            <small>{t.destination.stagingText}</small>
          </span>
        </button>
        <button
          type="button"
          className={destination === "current" ? "is-active" : ""}
          onClick={() => onChange("current")}
        >
          <Database size={22} />
          <span>
            <strong>{t.destination.current}</strong>
            <small>{t.destination.currentText}</small>
          </span>
        </button>
      </div>
    </section>
  );
}

export function ImportFieldMappingSection({
  t,
  fileData,
  targets,
  mapping,
  onUpdateMapping,
  onRenameManualField,
  onRemoveManualField,
}) {
  return (
    <section className="settings-import-mapping-section">
      <div className="settings-import-section-head">
        <div>
          <h3>{t.mapping.fieldsTitle}</h3>
          <p>{t.mapping.fieldsText}</p>
        </div>
      </div>

      <div className="settings-import-mapping-grid">
        {targets.map((target) => (
          <div key={target.id} className="settings-import-mapping-row">
            <div className="settings-import-target-label">
              {target.configured === false ? (
                <input
                  value={target.label}
                  onChange={(event) =>
                    onRenameManualField(target.id, event.target.value)
                  }
                  aria-label={t.mapping.customName}
                />
              ) : (
                <strong>{target.label}</strong>
              )}
              {target.required && <small>{t.mapping.required}</small>}
              {target.custom && <small>{t.mapping.custom}</small>}
            </div>

            <span className="settings-import-arrow">→</span>

            <select
              value={mapping[target.id] || ""}
              onChange={(event) =>
                onUpdateMapping(target.id, event.target.value)
              }
            >
              <option value="">{t.mapping.skip}</option>
              {fileData.headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>

            {target.configured === false ? (
              <button
                type="button"
                className="settings-import-remove-field"
                onClick={() => onRemoveManualField(target.id)}
                aria-label={t.mapping.removeCustom}
              >
                <Trash2 size={16} />
              </button>
            ) : (
              <span />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function ImportValueMappingSection({
  t,
  mappedValueSections,
  valueGroups,
  valueMappings,
  onUpdateValueMapping,
}) {
  if (mappedValueSections.length === 0) {
    return null;
  }

  return (
    <section className="settings-import-value-section">
      <div className="settings-import-section-head">
        <div>
          <h3>{t.valueMapping.title}</h3>
          <p>{t.valueMapping.text}</p>
        </div>
      </div>

      <div className="settings-import-value-groups">
        {mappedValueSections.map((field) => (
          <div key={field} className="settings-import-value-group">
            <h4>{t.fields[field]}</h4>
            {valueGroups[field].map((item) => {
              const options = IMPORT_VALUE_OPTIONS[field];
              const automaticValid = options.includes(item.automatic);
              const selected =
                valueMappings?.[field]?.[item.key] ||
                (automaticValid ? item.automatic : "");

              return (
                <div key={item.key} className="settings-import-value-row">
                  <span title={item.raw}>{item.raw}</span>
                  <span className="settings-import-arrow">→</span>
                  <select
                    value={selected}
                    onChange={(event) =>
                      onUpdateValueMapping(
                        field,
                        item.key,
                        event.target.value,
                      )
                    }
                  >
                    <option value="">{t.valueMapping.choose}</option>
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {getImportValueLabel(field, option, t)}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

export function ImportUnknownColumnsSection({
  t,
  unmappedHeaders,
  onAddUnknownColumn,
}) {
  if (unmappedHeaders.length === 0) {
    return null;
  }

  return (
    <section className="settings-import-unknown-section">
      <div className="settings-import-section-head">
        <div>
          <h3>{t.mapping.unknownTitle}</h3>
          <p>{t.mapping.unknownText}</p>
        </div>
      </div>

      <div className="settings-import-unknown-list">
        {unmappedHeaders.map((header) => (
          <div key={header}>
            <span>{header}</span>
            <button type="button" onClick={() => onAddUnknownColumn(header)}>
              <Plus size={15} />
              {t.mapping.addCustom}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
