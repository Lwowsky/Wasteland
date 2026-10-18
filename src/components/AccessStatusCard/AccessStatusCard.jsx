import PagePanel from "../PagePanel/PagePanel.jsx";

// One presentation for closed registration, protected player roster and plan.
// State/permission checks remain in each parent; this component has no I/O.
export default function AccessStatusCard({ iconSrc, title, heading, text, children }) {
  return (
    <PagePanel className="content-access-panel">
      <div className="content-access-icon" aria-hidden="true">
        <img src={iconSrc} alt="" width="76" height="76" />
      </div>
      <h1>{title}</h1>
      {heading && <h2>{heading}</h2>}
      {text && <p role="status">{text}</p>}
      {children}
    </PagePanel>
  );
}
