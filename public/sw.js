const CACHE_VERSION = "barstart-v1";
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = "/offline.html";
const APP_SHELL_URL = "/";
const STATIC_ASSET_PATTERN =
  /\.(?:css|gif|ico|jpg|jpeg|js|json|png|svg|webp|woff2?)$/i;

const PRECACHE_PAGES = [APP_SHELL_URL, OFFLINE_URL];
const PRECACHE_ASSETS = [
  "/manifest.json",
  "/logo192.png",
  "/logo512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await Promise.all([
        precacheRequests(PAGE_CACHE, PRECACHE_PAGES, { cache: "reload" }),
        precacheRequests(STATIC_CACHE, PRECACHE_ASSETS),
      ]);
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) =>
            [PAGE_CACHE, STATIC_CACHE, RUNTIME_CACHE].every(
              (activeCache) => cacheName !== activeCache,
            ),
          )
          .map((cacheName) => caches.delete(cacheName)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || STATIC_ASSET_PATTERN.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (url.pathname.startsWith("/_next/image")) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

async function precacheRequests(cacheName, resources, init) {
  const cache = await caches.open(cacheName);

  await Promise.all(
    resources.map(async (resource) => {
      try {
        const request = init ? new Request(resource, init) : resource;
        await cache.add(request);
      } catch (error) {
        console.warn("Precache failed for", resource, error);
      }
    }),
  );
}

async function handleNavigationRequest(request) {
  const response = await networkFirst(request, PAGE_CACHE);

  if (response) {
    return response;
  }

  const cachedShell = await caches.match(APP_SHELL_URL, { ignoreSearch: true });
  return cachedShell || caches.match(OFFLINE_URL);
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cachedResponse = await cache.match(request, {
      ignoreSearch: request.mode === "navigate",
    });

    if (cachedResponse) {
      return cachedResponse;
    }

    if (request.mode === "navigate") {
      return caches.match(OFFLINE_URL);
    }

    return undefined;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);

  if (response.ok) {
    await cache.put(request, response.clone());
  }

  return response;
}
