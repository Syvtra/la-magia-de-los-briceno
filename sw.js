const CACHE_NAME = 'sorteo-familiar-v4';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
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
    './js/app.js',
    './assets/favicon.svg',
    './assets/icon-48.png',
    './assets/icon-72.png',
    './assets/icon-96.png',
    './assets/icon-144.png',
    './assets/icon-192.png',
    './assets/icon-512.png'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache).catch(err => {
                    console.log('Cache addAll error:', err);
                    return cache.addAll(['./', './index.html']);
                });
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    
    if (event.request.url.includes('supabase.co') || 
        event.request.url.includes('googleapis.com') ||
        event.request.url.includes('gstatic.com')) {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    fetch(event.request).then(networkResponse => {
                        if (networkResponse && networkResponse.status === 200) {
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, networkResponse);
                            });
                        }
                    }).catch(() => {});
                    return cachedResponse;
                }
                
                return fetch(event.request).then(networkResponse => {
                    if (!networkResponse || networkResponse.status !== 200) {
                        return networkResponse;
                    }
                    
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    
                    return networkResponse;
                }).catch(() => {
                    if (event.request.destination === 'document') {
                        return caches.match('./index.html');
                    }
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});

self.addEventListener('push', event => {
    let data = { title: 'Sorteo Familiar', body: 'Nueva notificación' };
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    const options = {
        body: data.body,
        icon: './assets/icon-192.png',
        badge: './assets/icon-96.png',
        vibrate: [200, 100, 200],
        tag: 'sorteo-notification',
        renotify: true,
        data: {
            dateOfArrival: Date.now(),
            url: './'
        },
        actions: [
            { action: 'open', title: 'Abrir' },
            { action: 'close', title: 'Cerrar' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'close') return;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                return clients.openWindow('./');
            })
    );
});

self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});
