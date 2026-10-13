export function getCache() {
  return caches.default;
}

export function getCacheRequest(request) {
  const url = new URL(request.url);

  return new Request(url.toString(), {
    method: "GET",
  });
}

export async function readCache(request) {
  return (await getCache().match(request)) || null;
}

export async function writeCache(request, response, ttlSeconds) {
  const cachedResponse = new Response(response.body, response);

  cachedResponse.headers.set("Cache-Control", `public, max-age=${ttlSeconds}`);

  await getCache().put(request, cachedResponse.clone());

  return cachedResponse;
}

export async function clearPublicCaches(request) {
  const origin = new URL(request.url).origin;

  const urls = [
    `${origin}/api/registration-settings`,
    `${origin}/api/site-settings`,
    `${origin}/api/stats`,
    `${origin}/api/recent`,
    `${origin}/api/recent?limit=5`,
    `${origin}/api/players`,
    `${origin}/api/players?page=1&limit=50`,
    `${origin}/api/players?page=1&limit=500`,
  ];

  await Promise.all(urls.map((url) => getCache().delete(new Request(url))));
}

export async function handleCachedGet(request, handler, ttlSeconds) {
  const cacheRequest = getCacheRequest(request);

  const cached = await readCache(cacheRequest);

  if (cached) {
    const response = new Response(cached.body, cached);

    response.headers.set("X-Cache", "HIT");

    return response;
  }

  const response = await handler();

  if (!response.ok) {
    return response;
  }

  const cachedResponse = await writeCache(cacheRequest, response, ttlSeconds);

  cachedResponse.headers.set("X-Cache", "MISS");

  return cachedResponse;
}
