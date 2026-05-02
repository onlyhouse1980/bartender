const CACHE_NAME = 'barstart-de-1777713572978';
const PRECACHE_URLS = [
  "/_expo/static/js/web/index-bf425c97a0287b3b46d39faa17b5f89b.js",
  "/apple-touch-icon.png",
  "/assets/assets/glassware/coupe-glass.496f3b6c9784e7eec784d8127053a913.png",
  "/assets/assets/glassware/high-ball.11c55f4313e2e93855613f15aa4a826d.png",
  "/assets/assets/glassware/hurricane-glass.b8d3b354752cf082c7fc8a5831ccb1eb.png",
  "/assets/assets/glassware/martini-glass.a3a2928a6b54a1523fc0ef968a029d5c.png",
  "/assets/assets/glassware/mule-becher.9d01316093975e383c470b41e45b6b81.png",
  "/assets/assets/glassware/rocks-glass.43aff49386d820d62cd06a9bea627e3a.png",
  "/assets/assets/glassware/wine-glass.833117dde562323bf45063cf421b8bc5.png",
  "/favicon.ico",
  "/index.html",
  "/logo192.png",
  "/logo512.png",
  "/manifest.json",
  "/metadata.json"
];
const OFFLINE_FALLBACK = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(OFFLINE_FALLBACK, responseClone));
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          return cachedResponse || caches.match(OFFLINE_FALLBACK);
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        return response;
      });
    })
  );
});
