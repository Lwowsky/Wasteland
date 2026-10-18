import PagePanel from "../../components/PagePanel/PagePanel.jsx";
import TurnstileWidget from "../../components/Turnstile/TurnstileWidget.jsx";
import { turnstileEnabled } from "../../components/Turnstile/turnstileConfig.js";
import ExtraSquadsSection from "../../features/registration/components/ExtraSquadsSection.jsx";
import PlayerSection from "../../features/registration/components/PlayerSection.jsx";
import ReadinessSection from "../../features/registration/components/ReadinessSection.jsx";
import ShiftSection from "../../features/registration/components/ShiftSection.jsx";
import PlayerTemplateSelector from "../../features/playerTemplates/PlayerTemplateSelector.jsx";
import CommentSection from "./CommentSection.jsx";
import CustomFieldsSection from "./CustomFieldsSection.jsx";
import RegistrationFeedback from "./RegistrationFeedback.jsx";
import RegistrationHeader from "./RegistrationHeader.jsx";
import RegistrationUnavailable from "./RegistrationUnavailable.jsx";
import { getSubmitErrorMessage } from "./registrationMessages.js";
import useRegistrationForm from "./useRegistrationForm.js";

function RegistrationSection({
  t,
  language,
  useLocalTime,
  registrationConfig,
}) {
  const form = useRegistrationForm(registrationConfig);
  const {
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
    challengeToken,
    setChallengeToken,
    challengeNonce,
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
  } = form;

  if (!registrationConfig.enabled) {
    return (
      <RegistrationUnavailable
        t={t}
        rules={rules}
        reason={registrationConfig.reason}
        language={language}
        useLocalTime={useLocalTime}
      />
    );
  }

  const submitErrorMessage = submitErrorCode
    ? getSubmitErrorMessage(submitErrorCode, t)
    : "";
  const templateMessage = templateMessageKey
    ? t.registration.template[templateMessageKey]
    : "";

  return (
    <section id="registration" className="registration">
      <PagePanel className="registration__panel">
        <RegistrationHeader t={t} />

        <RegistrationFeedback
          t={t}
          success={submitSuccess}
          errorMessage={submitErrorMessage}
          feedbackRef={feedbackRef}
        />

        <form className="registration__form" onSubmit={handleSubmit} noValidate>
          <PlayerTemplateSelector
            t={t}
            onApply={applyPlayerTemplate}
            onSave={saveCurrentAsTemplate}
            canSave={Boolean(registrationData.nickname.trim())}
            templateMessage={templateMessage}
          />

          <PlayerSection
            t={t}
            data={registrationData}
            setData={setRegistrationData}
            requiredFields={requiredFields}
            visibleFields={visibleFields}
            availableTiers={availableTiers}
            alliances={alliances}
            invalidFields={invalidFieldSet}
          />

          <ReadinessSection
            t={t}
            data={registrationData}
            setData={setRegistrationData}
            requiredFields={requiredFields}
            visibleFields={visibleFields}
            invalidFields={invalidFieldSet}
          />

          <ShiftSection
            t={t}
            language={language}
            useLocalTime={useLocalTime}
            data={registrationData}
            setData={setRegistrationData}
            availableShifts={rules.availableShifts}
            required={isRequired("shift")}
            visible={isVisible("shift")}
            invalid={invalidFieldSet.has("shift")}
          />

          <ExtraSquadsSection
            t={t}
            data={registrationData}
            setData={setRegistrationData}
            required={isRequired("extraSquads")}
            availableTiers={availableTiers}
            visible={isVisible("extraSquads")}
            invalid={invalidFieldSet.has("extraSquads")}
          />

          <CustomFieldsSection
            t={t}
            fields={visibleCustomFields}
            values={registrationData.customFields}
            invalidFields={invalidFieldSet}
            onChange={handleCustomFieldChange}
          />

          <CommentSection
            t={t}
            value={registrationData.comment}
            required={isRequired("comment")}
            visible={isVisible("comment")}
            invalid={invalidFieldSet.has("comment")}
            onChange={handleCommentChange}
          />

          {turnstileEnabled && <TurnstileWidget key={challengeNonce} language={language} action="registration" onTokenChange={setChallengeToken} />}

          <div className="registration__actions">
            <button
              type="submit"
              className="registration__submit"
              disabled={submitting || (turnstileEnabled && !challengeToken)}
            >
              {submitting ? t.registration.submitting : t.registration.submit}
            </button>

            <button
              type="button"
              className="registration__reset"
              disabled={submitting}
              onClick={handleReset}
            >
              {t.registration.reset}
            </button>
          </div>
        </form>
      </PagePanel>
    </section>
  );
}

export default RegistrationSection;
