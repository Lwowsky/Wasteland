import "./RouteLoading.css";

function RouteLoading() {
  return (
    <div className="route-loading" aria-busy="true">
      <span className="route-loading__spinner" aria-hidden="true" />
    </div>
  );
}

export default RouteLoading;
