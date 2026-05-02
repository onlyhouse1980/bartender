const CACHE_NAME = 'barstart-de-1777717629588';
const PRECACHE_URLS = [
  "/_expo/static/js/web/index-2dbed809589639e0f36a93f550f1c0ae.js",
  "/apple-touch-icon.png",
  "/assets/assets/glassware-cutout/coupe-glass.dff78a2b377a90d4604084cd6a4e580a.png",
  "/assets/assets/glassware-cutout/high-ball.64030dbf1f466388d155328ffdaa243f.png",
  "/assets/assets/glassware-cutout/hurricane-glass.38fc1b2dda158618ebaad39fe3c8e078.png",
  "/assets/assets/glassware-cutout/martini-glass.bbe01f10ff291a9ae9606b8bdc0610cd.png",
  "/assets/assets/glassware-cutout/mule-becher.69887e576a97b942c0f604cdcac541eb.png",
  "/assets/assets/glassware-cutout/rocks-glass.ae4c116a56304cb10ca7f420803f95fd.png",
  "/assets/assets/glassware-cutout/wine-glass.61f3837df32cc7a405e194af6accc1f8.png",
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
