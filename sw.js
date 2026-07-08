const CACHE = 'passguard-v6';
const URLS = [
  'index.html',
  'manifest.json',
  'src/css/main.css',
  'src/css/components.css',
  'src/css/responsive.css',
  'src/js/config.js',
  'src/js/crypto.js',
  'src/js/generator.js',
  'src/js/app.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks =>
      Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r =>
      r || fetch(e.request).catch(() => new Response('غير متصل', { status: 503 }))
    )
  );
});
