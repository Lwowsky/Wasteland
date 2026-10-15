import { verifyAdminRequest } from "../auth/adminAuth.js";
import { json } from "../utils/response.js";

const GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql";

const WORKERS_ACCOUNT_QUERY = `query ($account: string!, $start: Time!, $end: Time!) {
 viewer { accounts(filter: {accountTag: $account}) {
  workersInvocationsAdaptive(limit: 10000, filter: {datetime_geq: $start, datetime_leq: $end}) { sum {requests} }
 } }
}`;

const D1_ACCOUNT_QUERY = `query ($account: string!, $start: Date!, $end: Date!) {
 viewer { accounts(filter: {accountTag: $account}) {
  d1AnalyticsAdaptiveGroups(limit: 10000, filter: {date_geq: $start, date_leq: $end}) { sum {rowsRead rowsWritten} }
 } }
}`;

async function queryAnalytics(token, query, variables) {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`CLOUDFLARE_HTTP_${res.status}`);
  }

  const body = await res.json();

  if (body.errors?.length) {
    throw new Error("CLOUDFLARE_ANALYTICS_QUERY_FAILED");
  }

  const account = body.data?.viewer?.accounts?.[0];

  if (!account) {
    throw new Error("CLOUDFLARE_ACCOUNT_NOT_FOUND");
  }

  return account;
}

function totalMetric(settled, dataset, field) {
  if (settled.status !== "fulfilled") {
    return null;
  }

  const rows = settled.value[dataset];

  if (!Array.isArray(rows)) {
    return null;
  }

  return rows.reduce((total, item) => total + (Number(item?.sum?.[field]) || 0), 0);
}

export async function handleCloudflareMetrics(request, env) {
  const admin = await verifyAdminRequest(request, env);

  if (!admin.ok) {
    return json({ success: false, error: admin.error }, admin.status || 401);
  }

  if (admin.role !== "owner") {
    return json({ success: false, error: "FORBIDDEN" }, 403);
  }

  if (!env.CLOUDFLARE_ANALYTICS_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) {
    return json({ success: false, error: "CLOUDFLARE_ANALYTICS_NOT_CONFIGURED" }, 503);
  }

  const now = new Date();
  const dateUtc = now.toISOString().slice(0, 10);
  const start = `${dateUtc}T00:00:00Z`;
  const end = now.toISOString();
  const token = env.CLOUDFLARE_ANALYTICS_TOKEN;
  const account = env.CLOUDFLARE_ACCOUNT_ID;

  const [workersResult, d1Result] = await Promise.allSettled([
    queryAnalytics(token, WORKERS_ACCOUNT_QUERY, { account, start, end }),
    queryAnalytics(token, D1_ACCOUNT_QUERY, { account, start: dateUtc, end: dateUtc }),
  ]);

  if ([workersResult, d1Result].every((result) => result.status === "rejected")) {
    return json({ success: false, error: "CLOUDFLARE_ANALYTICS_UNAVAILABLE" }, 502);
  }

  return json({
    success: true,
    dateUtc,
    updatedAt: end,
    metrics: {
      workers: totalMetric(workersResult, "workersInvocationsAdaptive", "requests"),
      d1Reads: totalMetric(d1Result, "d1AnalyticsAdaptiveGroups", "rowsRead"),
      d1Writes: totalMetric(d1Result, "d1AnalyticsAdaptiveGroups", "rowsWritten"),
    },
  }, 200, { "Cache-Control": "private, no-store" });
}
