// SpeakFlow 180 - Service Worker
const CACHE_NAME = 'speakflow180-v18';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/audio/bbc_sleep_sample.mp3',
  '/audio/bbc_gold_sample.mp3',
  '/audio/bbc_driverless_sample.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // Bypass range requests (audio streaming chunking)
  if (event.request.headers.get('range')) return;
  // Network first for API calls & dynamic sync
  if (event.request.url.includes('generativelanguage.googleapis.com') ||
      event.request.url.includes('api.groq.com') ||
      event.request.url.includes('api.github.com') ||
      event.request.url.includes('/api/')) return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(resp => {
          if (!resp || resp.status !== 200 || resp.type !== 'basic') {
            return resp;
          }
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return resp;
        })
        .catch(() => caches.match(event.request));
    })
  );
});

// Push notification handler
self.addEventListener('push', event => {
  const data = event.data?.json() || { title: 'SpeakFlow 180', body: 'Đến giờ học tiếng Anh buổi tối rồi! 🎧' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/manifest.json',
      badge: '/manifest.json',
      vibrate: [200, 100, 200]
    })
  );
});
