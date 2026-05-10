const CACHE_NAME = 'manualflow-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/upload.html',
  '/profile.html',
  '/manual-detail.html',
  '/manual-view.html',
  '/manual-review.html',
  '/sobre.html',
  '/contactos.html',
  '/css/dashboard.css',
  '/css/login.css',
  '/css/register.css',
  '/css/upload.css',
  '/css/profile.css',
  '/css/manual-detail.css',
  '/css/manual-view.css',
  '/css/manual-review.css',
  '/css/sobre.css',
  '/css/contactos.css',
  '/js/dashboard.js',
  '/js/login.js',
  '/js/register.js',
  '/js/upload.js',
  '/js/profile.js',
  '/js/manual-detail.js',
  '/js/manual-view.js',
  '/js/manual-review.js',
  '/js/sobre.js',
  '/js/contactos.js',
  '/js/firebase-config.js',
  '/js/firebase-env.js',
  '/js/auth.js',
  '/js/pwa.js',
  '/manifest.json',
  '/componentes/footer.html',
  '/componentes/header.html',
  '/componentes/navigation.html'
];

self.addEventListener('install', function(event) {
  console.log('Service Worker installing.');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activating.');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  const requestUrl = new URL(event.request.url);

  // Always let Firebase and Cloudinary requests go to network
  if (requestUrl.hostname.includes('cloudinary.com') ||
      requestUrl.hostname.includes('firebaseapp.com') ||
      requestUrl.hostname.includes('googleapis.com') ||
      requestUrl.hostname.includes('firebasestorage.googleapis.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first for navigation requests so pages always load fresh
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(function() {
          return caches.match(event.request).then(function(response) {
            return response || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request).then(function(networkResponse) {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(function() {
        return response;
      });
    })
  );
});

// Handle push notifications (if implemented later)
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  console.log('Notification click received.');
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
