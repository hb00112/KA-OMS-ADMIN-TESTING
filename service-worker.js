


const CACHE_NAME = 'pwa-test-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://s3.ezgif.com/tmp/ezgif-3-092ebae015.png',
  'https://github.com/username/repo-name/raw/main/icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

importScripts('https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js');

// Your existing service worker code here
// ...

self.addEventListener('install', function(event) {
    console.log('Service Worker installed');
});

self.addEventListener('activate', function(event) {
    console.log('Service Worker activated');
});

