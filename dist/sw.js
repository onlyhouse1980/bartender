const CACHE_NAME = 'barstart-de-1777716164875';
const PRECACHE_URLS = [
  "/_expo/static/js/web/index-2de9174cbd072dab3051dcd13c6fb009.js",
  "/apple-touch-icon.png",
  "/assets/assets/glassware-cutout/coupe-glass.3f4d1cc822d5509830ff0c40188205e1.png",
  "/assets/assets/glassware-cutout/high-ball.f540f310bb3fff890f9cd54b6e2822e2.png",
  "/assets/assets/glassware-cutout/hurricane-glass.06263eddadc57ef3a24ff28901df3aff.png",
  "/assets/assets/glassware-cutout/martini-glass.bbe01f10ff291a9ae9606b8bdc0610cd.png",
  "/assets/assets/glassware-cutout/mule-becher.69887e576a97b942c0f604cdcac541eb.png",
  "/assets/assets/glassware-cutout/rocks-glass.c836bb495bfd7880f833a3dc636dd4ee.png",
  "/assets/assets/glassware-cutout/wine-glass.85d34ba5c19af046c8d33f29548c6efa.png",
  "/assets/assets/hugo.ec00dfa036b8175a37d72d333761bc10.jpg",
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
