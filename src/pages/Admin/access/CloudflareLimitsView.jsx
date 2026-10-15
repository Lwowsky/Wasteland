import { useCallback, useEffect, useMemo, useState } from "react";
import { adminRequest } from "../services/adminApi.js";
import "./CloudflareLimitsView.css";

const USAGE_METRICS = [
  { key: "workers", labelKey: "metricWorkers", limit: 100000, accent: "workers" },
  { key: "d1Reads", labelKey: "metricD1Reads", limit: 5000000, accent: "reads" },
  { key: "d1Writes", labelKey: "metricD1Writes", limit: 100000, accent: "writes" },
];

const DETAILS = [
  { labelKey: "detailWorkersCount", value: "100" },
  { labelKey: "detailCron", value: "5" },
  { labelKey: "detailCpu", value: "10 ms", hintKey: "perRequest" },
  { labelKey: "detailMemory", value: "128 MB", hintKey: "perRequest" },
  { labelKey: "detailD1Databases", value: "10" },
  { labelKey: "detailD1Storage", value: "5 GB" },
  { labelKey: "detailD1DatabaseSize", value: "500 MB", hintKey: "perDatabase" },
  { labelKey: "detailD1Queries", value: "50", hintKey: "perRequest" },
];

const FORMAT = new Intl.NumberFormat("uk-UA");

function formatValue(value) {
  return Number.isFinite(value) ? FORMAT.format(value) : "—";
}

function UsageCard({ title, used, limit, leftLabel, limitLabel, accent }) {
  const percent = Number.isFinite(used) ? Math.min(100, (used / limit) * 100) : 0;
  const remaining = Number.isFinite(used) ? Math.max(0, limit - used) : null;

  return (
    <article className={`cf-usage-card cf-usage-card--${accent}`}>
      <div className="cf-usage-card__top">
        <span className="cf-usage-card__label">{title}</span>
        <span className="cf-usage-card__badge">{limitLabel}</span>
      </div>
      <div className="cf-usage-card__numbers">
        <strong>{formatValue(used)}</strong>
        <span>/ {FORMAT.format(limit)}</span>
      </div>
      <div className="cf-usage-card__track" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="cf-usage-card__meta">
        <span>{leftLabel}</span>
        <strong>{remaining !== null ? FORMAT.format(remaining) : "—"}</strong>
      </div>
    </article>
  );
}

export default function CloudflareLimitsView({ t }) {
  const copy = t.access.cloudflareLimits;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminRequest("/api/admin/cloudflare-metrics");
      setData(response);
    } catch (requestError) {
      setError(requestError.message || "CLOUDFLARE_ANALYTICS_UNAVAILABLE");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    adminRequest("/api/admin/cloudflare-metrics")
      .then((response) => { if (active) setData(response); })
      .catch((requestError) => {
        if (active) setError(requestError.message || "CLOUDFLARE_ANALYTICS_UNAVAILABLE");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const summaryItems = useMemo(
    () => USAGE_METRICS.map((metric) => ({
      ...metric,
      used: data?.metrics?.[metric.key],
    })),
    [data],
  );

  return (
    <section className="cloudflare-limits" aria-label={copy.title}>
      <header className="cf-head">
        <div className="cf-head__content">
          <h2>{copy.compactTitle}</h2>
        </div>
        <button
          type="button"
          className="cf-refresh"
          onClick={() => {
            void reload();
          }}
          disabled={loading}
        >
          {loading ? copy.loadingMetrics : copy.refreshMetrics}
        </button>
      </header>

      {error ? (
        <p role="alert" className="cf-error">
          {copy.analyticsError}: {error}
        </p>
      ) : null}

      <div className="cf-summary-grid">
        {summaryItems.map((item) => (
          <UsageCard
            key={item.key}
            title={copy[item.labelKey]}
            used={item.used}
            limit={item.limit}
            leftLabel={copy.left}
            limitLabel={copy.dailyLimit}
            accent={item.accent}
          />
        ))}
      </div>

      <div className="cf-details-toggle-row">
        <button
          type="button"
          className="cf-toggle"
          aria-expanded={showDetails}
          onClick={() => setShowDetails((prev) => !prev)}
        >
          {showDetails ? copy.hideDetails : copy.showDetails}
        </button>
      </div>

      {showDetails ? (
        <div className="cf-details-grid">
          {DETAILS.map((item) => (
            <article className="cf-detail-card" key={item.labelKey}>
              <span>{copy[item.labelKey]}</span>
              <strong>{item.value}</strong>
              {item.hintKey ? <small>{copy[item.hintKey]}</small> : null}
            </article>
          ))}
        </div>
      ) : null}

      <footer className="cf-footer">
        <span>
          {data?.dateUtc && data?.updatedAt
            ? `${data.dateUtc} ${copy.utcLabel} · ${copy.updated}: ${new Date(data.updatedAt).toLocaleTimeString()}`
            : copy.noData}
        </span>
        <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer">
          {copy.open}
        </a>
      </footer>
    </section>
  );
}
