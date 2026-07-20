const CACHE_NAME = 'acrux-erp-v1';
const urlsToCache = [
  '/',
  '/Acrux-LOGO.jpg',
  '/manifest.json',
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch Event - Network first for API calls, Cache first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip non-HTTP/HTTPS requests (fixes chrome-extension errors)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip Supabase and external API calls (let them go through with network-first)
  if (url.hostname.includes('supabase.co')) {
    // Network-first for Supabase
    return;
  }

  // Cache-first strategy for static assets
  if (request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'font' ||
      request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        });
      }).catch(() => {
        return new Response('Offline - Resource not cached');
      })
    );
    return;
  }

  // Network-first strategy for API calls and HTML
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone the response
        const responseClone = response.clone();

        // Only cache successful responses
        if (response && response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }

        return response;
      })
      .catch(() => {
        // Return cached response if network fails
        return caches.match(request).then((response) => {
          return response || new Response('Offline - Unable to fetch data');
        });
      })
  );
});

// Handle background sync for offline changes
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-supabase') {
    event.waitUntil(
      // Notify the app to sync pending changes
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_OFFLINE_CHANGES',
            timestamp: Date.now(),
          });
        });
      })
    );
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  let notificationTitle = 'ACRUX ERP';
  let notificationOptions = {
    body: event.data ? event.data.text() : 'You have a new update from ACRUX IT SOLUTIONS',
    icon: '/Acrux-LOGO.jpg',
    badge: '/Acrux-LOGO.jpg',
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
