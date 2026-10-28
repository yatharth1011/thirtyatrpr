// Minimal service worker — required for the "installable PWA" criteria on Android/Chrome/Windows.
// Network-first (not cache-first): this app changes often, so a signed-in student should always
// get the latest schedule/exam data when online. The cache is purely a fallback for opening the
// app while offline, not a way to speed up normal loads.
// v2 (2026-10-15): only this site's own files go through here. v1 also intercepted and cached every
// cross-origin request, Firestore's long-lived listen stream included, which could stall live BR edits.
// v3 (2026-10-28): new logo icons under /icons/v2/ (the cached v2 set still held the old green icon).
const CACHE_NAME = 'thirtyatrpr-v3';
const OFFLINE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icons/v2/icon-192.png',
  '/icons/v2/icon-512.png',
];

self.addEventListener('install', function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){ return cache.addAll(OFFLINE_URLS); })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;
  // Firestore, Google sign-in, the Firebase SDK on gstatic, the Kaizen app on 127.0.0.1: straight to the network.
  if(new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request).then(function(response){
      var copy = response.clone();
      caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
      return response;
    }).catch(function(){
      return caches.match(event.request).then(function(cached){
        return cached || caches.match('/');
      });
    })
  );
});
