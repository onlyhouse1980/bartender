const CACHE_NAME = 'barstart-de-1777827085496';
const REMOTE_IMAGE_CACHE = 'barstart-de-remote-images-v1';
const REMOTE_API_CACHE = 'barstart-de-remote-api-v1';
const PRECACHE_URLS = [
  "/_expo/static/js/web/index-8eb892438528e6592790630fc76d0b7b.js",
  "/apple-touch-icon.png",
  "/assets/assets/glassware-cutout/coupe-glass.dff78a2b377a90d4604084cd6a4e580a.png",
  "/assets/assets/glassware-cutout/high-ball.d7cbca885230bbd9a081ee837d0e5e10.png",
  "/assets/assets/glassware-cutout/hurricane-glass.47535a4d9325d780dc483f10a7d68bb6.png",
  "/assets/assets/glassware-cutout/martini-glass.bbe01f10ff291a9ae9606b8bdc0610cd.png",
  "/assets/assets/glassware-cutout/mule-becher.69887e576a97b942c0f604cdcac541eb.png",
  "/assets/assets/glassware-cutout/rocks-glass.ba4904065687fe9a34849f05010ed0cf.png",
  "/assets/assets/glassware-cutout/wine-glass.4f383afede6dbd772b4476568ecb5ed2.png",
  "/assets/assets/hugo.ec00dfa036b8175a37d72d333761bc10.jpg",
  "/favicon.ico",
  "/index.html",
  "/logo192.png",
  "/logo512.png",
  "/manifest.json",
  "/metadata.json"
];
const OFFLINE_FALLBACK = '/index.html';
const COCKTAIL_DB_HOSTNAMES = new Set(['www.thecocktaildb.com', 'thecocktaildb.com']);

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
        Promise.all(
          keys
            .filter(
              (key) =>
                key !== CACHE_NAME && key !== REMOTE_IMAGE_CACHE && key !== REMOTE_API_CACHE
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
    const responseClone = networkResponse.clone();
    caches.open(cacheName).then((cache) => cache.put(request, responseClone));
  }

  return networkResponse;
}

async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
      const responseClone = networkResponse.clone();
      caches.open(cacheName).then((cache) => cache.put(request, responseClone));
    }

    return networkResponse;
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    throw new Error('Network unavailable');
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (COCKTAIL_DB_HOSTNAMES.has(url.hostname)) {
    if (url.pathname.includes('/images/media/drink/')) {
      event.respondWith(cacheFirst(request, REMOTE_IMAGE_CACHE));
      return;
    }

    if (url.pathname.includes('/api/json/')) {
      event.respondWith(networkFirst(request, REMOTE_API_CACHE));
      return;
    }
  }

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
