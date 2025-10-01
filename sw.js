// Network Engineers Toolkit - Service Worker
// Provides offline functionality and caching

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `nettools-${CACHE_VERSION}`;

// Resources to cache immediately
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/assets/css/main.css',
    '/assets/css/components.css',
    '/assets/css/responsive.css',
    '/assets/js/config.js',
    '/assets/js/api.js',
    '/assets/js/auth.js',
    '/assets/js/ui.js',
    '/assets/js/terminal.js',
    '/assets/js/main.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
    console.log('[ServiceWorker] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[ServiceWorker] Caching app shell');
                return cache.addAll(PRECACHE_URLS);
            })
            .then(() => {
                console.log('[ServiceWorker] Skip waiting');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[ServiceWorker] Precache failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[ServiceWorker] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => {
                            return cacheName.startsWith('nettools-') && cacheName !== CACHE_NAME;
                        })
                        .map(cacheName => {
                            console.log('[ServiceWorker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                console.log('[ServiceWorker] Claiming clients');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip cross-origin requests
    if (url.origin !== location.origin) {
        return;
    }

    // Skip API requests (always go to network)
    if (url.pathname.startsWith('/api/')) {
        return;
    }

    // Handle requests
    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    console.log('[ServiceWorker] Serving from cache:', request.url);
                    
                    // Return cached response and update cache in background
                    updateCache(request);
                    return cachedResponse;
                }

                // Not in cache, fetch from network
                console.log('[ServiceWorker] Fetching from network:', request.url);
                return fetchAndCache(request);
            })
            .catch(error => {
                console.error('[ServiceWorker] Fetch failed:', error);
                
                // Return offline page if available
                if (request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
                
                throw error;
            })
    );
});

// Fetch from network and cache the response
function fetchAndCache(request) {
    return fetch(request)
        .then(response => {
            // Don't cache invalid responses
            if (!response || response.status !== 200 || response.type === 'error') {
                return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the response
            caches.open(CACHE_NAME)
                .then(cache => {
                    cache.put(request, responseToCache);
                })
                .catch(error => {
                    console.error('[ServiceWorker] Cache put failed:', error);
                });

            return response;
        });
}

// Update cache in background
function updateCache(request) {
    fetch(request)
        .then(response => {
            if (!response || response.status !== 200 || response.type === 'error') {
                return;
            }

            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
                .then(cache => {
                    cache.put(request, responseToCache);
                })
                .catch(error => {
                    console.error('[ServiceWorker] Cache update failed:', error);
                });
        })
        .catch(error => {
            console.error('[ServiceWorker] Update fetch failed:', error);
        });
}

// Message event - handle messages from clients
self.addEventListener('message', event => {
    console.log('[ServiceWorker] Message received:', event.data);

    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }

    if (event.data.action === 'clearCache') {
        event.waitUntil(
            caches.keys()
                .then(cacheNames => {
                    return Promise.all(
                        cacheNames.map(cacheName => {
                            console.log('[ServiceWorker] Clearing cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                    );
                })
                .then(() => {
                    console.log('[ServiceWorker] All caches cleared');
                    event.ports[0].postMessage({ success: true });
                })
                .catch(error => {
                    console.error('[ServiceWorker] Clear cache failed:', error);
                    event.ports[0].postMessage({ success: false, error: error.message });
                })
        );
    }
});

// Background sync event (for future use)
self.addEventListener('sync', event => {
    console.log('[ServiceWorker] Sync event:', event.tag);
    
    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    console.log('[ServiceWorker] Syncing data...');
    // Implement data sync logic here
}

// Push notification event (for future use)
self.addEventListener('push', event => {
    console.log('[ServiceWorker] Push received');
    
    const options = {
        body: event.data ? event.data.text() : 'New notification',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [200, 100, 200],
        tag: 'nettools-notification',
        actions: [
            { action: 'open', title: 'Open' },
            { action: 'close', title: 'Close' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Network Engineers Toolkit', options)
    );
});

// Notification click event
self.addEventListener('notificationclick', event => {
    console.log('[ServiceWorker] Notification clicked:', event.action);
    
    event.notification.close();

    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

console.log('[ServiceWorker] Loaded');