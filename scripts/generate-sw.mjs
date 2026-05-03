import { promises as fs } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, 'dist');
const swFile = path.join(distDir, 'sw.js');

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walk(fullPath);
      }

      return [fullPath];
    })
  );

  return files.flat();
}

function toPublicPath(filePath) {
  const relativePath = path.relative(distDir, filePath).split(path.sep).join('/');
  return `/${relativePath}`;
}

const allFiles = await walk(distDir);
const precacheFiles = allFiles
  .filter((filePath) => path.basename(filePath) !== 'sw.js')
  .map(toPublicPath)
  .sort();

const version = String(Date.now());
const precacheJson = JSON.stringify(precacheFiles, null, 2);

const serviceWorkerSource = `const CACHE_NAME = 'barstart-de-${version}';
const REMOTE_IMAGE_CACHE = 'barstart-de-remote-images-v1';
const REMOTE_API_CACHE = 'barstart-de-remote-api-v1';
const PRECACHE_URLS = ${precacheJson};
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
`;

await fs.writeFile(swFile, serviceWorkerSource);
console.log(`Generated service worker with ${precacheFiles.length} assets at ${swFile}`);
