/* ============================================================
   Service Worker - Caché y offline support
   ============================================================ */

const CACHE_NAME = 'meteoarchidona-v10';
const API_CACHE = 'meteoarchidona-api-v1';

const ASSETS_TO_CACHE = [
    '/',
    '/css/estilos.css',
    '/css/fuentes.css',
    '/css/pie.css',
    '/assets/fuentes/jetbrains-mono-400-latin.woff2',
    '/assets/fuentes/jetbrains-mono-500-latin.woff2',
    '/assets/fuentes/jetbrains-mono-600-latin.woff2',
    '/assets/fuentes/sora-300-latin.woff2',
    '/assets/fuentes/sora-400-latin.woff2',
    '/assets/fuentes/sora-500-latin.woff2',
    '/assets/fuentes/sora-600-latin.woff2',
    '/assets/fuentes/sora-700-latin.woff2',
    '/assets/fuentes/sora-800-latin.woff2',
    '/js/app.js',
    '/js/graficos.js',
    '/js/rutas.js',
    '/js/pagina.js',
    '/js/cargador.js',
    '/js/estaciones.js',
    '/js/utils.js',
    '/js/validation.js',
    '/js/viento.js',
    '/js/lluvia.js',
    '/js/ui.js',
    '/js/performance.js',
    '/componentes/cabecera.html',
    '/componentes/footer.html',
    '/componentes/tarjeta-estacion.html',
    '/assets/yz-project.jpg'
];

const API_URLS = [
    'https://api-meteoarchidona.onrender.com/condiciones-actuales/EL_SILO',
    'https://api-meteoarchidona.onrender.com/condiciones-actuales/LOS_LLANOS'
];

self.addEventListener('install', event => {
    // Sin esto un Service Worker nuevo se queda esperando a que se
    // cierren todas las pestañas antes de entrar en funcionamiento.
    self.skipWaiting();

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
        }).then(() => self.clients.claim())
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

/*
Todo lo propio del sitio (HTML, CSS, JS, componentes) va primero
a red y la caché queda solo como respaldo para cuando no hay
conexión. Así un cambio publicado se ve en la siguiente recarga,
sin tener que subir a mano la versión de CACHE_NAME.

La petición se hace con cache: 'no-store' a propósito: sin eso
el fetch del Service Worker reutiliza la caché HTTP del
navegador y seguiría sirviendo el archivo viejo.

Lo de terceros (fuentes de Google) sí va primero a caché: no
cambia y así se ahorra la ida a red.
*/
function esDelSitio(request) {
    return new URL(request.url).origin === self.location.origin;
}

function guardarEnCache(request, response) {
    if (response && response.status === 200 && response.type !== 'error') {
        const copia = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copia));
    }

    return response;
}

function handleAssetRequest(request) {
    if (esDelSitio(request)) {
        return fetch(request, { cache: 'no-store' })
            .then(response => guardarEnCache(request, response))
            .catch(() => {
                return caches.match(request).then(cacheada => {
                    return cacheada || caches.match('/');
                });
            });
    }

    return caches.match(request).then(response => {
        if (response) {
            return response;
        }

        return fetch(request)
            .then(response => guardarEnCache(request, response))
            .catch(() => caches.match('/'));
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
