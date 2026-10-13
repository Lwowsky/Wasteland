import { useMemo, useState } from "react";

import {
  buildPlayersImportPreview,
  getImportValueGroups,
  getUnmappedHeaders,
  makeImportCustomFieldId,
  PLAYER_IMPORT_FIELDS,
} from "../utils/importPlayers.js";
import { IMPORT_VALUE_FIELDS } from "./playerImportMapping.js";

function createInitialValueMappings(initialValueMappings) {
  return Object.fromEntries(
    IMPORT_VALUE_FIELDS.map((field) => [
      field,
      { ...(initialValueMappings?.[field] || {}) },
    ]),
  );
}

export default function usePlayerImportMapping({
  fileData,
  players,
  registrationSettings,
  initialMapping,
  initialManualFields,
  initialValueMappings,
  onSaveMapping,
  onStage,
}) {
  const configuredCustomFields = useMemo(
    () =>
      (registrationSettings?.customFields || []).map((field) => ({
        id: field.id,
        label: field.label,
        custom: true,
        configured: true,
      })),
    [registrationSettings?.customFields],
  );

  const [mapping, setMapping] = useState(() => ({ ...initialMapping }));
  const [manualFields, setManualFields] = useState(() =>
    initialManualFields.map((field) => ({ ...field })),
  );
  const [valueMappings, setValueMappings] = useState(() =>
    createInitialValueMappings(initialValueMappings),
  );
  const [destination, setDestination] = useState("staging");
  const [saved, setSaved] = useState(false);

  const customTargets = useMemo(
    () => [...configuredCustomFields, ...manualFields],
    [configuredCustomFields, manualFields],
  );

  const preview = useMemo(
    () =>
      buildPlayersImportPreview({
        fileData,
        mapping,
        customTargets,
        existingPlayers: players,
        valueMappings,
      }),
    [fileData, mapping, customTargets, players, valueMappings],
  );

  const valueGroups = useMemo(
    () => getImportValueGroups({ fileData, mapping, valueMappings }),
    [fileData, mapping, valueMappings],
  );

  const unmappedHeaders = useMemo(
    () => getUnmappedHeaders(fileData.headers, mapping),
    [fileData.headers, mapping],
  );

  const mappedValueSections = IMPORT_VALUE_FIELDS.filter(
    (field) => valueGroups[field]?.length > 0,
  );

  function markChanged() {
    setSaved(false);
  }

  function updateMapping(fieldId, header) {
    markChanged();
    setMapping((current) => ({ ...current, [fieldId]: header }));
  }

  function updateValueMapping(field, key, value) {
    markChanged();
    setValueMappings((current) => ({
      ...current,
      [field]: {
        ...(current[field] || {}),
        [key]: value,
      },
    }));
  }

  function addUnknownColumn(header) {
    const usedIds = [
      ...PLAYER_IMPORT_FIELDS,
      ...configuredCustomFields.map((field) => field.id),
      ...manualFields.map((field) => field.id),
    ];
    const id = makeImportCustomFieldId(header, usedIds);

    setManualFields((current) => [
      ...current,
      { id, label: header, custom: true, configured: false },
    ]);
    setMapping((current) => ({ ...current, [id]: header }));
    markChanged();
  }

  function removeManualField(fieldId) {
    setManualFields((current) =>
      current.filter((field) => field.id !== fieldId),
    );
    setMapping((current) => {
      const next = { ...current };
      delete next[fieldId];
      return next;
    });
    markChanged();
  }

  function renameManualField(fieldId, label) {
    setManualFields((current) =>
      current.map((field) =>
        field.id === fieldId ? { ...field, label } : field,
      ),
    );
    markChanged();
  }

  function saveMapping() {
    onSaveMapping?.({ mapping, manualFields, valueMappings });
    setSaved(true);
  }

  function stageDraft() {
    onStage?.({
      fileData,
      mapping,
      manualFields,
      valueMappings,
      preview,
    });
  }

  return {
    mapping,
    manualFields,
    valueMappings,
    destination,
    setDestination,
    saved,
    customTargets,
    preview,
    valueGroups,
    unmappedHeaders,
    mappedValueSections,
    canImport:
      preview.valid > 0 &&
      preview.invalid === 0 &&
      preview.duplicates === 0,
    updateMapping,
    updateValueMapping,
    addUnknownColumn,
    removeManualField,
    renameManualField,
    saveMapping,
    stageDraft,
  };
}
