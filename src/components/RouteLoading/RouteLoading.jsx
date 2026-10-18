import "./RouteLoading.css";

function RouteLoading() {
  return (
    <main className="page route-loading" aria-busy="true">
      <span className="route-loading__spinner" aria-hidden="true" />
    </main>
  );
}

export default RouteLoading;
