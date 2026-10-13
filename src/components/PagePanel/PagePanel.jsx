import "./PagePanel.css";

function PagePanel({ children, className = "" }) {
  return <div className={`page-panel ${className}`.trim()}>{children}</div>;
}

export default PagePanel;
