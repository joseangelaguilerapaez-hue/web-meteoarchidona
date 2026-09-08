/* ============================================================
   PERFORMANCE - Optimizaciones de carga y velocidad
   ============================================================ */

const API_CACHE = {};
const CACHE_TTL = 60000; // 1 minuto en ms

export function registrarServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        return Promise.reject(new Error('SW no soportado'));
    }

    return navigator.serviceWorker.register('/sw.js')
        .then(registration => {
            console.log('✅ Service Worker registrado');

            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('🔄 Actualización disponible');
                        mostrarNotificacionActualizacion();
                    }
                });
            });

            return registration;
        })
        .catch(err => {
            console.warn('⚠️ Error registrando SW:', err);
            return null;
        });
}

function mostrarNotificacionActualizacion() {
    const banner = document.createElement('div');
    banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #ffd700;
        color: #000;
        padding: 1rem;
        text-align: center;
        z-index: 9999;
        font-weight: bold;
    `;
    banner.textContent = '✨ Nueva versión disponible. Recarga para actualizar.';
    banner.addEventListener('click', () => window.location.reload());
    document.body.insertBefore(banner, document.body.firstChild);
}

export function obtenerCondicionesEnCache(estacion, urlApi) {
    const ahora = Date.now();
    const cacheBucket = Math.floor(ahora / CACHE_TTL);
    const cacheKey = `${estacion}-${cacheBucket}`;

    if (API_CACHE[cacheKey]) {
        return Promise.resolve(API_CACHE[cacheKey]);
    }

    return fetch(`${urlApi}/${estacion}`)
        .then(res => res.json())
        .then(datos => {
            API_CACHE[cacheKey] = datos;

            const bucketAnterior = Math.floor((ahora - CACHE_TTL) / CACHE_TTL);
            delete API_CACHE[`${estacion}-${bucketAnterior}`];

            return datos;
        });
}

export function precargarRecursos() {
    const links = [
        { rel: 'dns-prefetch', href: '//api-meteoarchidona.onrender.com' },
        { rel: 'preconnect', href: '//api-meteoarchidona.onrender.com' },
        { rel: 'prefetch', href: '/pages/prediccion.html' },
        { rel: 'prefetch', href: '/pages/observaciones.html' }
    ];

    links.forEach(linkConfig => {
        const link = document.createElement('link');
        link.rel = linkConfig.rel;
        link.href = linkConfig.href;
        if (linkConfig.rel === 'preconnect') {
            link.crossOrigin = 'anonymous';
        }
        document.head.appendChild(link);
    });
}

export function medirPerformance() {
    if (!window.PerformanceObserver) {
        return;
    }

    try {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'largest-contentful-paint') {
                    console.log('📊 LCP:', entry.renderTime || entry.loadTime, 'ms');
                }
                if (entry.entryType === 'first-input') {
                    console.log('📊 FID:', entry.processingDuration, 'ms');
                }
                if (entry.entryType === 'layout-shift') {
                    console.log('📊 CLS:', entry.value);
                }
            }
        });

        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });

        window.addEventListener('load', () => {
            const perfData = performance.timing;
            const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
            const connectTime = perfData.responseEnd - perfData.requestStart;
            const renderTime = perfData.domInteractive - perfData.navigationStart;

            console.log('📊 Página cargada en:', pageLoadTime, 'ms');
            console.log('📊 Tiempo conexión:', connectTime, 'ms');
            console.log('📊 Tiempo render DOM:', renderTime, 'ms');
        });
    } catch (err) {
        console.warn('Performance monitoring error:', err);
    }
}

export function habilitarLazyLoading() {
    const images = document.querySelectorAll('img[loading="lazy"]');

    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.add('loaded');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    } else {
        images.forEach(img => {
            img.src = img.dataset.src;
        });
    }
}

export function inicializarPerformance() {
    registrarServiceWorker();
    precargarRecursos();
    habilitarLazyLoading();
    medirPerformance();

    console.log('✅ Performance optimizaciones activas');
}
