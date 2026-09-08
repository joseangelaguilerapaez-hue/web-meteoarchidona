# Performance - MeteoArchidona

## Métricas Objetivo

| Métrica | Objetivo | Actual |
|---------|----------|--------|
| First Contentful Paint (FCP) | < 1.5s | ~ 2.0s |
| Largest Contentful Paint (LCP) | < 2.5s | ~ 3.0s |
| Cumulative Layout Shift (CLS) | < 0.1 | ~ 0.05 |
| Time to Interactive (TTI) | < 3.5s | ~ 4.0s |
| Total Bundle Size | < 100KB | ~ 150KB |

## 1. Caché HTTP

### Estático (1 mes)
```apache
# .htaccess - ya configurado
ExpiresByType text/css "access plus 1 week"
ExpiresByType application/javascript "access plus 1 week"
ExpiresByType image/png "access plus 1 month"
```

### HTML (1 hora)
```apache
ExpiresByType text/html "access plus 1 hour"
```

### API Responses (1 hora)
```apache
ExpiresByType application/json "access plus 1 hour"
```

**Beneficio:** Reduce requests 30-40%.

## 2. Compresión Gzip

### Estado
✅ Activado en .htaccess:
```apache
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/json
</IfModule>
```

**Reduce:** HTML 60%, CSS/JS 65%, JSON 70%.

## 3. Minificación

### CSS
```bash
# Instalar
npm install -D csso-cli

# Minificar
npx csso css/estilos.css -o css/estilos.min.css

# Usar en HTML
<link rel="stylesheet" href="css/estilos.min.css" />
```

**Reduce:** CSS 25-35%.

### JavaScript
```bash
# Instalar
npm install -D terser

# Minificar
npx terser js/app.js -o js/app.min.js
npx terser js/utils.js -o js/utils.min.js

# Usar en HTML (script tags)
<script src="../js/app.min.js?v=1"></script>
```

**Reduce:** JS 30-40%.

### HTML
```bash
# Instalar
npm install -D html-minifier

# Minificar
npx html-minifier --input-dir pages/ --output-dir pages-min/ --file-ext html
```

## 4. Lazy Loading

### Imágenes
```html
<!-- Antes -->
<img src="/assets/logo.jpg" alt="Logo" />

<!-- Después -->
<img src="/assets/logo.jpg" alt="Logo" loading="lazy" />
```

### Componentes
```javascript
// Cargar solo cuando sea necesario
const cargadorPromise = import('./js/cargador.js');

// En evento
cargadorPromise.then(({ cargarComponentes }) => {
    cargarComponentes();
});
```

## 5. Service Worker (PWA)

### Instalación
Crear `sw.js`:
```javascript
const CACHE = 'v1';
const URLs = [
    '/',
    '/pages/index.html',
    '/css/estilos.css',
    '/js/app.js',
    '/componentes/navbar.html'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(URLs))
    );
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(res => 
            res || fetch(e.request)
        )
    );
});
```

### Registrar (app.js)
```javascript
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registrado'))
        .catch(err => console.log('SW error:', err));
}
```

**Beneficio:**
- ✅ Funciona offline
- ✅ Carga 2-3x más rápido
- ✅ Reduce requests API

## 6. Code Splitting

### Cargar módulos dinámicamente
```javascript
// Antes: importar todo
import * as utils from './utils.js';
import * as validation from './validation.js';

// Después: importar bajo demanda
const utilsPromise = import('./utils.js');
const validationPromise = import('./validation.js');

// Usar cuando sea necesario
utilsPromise.then(utils => {
    utils.formatearNumero(25.5, 2);
});
```

**Reduce:** Bundle inicial 40%.

## 7. API Optimization

### Rate Limiting Caché
```javascript
const API_CACHE = {};
const CACHE_TTL = 60000; // 1 minuto

async function obtenerCondiciones(estacion) {
    const cacheKey = `${estacion}-${Date.now() / CACHE_TTL | 0}`;
    
    if (API_CACHE[cacheKey]) {
        return API_CACHE[cacheKey];
    }
    
    const respuesta = await fetch(
        `${API_BASE}/condiciones-actuales/${estacion}`
    );
    const datos = await respuesta.json();
    
    API_CACHE[cacheKey] = datos;
    return datos;
}
```

**Beneficio:** 50% menos requests API.

### Request Batching
```javascript
// Antes: 2 requests
const estacion1 = await fetch(`/api/estaciones/EL_SILO`);
const estacion2 = await fetch(`/api/estaciones/LOS_LLANOS`);

// Después: 1 request (si API soporta)
const batch = await fetch(`/api/batch`, {
    method: 'POST',
    body: JSON.stringify({
        requests: ['/estaciones/EL_SILO', '/estaciones/LOS_LLANOS']
    })
});
```

## 8. Optimización de Imágenes

### Formatos Modernos
```html
<!-- Antes -->
<img src="/assets/logo.jpg" />

<!-- Después: WebP con fallback -->
<picture>
    <source srcset="/assets/logo.webp" type="image/webp" />
    <img src="/assets/logo.jpg" alt="Logo" loading="lazy" />
</picture>
```

### Tamaños Responsivos
```html
<img 
    src="/assets/logo.jpg"
    srcset="/assets/logo-small.jpg 375w,
            /assets/logo-medium.jpg 768w,
            /assets/logo-large.jpg 1200w"
    sizes="(max-width: 375px) 100vw, (max-width: 768px) 50vw, 33vw"
    alt="Logo"
/>
```

### Compresión
```bash
# ImageMagick (Linux)
convert logo.jpg -quality 85 logo-optimized.jpg

# Online: TinyPNG, Squoosh
```

**Reduce:** Imágenes 50-70%.

## 9. CSS Optimization

### Critical CSS
Inline CSS crítico para LCP:
```html
<style>
    .cabecera { background: #1a1a1a; color: #ffd700; }
    .navegacion { display: flex; gap: 1rem; }
</style>
<link rel="stylesheet" href="css/estilos.css" media="print" onload="this.media='all'" />
```

### Unused CSS
```bash
# Encontrar CSS no usado
npm install -D purgecss

# Purgar
npx purgecss --css css/estilos.css --content pages/**/*.html js/**/*.js --output css/
```

## 10. JavaScript Optimization

### Tree Shaking
```javascript
// Antes: importa todo
import * as utils from './utils.js';

// Después: importa solo lo necesario
import { formatearNumero } from './utils.js';
```

### Async Scripts
```html
<!-- Bloquea parsing -->
<script src="app.js"></script>

<!-- No bloquea -->
<script src="app.js" defer></script>
```

### Module Type
```html
<!-- Moderno (ES6) -->
<script type="module" src="app.js"></script>

<!-- Con fallback -->
<script nomodule src="app.legacy.js"></script>
```

## 11. Network Optimization

### DNS Prefetch
```html
<link rel="dns-prefetch" href="//api-meteoarchidona.onrender.com" />
<link rel="preconnect" href="//api-meteoarchidona.onrender.com" />
```

### Resource Hints
```html
<!-- Prefetch próxima página -->
<link rel="prefetch" href="/pages/prediccion.html" />

<!-- Preload recursos críticos -->
<link rel="preload" href="/fonts/roboto.woff2" as="font" crossorigin />
```

### HTTP/2
Hostinger soporta HTTP/2. Ventajas:
- ✅ Multiplexing (múltiples requests en 1 conexión)
- ✅ Server push (enviar assets sin pedir)
- ✅ Header compression

## 12. Monitoreo

### Herramientas Online
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [WebPageTest](https://www.webpagetest.org/)
- [GTmetrix](https://gtmetrix.com/)

### Localmente
```bash
# Lighthouse CLI
npm install -D lighthouse
npx lighthouse https://meteoarchidona.com --view
```

### Real User Monitoring (RUM)
```javascript
// Web Vitals API
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);  // Cumulative Layout Shift
getFID(console.log);  // First Input Delay
getFCP(console.log);  // First Contentful Paint
getLCP(console.log);  // Largest Contentful Paint
getTTFB(console.log); // Time to First Byte
```

## Implementation Plan

### Fase 1 (1-2 horas)
- [x] Caché HTTP (.htaccess)
- [x] Compresión Gzip
- [ ] Minificación CSS/JS
- [ ] DNS Prefetch

### Fase 2 (2-3 horas)
- [ ] Lazy loading imágenes
- [ ] Service Worker básico
- [ ] API Rate Limit Caché
- [ ] Monitoring setup

### Fase 3 (3-4 horas)
- [ ] Code splitting
- [ ] Optimización imágenes (WebP)
- [ ] Critical CSS
- [ ] Tree shaking

### Fase 4 (Futura)
- [ ] Webpack/Vite bundler
- [ ] Progressive Web App completo
- [ ] Advanced caching strategy
- [ ] Edge caching (CDN)

## Checklist Pre-Deployment

- [ ] Lighthouse score >= 85
- [ ] FCP < 1.5s
- [ ] LCP < 2.5s
- [ ] No render-blocking resources
- [ ] Imágenes optimizadas
- [ ] CSS/JS minificado
- [ ] Caché HTTP configurado
- [ ] Gzip activado
- [ ] Service Worker funcional
- [ ] Core Web Vitals verde

## Referencias

- [Web.dev Performance](https://web.dev/performance/)
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [MDN Performance](https://developer.mozilla.org/en-US/docs/Web/Performance)
- [Web Vitals](https://web.dev/vitals/)

---

**Última actualización:** 2024-09-08
**Status:** En progreso
