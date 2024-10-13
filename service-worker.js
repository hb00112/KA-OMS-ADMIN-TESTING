


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

self.addEventListener('push', function(event) {
    const data = event.data.json();
    const options = {
        body: data.content,
        icon: 'https://i.postimg.cc/c1nTCZB7/Add-a-subheading.png', // Replace with your own icon
        badge: 'https://i.postimg.cc/c1nTCZB7/Add-a-subheading.png', // Replace with your own badge
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    // Handle notification click (e.g., open a specific page)
    event.waitUntil(
        clients.openWindow('https://your-app-url.com')
    );
});
