const CACHE_NAME = 'magia-briceno-v3';
const urlsToCache = [
    './',
    './index.html',
    './css/variables.css',
    './css/base.css',
    './css/components.css',
    './css/animations.css',
    './css/screens.css',
    './css/tutorial.css',
    './js/config.js',
    './js/supabase-client.js',
    './js/utils.js',
    './js/effects.js',
    './js/auth.js',
    './js/navigation.js',
    './js/wishlist.js',
    './js/sorteo.js',
    './js/admin.js',
    './js/notifications.js',
    './js/tutorial.js',
    './js/app.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Nueva notificación',
        icon: './assets/icon-192.png',
        badge: './assets/badge.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'open',
                title: 'Abrir app'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('La Magia de los Briceño', options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();

    event.waitUntil(
        clients.openWindow('./')
    );
});
