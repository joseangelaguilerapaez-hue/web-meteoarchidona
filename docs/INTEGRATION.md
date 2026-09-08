# Integración: Seguridad + Performance

## Overview

app.js ahora integra:
- ✅ Validación centralizada (validation.js)
- ✅ Performance optimizaciones (performance.js)
- ✅ Caché de API (1 minuto)
- ✅ Service Worker offline

## Cambios en app.js

### 1. Imports (línea 5-6)
```javascript
import { validarCondiciones, esEstacionValida } from "./validation.js";
import { inicializarPerformance, obtenerCondicionesEnCache } from "./performance.js";
```

### 2. Función cargarEstacion (línea 1062)

**Antes:** Solo fetch + error handling básico

**Después:**
1. Valida código de estación
2. Obtiene datos con caché 1 min
3. Valida datos con rango checking
4. Muestra errores específicos

```javascript
async function cargarEstacion(codigo) {
    // Validar código
    if (!esEstacionValida(codigo)) {
        console.error("Estación inválida:", codigo);
        mostrarErrorEstacion(codigo);
        return;
    }

    // Caché 1 minuto
    const datos = await obtenerCondicionesEnCache(codigo, API_BASE + "/condiciones-actuales");

    // Validar datos
    const validacion = validarCondiciones({
        estacion: codigo,
        temperatura_celsius: datos.temperatura_celsius,
        // ... resto de campos
    });

    if (!validacion.valido) {
        console.error("Datos inválidos:", validacion.errores);
        mostrarErrorEstacion(codigo);
        return;
    }

    mostrarDatosEstacion(codigo, datos);
}
```

### 3. Función iniciarAplicacion (línea 1255)

Agregada línea:
```javascript
inicializarPerformance();  // Service Worker + optimizaciones
```

Ejecuta:
- Registro de Service Worker
- Precarga de recursos (DNS prefetch, preconnect)
- Lazy loading de imágenes
- Performance monitoring

## Flujo de Ejecución

```
1. pages/index.html carga
   ├─ Descarga app.js
   ├─ Descarga módulos (utils, ui, viento, lluvia, validation, performance)
   └─ Ejecuta cargador.js

2. cargador.js
   ├─ Carga componentes dinámicos
   └─ Llama window.iniciarAplicacion()

3. iniciarAplicacion()
   ├─ Inicializa UI (reloj, navegación)
   ├─ Inicializa performance
   │  ├─ Registra Service Worker (sw.js)
   │  ├─ Precarga DNS para API
   │  ├─ Habilita lazy loading
   │  └─ Inicia monitoring
   └─ Carga condiciones meteorológicas

4. cargarCondiciones()
   ├─ cargarEstacion("EL_SILO")
   │  ├─ Valida código: ✅ esEstacionValida()
   │  ├─ Obtiene con caché: ✅ obtenerCondicionesEnCache()
   │  ├─ Valida datos: ✅ validarCondiciones()
   │  └─ Muestra o error
   └─ cargarEstacion("LOS_LLANOS")

5. Cada 60 segundos
   └─ Repite cargarCondiciones() (con caché)
```

## Testing Integración

### Test 1: Validación funciona
```bash
# Abrir DevTools → Console
curl -X GET "https://api-meteoarchidona.onrender.com/condiciones-actuales/EL_SILO"
// Simular datos válidos e inválidos
```

### Test 2: Caché funciona
1. Abre página
2. Network tab: Verifica 1er fetch
3. Recarga en < 1 min
4. Network tab: NO debe haber nuevo fetch (caché)
5. Espera > 1 min
6. Recarga
7. Network tab: DEBE haber nuevo fetch (caché expirado)

### Test 3: Service Worker funciona
```javascript
// En console
navigator.serviceWorker.getRegistration().then(reg => {
    console.log("SW:", reg ? "✅ Activo" : "❌ No registrado");
    console.log("Scope:", reg?.scope);
    console.log("State:", reg?.active?.state);
});
```

### Test 4: Performance funciona
```javascript
// En console, debe mostrar:
// ✅ Service Worker registrado
// ✅ Performance optimizaciones activas
// 📊 LCP: XXms
// 📊 FID: XXms
// 📊 Página cargada en: XXms
```

### Test 5: Offline funciona
1. DevTools → Network → Offline
2. Espera a que carguen condiciones (con caché)
3. Desactiva offline
4. Recarga
5. Debe funcionar desde caché

## Verificación de Código

### Validación de Seguridad
```bash
# Verificar que no hay secrets
grep -r "apiKey\|password\|token" js/
# Debe estar vacío

# Verificar que usa textContent (no innerHTML para datos)
grep -n "innerHTML.*datos\|innerHTML.*API" js/app.js
# Debe estar vacío
```

### Validación de Performance
```bash
# Verificar imports
grep -n "import.*performance\|import.*validation" js/app.js

# Verificar que cargarEstacion usa validación
grep -A20 "function cargarEstacion" js/app.js | grep -c "validarCondiciones"
# Debe ser > 0

# Verificar que iniciarAplicacion llama performance
grep -A30 "function iniciarAplicacion" js/app.js | grep -c "inicializarPerformance"
# Debe ser > 0
```

### Tamaño de Archivos
```bash
ls -lh js/*.js
# Verificar que no crecieron mucho (< 10KB por archivo)
```

## Problemas Conocidos

### "validarCondiciones is not a function"
**Causa:** Import falta en app.js

**Fix:**
```javascript
// Verificar que app.js tiene:
import { validarCondiciones, esEstacionValida } from "./validation.js";
```

### "Service Worker no registra"
**Causa:** sw.js no existe en raíz o error en script

**Fix:**
```bash
# Verificar que existe
ls -la sw.js

# Revisar console para errores
# En DevTools → console → mostrar errores
```

### "Caché no funciona (siempre nuevo fetch)"
**Causa:** `cache: "no-store"` en fetch options (quitado)

**Fix:** Verificar que cargarEstacion usa obtenerCondicionesEnCache(), no fetch directo

### "Performance lento"
**Causas:**
1. Service Worker no cacheando assets (verificar sw.js)
2. API lenta (verificar Network tab)
3. Imágenes sin lazy loading

**Debug:**
```javascript
// Performance timeline
performance.measure('carga-datos', 'navigationStart', 'loadEventEnd');
console.log(performance.getEntriesByName('carga-datos')[0].duration, 'ms');
```

## Próximos Pasos

1. **Testing expandido**
   - Tests para lluvia.js, viento.js, ui.js
   - Integration tests (validación + API)

2. **Optimizaciones adicionales**
   - Minificación CSS/JS (scripts en package.json listos)
   - Compresión de imágenes
   - Code splitting módulos

3. **Monitoreo**
   - Lighthouse CI en GitHub Actions
   - Error tracking (Sentry)
   - Performance tracking (web-vitals)

4. **Documentación**
   - Guía de debug
   - Runbook de troubleshooting
   - API upgrade guide

## Archivos Modificados

- `js/app.js` - Imports, cargarEstacion, iniciarAplicacion
- `docs/INTEGRATION.md` - Este archivo

## Archivos Nuevos

- `js/validation.js` - Módulo de validación
- `js/performance.js` - Módulo de performance
- `sw.js` - Service Worker
- `docs/SECURITY.md`
- `docs/PERFORMANCE.md`
- `docs/VALIDATION_GUIDE.md`
- Y más...

## Verificación Final

```bash
# 1. Tests pasan
npm test

# 2. Lint pasa
npm lint

# 3. No hay errores console
# Abre http://localhost:8123 y verifica console

# 4. Datos cargan
# Verifica que temperatura, humedad, etc aparecen

# 5. Performance activa
# Abre DevTools → Application → Service Workers
# Debe estar "activated"
```

## Referencias

- [docs/SECURITY.md](SECURITY.md) - Seguridad
- [docs/PERFORMANCE.md](PERFORMANCE.md) - Performance
- [docs/VALIDATION_GUIDE.md](VALIDATION_GUIDE.md) - Validación
- [js/validation.js](../js/validation.js) - Código
- [js/performance.js](../js/performance.js) - Código
- [sw.js](../sw.js) - Service Worker

---

**Fecha:** 2024-09-08
**Status:** ✅ Integración completada
