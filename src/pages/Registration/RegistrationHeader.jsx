import { TEMPLATE_ASSETS } from "../../features/playerTemplates/templateAssets.js";

function RegistrationHeader({ t }) {
  return (
    <div className="registration__header">
      <div className="registration__header-icon">
        <img src={TEMPLATE_ASSETS.templates} alt="" aria-hidden="true" />
      </div>

      <div>
        <h1 className="registration__title">{t.registration.title}</h1>
        <p className="registration__text">{t.registration.text}</p>
      </div>
    </div>
  );
}

export default RegistrationHeader;
