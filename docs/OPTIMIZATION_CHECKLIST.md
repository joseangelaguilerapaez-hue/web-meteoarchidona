# Checklist de Optimizaciones - Paso a Paso

## Fase 1: Setup (30 min)

### 1.1 Instalar herramientas
```bash
npm install -D csso-cli terser lighthouse
```

### 1.2 Registrar Service Worker en app.js
```javascript
import { inicializarPerformance } from './performance.js';

// En iniciarAplicacion() después de cargar componentes
inicializarPerformance();
```

### 1.3 Agregar DNS Prefetch en pages/index.html
```html
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- DNS Prefetch para API -->
    <link rel="dns-prefetch" href="//api-meteoarchidona.onrender.com" />
    <link rel="preconnect" href="//api-meteoarchidona.onrender.com" crossorigin />
    
    <title>MeteoArchidona</title>
    <!-- resto -->
</head>
```

## Fase 2: Minificación (20 min)

### 2.1 Minificar CSS
```bash
npm run minify:css
```

Verifica que se creó `css/estilos.min.css` sin errores.

### 2.2 Minificar JavaScript
```bash
npm run minify:js
```

Verifica que se crearon files .min.js

### 2.3 Actualizar referencias en pages/index.html
```html
<!-- Antes -->
<link rel="stylesheet" href="../css/estilos.css" />
<script src="../js/app.js?v=2"></script>

<!-- Después -->
<link rel="stylesheet" href="../css/estilos.min.css?v=3" />
<script src="../js/app.min.js?v=3"></script>
```

**Incrementa version query param (v=3)**

### 2.4 Test en navegador
```
http://localhost:8123/
```
- Verifica que carga OK
- Navega por páginas
- Abre DevTools Console (sin errores)

## Fase 3: Service Worker (15 min)

### 3.1 Verificar que sw.js existe
```bash
ls -la sw.js
```

### 3.2 En app.js, import performance.js
```javascript
import { inicializarPerformance } from './performance.js';
```

### 3.3 Llamar en iniciarAplicacion()
```javascript
function iniciarAplicacion() {
    // ... código existente ...
    inicializarPerformance();  // NEW
}
```

### 3.4 Test Service Worker
```
http://localhost:8123/
```

En DevTools → Application → Service Workers:
- [ ] Status: activated (no error)
- [ ] Scope: /

Abre Console y verifica:
```
✅ Service Worker registrado
✅ Performance optimizaciones activas
```

## Fase 4: Lazy Loading (10 min)

### 4.1 Actualizar imágenes en componentes
```html
<!-- Antes -->
<img src="/assets/yz-project.jpg" alt="Logo" />

<!-- Después -->
<img src="/assets/yz-project.jpg" alt="Logo" loading="lazy" />
```

Actualizar en:
- `componentes/cabecera.html`
- Cualquier otra imagen

### 4.2 Test lazy loading
En DevTools → Network → IMG:
- Logo aparece cuando scrollea a él
- No precarga todas al entrar

## Fase 5: API Caché (10 min)

### 5.1 Usar obtenerCondicionesEnCache en app.js
```javascript
import { obtenerCondicionesEnCache } from './performance.js';

// Antes
async function actualizarDatos(estacion) {
    const res = await fetch(`${API_BASE}/condiciones-actuales/${estacion}`);
    const datos = await res.json();
    // ...
}

// Después
async function actualizarDatos(estacion) {
    const datos = await obtenerCondicionesEnCache(estacion, `${API_BASE}/condiciones-actuales`);
    // ...
}
```

### 5.2 Test caché
1. Carga página (1a request real)
2. Navega a otra sección (2a = en caché si < 1 min)
3. En DevTools → Network → Fetch/XHR, verifica menos requests

## Fase 6: Medición (15 min)

### 6.1 Local Lighthouse
```bash
npm run lighthouse
```

Espera que se abra report. Verifica:
- [ ] Performance >= 85
- [ ] Accessibility >= 90
- [ ] Best Practices >= 85
- [ ] SEO >= 90

### 6.2 Google PageSpeed Insights
1. Navega a https://pagespeed.web.dev/
2. Ingresa: https://meteoarchidona.com
3. Espera reporte
4. Compara con línea base anterior

### 6.3 Documentar resultados
```markdown
# Before Optimization
- Performance: 65
- LCP: 3.2s
- CLS: 0.15

# After Optimization
- Performance: 88
- LCP: 1.8s
- CLS: 0.05
```

## Fase 7: Validación Final (10 min)

### 7.1 Verificar .htaccess
```bash
grep -A5 "Cache Control" .htaccess
grep -A5 "Compresión" .htaccess
```

Debe tener:
```apache
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/html "access plus 1 hour"
    ExpiresByType text/css "access plus 1 week"
    ...
</IfModule>

<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/css
    ...
</IfModule>
```

### 7.2 Tests no roto
```bash
npm test
```

Todos deben pasar (utils + validation)

### 7.3 Lint no roto
```bash
npm lint
```

Sin errores ESLint

## Fase 8: Deployment (30 min)

### 8.1 Commit cambios
```bash
git add docs/PERFORMANCE.md sw.js js/performance.js .lighthouserc.json package.json
git commit -m "Agregar performance: minificación, SW, caché, lazy loading"
```

### 8.2 Upload a Hostinger
- [ ] Upload sw.js (raíz)
- [ ] Upload js/performance.js
- [ ] Upload css/estilos.min.css
- [ ] Upload js/*.min.js
- [ ] Update .htaccess
- [ ] Update pages/index.html (versiones)

### 8.3 Test en producción
```
https://meteoarchidona.com/
```

Verifica:
- [ ] Carga rápido (< 2s)
- [ ] Sin errores Console
- [ ] Service Worker activo
- [ ] API responde
- [ ] Lighthouse score >= 85

### 8.4 Monitor 24h
- [ ] Revisa logs para errors
- [ ] Verifica performance metrics
- [ ] Recibe feedback de usuarios

## Problemas Comunes

### "Service Worker no registra"
**Causa:** Archivo sw.js no encontrado o error en script.

**Fix:**
```javascript
// En performance.js, agrega logging
.catch(err => {
    console.error('SW Error:', err);
});
```

### "App lento después de minificación"
**Causa:** Variable renaming incorrecto, código roto.

**Fix:**
```bash
npm test  # Verifica que tests pasan
```

Si falla, revert minificación y usa terser options:
```bash
npx terser js/app.js --compress --mangle false -o js/app.min.js
```

### "Lighthouse score sigue bajo"
**Causas comunes:**
- [ ] Imágenes no optimizadas (> 500KB)
- [ ] JS/CSS grande sin minificar
- [ ] Sin caché HTTP
- [ ] API lenta

**Soluciones:**
```bash
# Comprimir imágenes
convert logo.jpg -quality 85 logo.jpg

# Verificar tamaños
ls -lh css/*.css js/*.js

# Medir red
npm run lighthouse  # Ve "network throttling"
```

## Métricas de Éxito

| Métrica | Baseline | Objetivo | Status |
|---------|----------|----------|--------|
| FCP | 2.0s | 1.5s | ? |
| LCP | 3.0s | 2.5s | ? |
| CLS | 0.15 | 0.1 | ? |
| Bundle JS | 150KB | 100KB | ? |
| Requests API | 10/min | 5/min | ? |
| Lighthouse | 68 | 85+ | ? |

Llena "Status" según resultados reales.

## Next Steps

Después de completar todas las fases:

1. **Monitoreo continuo**
   - Ejecutar Lighthouse mensual
   - Revisar PageSpeed Insights
   - Monitorear Core Web Vitals

2. **Futuras optimizaciones**
   - Code splitting (módulos dinámicos)
   - Webpack/Vite bundler
   - CDN para assets estáticos
   - Compresión de imágenes (WebP)

3. **Documentación**
   - Actualizar PERFORMANCE.md con resultados reales
   - Documentar decisiones
   - Crear runbook para próximas optimizaciones
