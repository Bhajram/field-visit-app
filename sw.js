const CACHE_NAME = 'field-visit-offline-v9';
const LOCAL_URLS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const CDN_URLS = [
  'https://cdn.tailwindcss.com/3.4.17',
  'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(LOCAL_URLS.map((u) => cache.add(u).catch(() => {})));
      await Promise.all(CDN_URLS.map((u) =>
        fetch(u, { mode: 'no-cors' }).then((res) => cache.put(u, res)).catch(() => {})
      ));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const req = event.request;
  if (req.url.includes('docs.google.com/spreadsheets')) {
    event.respondWith(fetch(req));
    return;
  }
  const isNav = req.mode === 'navigate' || req.url.endsWith('/') || req.url.includes('index.html');
  if (isNav) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((c) => c || caches.match('./index.html')))
    );
    return;
  }
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      return cached || fetch(req).then((res) => {
        if (res && (res.status === 200 || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
