# Guía de Validación - MeteoArchidona

## Overview

Validación centralizada en `js/validation.js` para garantizar que datos cumplen con rangos y tipos esperados.

**Beneficios:**
- ✅ Prevenir errores silenciosos
- ✅ Rechazo temprano de datos inválidos
- ✅ Mensajes de error consistentes
- ✅ Seguridad contra inyección

## Funciones Disponibles

### Validadores de Estación

```javascript
import { esEstacionValida } from "../js/validation.js";

if (!esEstacionValida(codigo)) {
    console.error("Estación no reconocida:", codigo);
    return;
}
```

Estaciones válidas: `EL_SILO`, `LOS_LLANOS` (case-insensitive)

### Validadores de Número

```javascript
import { esNumeroValido } from "../js/validation.js";

const valor = api.temperatura_celsius;
if (!esNumeroValido(valor)) {
    console.error("Valor no es número");
    return;
}
```

Rechaza: `null`, `undefined`, `NaN`, `Infinity`

### Validadores de Rango

Cada sensor tiene rango permitido:

```javascript
import { 
    esTemperaturaValida,
    esHumedadValida,
    esPresionValida,
    esVelocidadVientoValida
} from "../js/validation.js";

// Validar temperatura
if (!esTemperaturaValida(datos.temperatura_celsius)) {
    console.error("Temperatura fuera de rango [-50, 60]");
    return;
}

// Validar humedad
if (!esHumedadValida(datos.humedad_relativa)) {
    console.error("Humedad fuera de rango [0, 100]");
    return;
}
```

**Rangos Definidos:**
| Sensor | Min | Max |
|--------|-----|-----|
| Temperatura | -50°C | 60°C |
| Humedad | 0% | 100% |
| Presión | 870 mb | 1050 mb |
| Velocidad Viento | 0 km/h | 200 km/h |
| Dirección Viento | 0° | 360° |
| Lluvia | 0 mm | 500 mm |
| Índice UV | 0 | 20 |

### Validación Completa de Condiciones

Valida objeto completo de datos meteorológicos:

```javascript
import { validarCondiciones } from "../js/validation.js";

const datos = {
    estacion: "EL_SILO",
    temperatura_celsius: 25,
    humedad_relativa: 65,
    presion_mb: 1013,
    velocidad_viento_kmh: 12,
    tasa_lluvia_mm_h: 0.5
};

const resultado = validarCondiciones(datos);

if (!resultado.valido) {
    console.error("Errores de validación:", resultado.errores);
    // Mostrar al usuario
    return;
}

// Datos válidos, proceder
actualizarUI(datos);
```

**Respuesta:**
```javascript
{
    valido: true,          // boolean
    errores: []            // array de strings
}
```

### Sanitización de Strings

Limpia y valida entrada de texto:

```javascript
import { sanitizarString, esEmailValido } from "../js/validation.js";

// Trim y truncar longitud
const nombre = sanitizarString(userInput, 100);

// Validar email
const email = sanitizarString(userInput);
if (!esEmailValido(email)) {
    console.error("Email inválido");
    return;
}
```

## Integración en app.js

### Ejemplo 1: Cargar Condiciones

**Antes (sin validación):**
```javascript
fetch(url)
    .then(res => res.json())
    .then(datos => {
        actualizarTemperatura(datos.temperatura_celsius);
        actualizarHumedad(datos.humedad_relativa);
    });
```

**Después (con validación):**
```javascript
import { validarCondiciones } from "./validation.js";

fetch(url)
    .then(res => res.json())
    .then(datos => {
        const validacion = validarCondiciones(datos);
        if (!validacion.valido) {
            console.error("Datos inválidos:", validacion.errores);
            mostrarError("Datos del servidor inválidos");
            return;
        }
        actualizarTemperatura(datos.temperatura_celsius);
        actualizarHumedad(datos.humedad_relativa);
    });
```

### Ejemplo 2: Obtener Estación

**Antes:**
```javascript
function obtenerEstacion(codigo) {
    return fetch(`/api/estaciones/${codigo}`);
}
```

**Después:**
```javascript
import { esEstacionValida } from "./validation.js";

function obtenerEstacion(codigo) {
    if (!esEstacionValida(codigo)) {
        return Promise.reject(new Error("Estación inválida: " + codigo));
    }
    return fetch(`/api/estaciones/${codigo}`);
}
```

### Ejemplo 3: Filtrar Datos Extremos

```javascript
import { esTemperaturaValida } from "./validation.js";

function procesarTemperaturas(datos) {
    return datos.filter(item => 
        esTemperaturaValida(item.temperatura_celsius)
    );
}
```

## Testing de Validación

Ejecutar suite de tests:

```bash
npm test                    # Ejecutar todos los tests
npm test -- validation      # Solo validación
npm test:watch             # Modo watch
```

Tests en: `tests/validation.test.js`

## En Producción

### Checklist

- [ ] Importar módulos de validación en app.js
- [ ] Validar datos de API antes de usarlos
- [ ] Sanitizar input de usuario
- [ ] Mostrar mensajes de error seguros (no revelar internals)
- [ ] Loguear validaciones fallidas para debugging
- [ ] Tests pasando

### Logging Seguro

```javascript
// ✅ Seguro: log validación
if (!esEstacionValida(codigo)) {
    console.warn("Estación inválida", { codigo, timestamp: new Date() });
}

// ❌ Inseguro: loguea valores sensibles
if (!esEmailValido(email)) {
    console.log("Email inválido:", email, datos_usuario); // NO!
}
```

## Extensión de Validadores

Para agregar nuevo validador:

```javascript
// En js/validation.js

const RANGOS = {
    // ... existing ...
    nueva_metrica: { min: 0, max: 100 }
};

export function esNuevaMetricaValida(valor) {
    if (!esNumeroValido(valor)) {
        return false;
    }
    const num = Number(valor);
    const { min, max } = RANGOS.nueva_metrica;
    return num >= min && num <= max;
}
```

Luego crear test en `tests/validation.test.js` y usar en app.js.

## Errores Comunes

### Error: "validarCondiciones is not a function"

**Causa:** Import incorrecto
```javascript
// ❌ Incorrecto
import validarCondiciones from "./validation.js";

// ✅ Correcto
import { validarCondiciones } from "./validation.js";
```

### Datos válidos pero actualizados incorrectamente

**Causa:** Desajuste entre nombres de campos
```javascript
// API devuelve: { temperatura_celsius: 25 }
// Pero validamos: temperatura_celsius (correcto!)

// Asegure que nombres coincidan entre API y validación
```

### Validación es muy estricta

**Solución:** Ajustar rangos en `validation.js`
```javascript
const RANGOS = {
    temperatura: { min: -50, max: 60 }  // Ajustar max si es necesario
};
```

Luego testear cambio:
```bash
npm test -- "test: esTemperaturaValida"
```

## Referencias

- [js/validation.js](../js/validation.js) - Código fuente
- [tests/validation.test.js](../tests/validation.test.js) - Tests
- [docs/SECURITY.md](SECURITY.md) - Seguridad general
- [docs/API.md](API.md) - Documentación de API
