// Bump CACHE when any precached file changes.
const CACHE = 'catapult-v9';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './src/main.js',
  './src/constants.js',
  './src/ballistics.js',
  './src/project.js',
  './src/aim.js',
  './src/creatures.js',
  './src/levels.js',
  './src/scoring.js',
  './src/weapons.js',
  './src/game.js',
  './src/render.js',
  './src/input.js',
  './src/storage.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first, cache as fallback.
//
// Cache-first is the usual advice and it is wrong for this game: it pins the
// player to whatever build they first loaded, so fixes never arrive and the
// old broken version keeps running no matter how many times they reload.
// Going to the network first costs nothing when online and still leaves the
// cache to serve the whole game offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html')))
  );
});
