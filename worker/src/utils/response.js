import { JSON_HEADERS } from "../config/headers.js";

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,

    headers: {
      ...JSON_HEADERS,
      ...extraHeaders,
    },
  });
}
