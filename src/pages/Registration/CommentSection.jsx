import { REGISTRATION_FIELD_ICONS } from "../../features/playerTemplates/templateAssets.js";
import "./CommentSection.css";

function CommentSection({
  t,
  value,
  required,
  visible,
  invalid,
  onChange,
}) {
  if (!visible) {
    return null;
  }

  return (
    <section
      className={`registration-section registration-section--comment ${
        invalid ? "registration-field--invalid" : ""
      }`}
      data-registration-field="comment"
    >
      <div className="registration-section__heading">
        <img
          className="registration-section__heading-image registration-section__heading-image--comment"
          src={REGISTRATION_FIELD_ICONS.comment}
          alt=""
          aria-hidden="true"
        />
        <h2>
          {t.registration.comment}
          {required && <span className="form-field__required" aria-hidden="true">*</span>}
        </h2>
      </div>

      <textarea
        className="registration__textarea"
        name="comment"
        rows="4"
        value={value}
        required={required}
        onChange={onChange}
        placeholder={t.registration.commentPlaceholder}
      />
    </section>
  );
}

export default CommentSection;
