import { MessageSquare } from "lucide-react";
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
        <MessageSquare size={22} aria-hidden="true" />
        <h2>
          {t.registration.comment}
          {required && <span className="form-field__required"> *</span>}
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
