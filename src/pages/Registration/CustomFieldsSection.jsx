import { ListPlus } from "lucide-react";
import "./CustomFieldsSection.css";

function CustomFieldsSection({
  t,
  fields,
  values,
  invalidFields,
  onChange,
}) {
  if (fields.length === 0) {
    return null;
  }

  return (
    <section className="registration-section">
      <div className="registration-section__heading">
        <ListPlus size={22} aria-hidden="true" />
        <div>
          <h2>{t.registration.customFields.title}</h2>
          <p>{t.registration.customFields.text}</p>
        </div>
      </div>

      <div className="registration-custom-fields-grid">
        {fields.map((field) => {
          const fieldKey = `custom:${field.id}`;

          return (
            <label
              key={field.id}
              className={`form-field ${
                invalidFields.has(fieldKey)
                  ? "registration-field--invalid"
                  : ""
              }`}
              data-registration-field={fieldKey}
            >
              <span className="form-field__label">
                {field.label}
                {field.required === true && (
                  <span className="form-field__required"> *</span>
                )}
              </span>
              <input
                type="text"
                value={values?.[field.id] || ""}
                required={field.required === true}
                onChange={(event) => onChange(field.id, event.target.value)}
              />
            </label>
          );
        })}
      </div>
    </section>
  );
}

export default CustomFieldsSection;
