/* ============================================================
   Service Worker - Caché y offline support
   ============================================================ */

const CACHE_NAME = 'meteoarchidona-v1';
const API_CACHE = 'meteoarchidona-api-v1';

const ASSETS_TO_CACHE = [
    '/',
    '/pages/index.html',
    '/css/estilos.css',
    '/js/app.js',
    '/js/utils.js',
    '/js/validation.js',
    '/js/viento.js',
    '/js/lluvia.js',
    '/js/ui.js',
    '/componentes/cabecera.html',
    '/componentes/navbar.html',
    '/componentes/footer.html',
    '/assets/yz-project.jpg'
];

const API_URLS = [
    'https://api-meteoarchidona.onrender.com/condiciones-actuales/EL_SILO',
    'https://api-meteoarchidona.onrender.com/condiciones-actuales/LOS_LLANOS'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.warn('SW: Error cacheando assets', err);
            });
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME && cacheName !== API_CACHE) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (url.origin === 'https://api-meteoarchidona.onrender.com') {
        event.respondWith(handleApiRequest(event.request));
    } else {
        event.respondWith(handleAssetRequest(event.request));
    }
});

function handleAssetRequest(request) {
    return caches.match(request).then(response => {
        if (response) {
            return response;
        }

        return fetch(request).then(response => {
            if (!response || response.status !== 200 || response.type === 'error') {
                return response;
            }

            const responseToCache = response.clone();

            caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseToCache);
            });

            return response;
        }).catch(() => {
            return caches.match('/pages/index.html');
        });
    });
}

function handleApiRequest(request) {
    return caches.open(API_CACHE).then(cache => {
        return fetch(request).then(response => {
            if (response && response.status === 200) {
                cache.put(request, response.clone());
            }
            return response;
        }).catch(() => {
            return cache.match(request).then(cachedResponse => {
                return cachedResponse || new Response(
                    JSON.stringify({ error: 'Offline' }),
                    { status: 503, headers: { 'Content-Type': 'application/json' } }
                );
            });
        });
    });
}

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
