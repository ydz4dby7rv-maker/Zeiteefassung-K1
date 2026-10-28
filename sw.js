'use strict';
const CACHE = 'kilometer1-shell-20261028-sections-2-4';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './favicon.svg', './icon-192.png', './icon-512.png', './cloud.js', './sync-core.js', './sync.js', './vendor/msal-browser.min.js'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE && /^(kilometer1|k1)[-_]/i.test(key)).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Authentication, Graph and pre-authenticated downloads never enter the cache.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.search || url.hash) return;
  const allowed = ASSETS.map(asset => new URL(asset, self.registration.scope).pathname);
  if (!allowed.includes(url.pathname)) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
    }
    return response;
  }).catch(() => caches.match(event.request).then(response => response || Response.error())));
});
