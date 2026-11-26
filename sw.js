// Offline-first service worker for the app's own files. Bump CACHE when you ship changes.
const CACHE = 'lifebrained-v3';
const ASSETS = ['./', './index.html', './app.js', './style.css', './manifest.webmanifest', './config.js', './vendor/supabase.js', './lb-icon.svg', './lb-icon-180.png', './lb-icon-192.png', './lb-icon-512.png', './lb-icon-maskable-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first so updates show up, cache when offline. Only this app's own files are cached.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))));
});
