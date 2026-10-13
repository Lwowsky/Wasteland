import { useMemo, useRef, useState } from "react";

import { submitRegistration } from "../../features/registration/registrationApi.js";
import {
  createPlayerTemplate,
  getPlayerTemplates,
  savePlayerTemplates,
} from "../../features/playerTemplates/playerTemplatesStorage.js";
import {
  applyPlayerTemplateToRegistration,
  createEmptyRegistration,
  createTemplateUpdate,
  getInvalidRegistrationFields,
  getRegistrationFormRules,
  isRegistrationFieldRequired,
  isRegistrationFieldVisible,
} from "./registrationForm.js";

function scrollToRegistrationField(field) {
  window.requestAnimationFrame(() => {
    const target = document.querySelector(
      `[data-registration-field="${field}"]`,
    );

    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    const control = target.querySelector(
      "input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
    );

    window.setTimeout(() => control?.focus({ preventScroll: true }), 350);
  });
}

function scrollToFeedback(feedbackRef) {
  window.requestAnimationFrame(() => {
    feedbackRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  });
}

export default function useRegistrationForm(registrationConfig) {
  const formRules = useMemo(
    () => getRegistrationFormRules(registrationConfig.settings || {}),
    [registrationConfig.settings],
  );
  const {
    rules,
    visibleFields,
    requiredFields,
    availableTiers,
    alliances,
    customFields,
    visibleCustomFields,
  } = formRules;

  const [registrationData, setRegistrationData] = useState(() =>
    createEmptyRegistration(customFields),
  );
  const [templateMessageKey, setTemplateMessageKey] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitErrorCode, setSubmitErrorCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const feedbackRef = useRef(null);

  const invalidFields = useMemo(
    () =>
      validationAttempted
        ? getInvalidRegistrationFields({
            data: registrationData,
            rules,
            visibleFields,
            requiredFields,
            availableTiers,
            visibleCustomFields,
          })
        : [],
    [
      availableTiers,
      registrationData,
      requiredFields,
      rules,
      validationAttempted,
      visibleCustomFields,
      visibleFields,
    ],
  );
  const invalidFieldSet = useMemo(
    () => new Set(invalidFields),
    [invalidFields],
  );

  function clearSubmitFeedback() {
    setSubmitSuccess(false);
    setSubmitErrorCode("");
  }

  function isVisible(field) {
    return isRegistrationFieldVisible(visibleFields, field);
  }

  function isRequired(field) {
    return isRegistrationFieldRequired(
      visibleFields,
      requiredFields,
      field,
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const missingFields = getInvalidRegistrationFields({
      data: registrationData,
      rules,
      visibleFields,
      requiredFields,
      availableTiers,
      visibleCustomFields,
    });

    if (missingFields.length > 0) {
      setValidationAttempted(true);
      setSubmitSuccess(false);
      setSubmitErrorCode("REQUIRED_FIELDS");
      scrollToRegistrationField(missingFields[0]);
      return;
    }

    try {
      setSubmitting(true);
      setValidationAttempted(false);
      setSubmitErrorCode("");
      setSubmitSuccess(false);

      await submitRegistration(registrationData);

      setRegistrationData(createEmptyRegistration(customFields));
      setTemplateMessageKey("");
      setSubmitSuccess(true);
      scrollToFeedback(feedbackRef);
    } catch (error) {
      console.error("Submit registration:", error);
      setSubmitErrorCode(error.message || "REGISTRATION_FAILED");
      scrollToFeedback(feedbackRef);
    } finally {
      setSubmitting(false);
    }
  }

  function applyPlayerTemplate(template) {
    setRegistrationData((current) =>
      applyPlayerTemplateToRegistration(current, template, {
        rules,
        availableTiers,
        alliances,
      }),
    );
    setTemplateMessageKey("");
    clearSubmitFeedback();
    setValidationAttempted(false);
  }

  function saveCurrentAsTemplate() {
    const nickname = registrationData.nickname.trim();

    if (!nickname) {
      return;
    }

    const templates = getPlayerTemplates();
    const existingTemplate = templates.find(
      (template) =>
        template.nickname.trim().toLowerCase() === nickname.toLowerCase(),
    );

    if (existingTemplate) {
      savePlayerTemplates(
        templates.map((template) =>
          template.id === existingTemplate.id
            ? createTemplateUpdate(template, registrationData)
            : template,
        ),
      );
      setTemplateMessageKey("updated");
      return;
    }

    savePlayerTemplates([
      ...templates,
      createPlayerTemplate(registrationData),
    ]);
    setTemplateMessageKey("saved");
  }

  function handleCommentChange(event) {
    setRegistrationData((current) => ({
      ...current,
      comment: event.target.value,
    }));
    clearSubmitFeedback();
  }

  function handleCustomFieldChange(id, value) {
    setRegistrationData((current) => ({
      ...current,
      customFields: {
        ...current.customFields,
        [id]: value,
      },
    }));
    clearSubmitFeedback();
  }

  function handleReset() {
    setRegistrationData(createEmptyRegistration(customFields));
    setTemplateMessageKey("");
    setSubmitSuccess(false);
    setSubmitErrorCode("");
    setValidationAttempted(false);
  }

  return {
    rules,
    visibleFields,
    requiredFields,
    availableTiers,
    alliances,
    visibleCustomFields,
    registrationData,
    setRegistrationData,
    templateMessageKey,
    submitSuccess,
    submitErrorCode,
    submitting,
    feedbackRef,
    invalidFieldSet,
    isVisible,
    isRequired,
    handleSubmit,
    applyPlayerTemplate,
    saveCurrentAsTemplate,
    handleCommentChange,
    handleCustomFieldChange,
    handleReset,
  };
}
