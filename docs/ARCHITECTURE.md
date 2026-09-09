# Arquitectura - MeteoArchidona

## Visión General

MeteoArchidona es una SPA (Single Page Application) modular que monitorea condiciones meteorológicas en tiempo real para la comarca de Archidona.

## Estructura de Carpetas

```
meteoarchidona/
├── componentes/          # Componentes HTML reutilizables
│   ├── cabecera.html
│   ├── navbar.html
│   ├── footer.html
│   └── ...
├── css/
│   └── estilos.css       # Estilos globales (3168 líneas)
├── js/                   # JavaScript modular
│   ├── app.js            # Aplicación principal (2674 líneas)
│   ├── cargador.js       # Carga de componentes
│   ├── estaciones.js     # Configuración de estaciones
│   ├── utils.js          # Funciones genéricas
│   ├── ui.js             # Interfaz, navegación, reloj
│   ├── viento.js         # Cálculos de viento
│   └── lluvia.js         # Lógica de lluvia visual
├── pages/                # Páginas de la aplicación
│   ├── index.html        # Dashboard principal
│   ├── info.html         # Información del proyecto
│   ├── prediccion.html   # Predicción
│   ├── en-vivo.html      # Cámaras en vivo
│   └── observaciones.html # Radar interactivo
├── visores/
│   └── radar.html        # Visor de radar (Leaflet)
├── assets/               # Recursos (imágenes, fuentes)
├── docs/                 # Documentación
├── index.html            # Redirección a pages/index.html
└── .htaccess             # Configuración Apache
```

## Módulos JavaScript

### `utils.js`
Funciones genéricas reutilizables:
- DOM: `obtenerElemento()`, `asignarTexto()`, `asignarHtml()`
- Formato: `formatearNumero()`, `limitar()`
- Cálculos: `normalizarGrados()`, `obtenerDireccionCardinal()`, `clasificarUv()`

### `ui.js`
Gestión de interfaz y navegación:
- Reloj: `actualizarReloj()`, `inicializarReloj()`
- Navegación: `activarPanel()`, `panelDesdeRuta()`, `inicializarNavegacion()`
- History API para URLs limpias (sin #)

### `viento.js`
Lógica de viento:
- Estado: `vientoEstacion` (dirección, velocidad)
- Visualización: `actualizarVeleta()`
- Cálculos: `calcularMovimientoViento()`, `obtenerVientoGlobal()`

### `lluvia.js`
Lógica de lluvia visual:
- Estado: `lluviaReal`, `lluviaSimulada`
- Clasificación: `nivelLluviaDesdeTasa()`, `obtenerIconoLluvia()`
- Capas: `aplicarNivelACapa()`, `actualizarSistemaLluvia()`

### `app.js`
Orquestación principal:
- Importa todos los módulos
- Gestiona cargas de datos
- Coordina actualizaciones

## Flujo de Datos

```
1. Cargador (cargador.js)
   ↓
2. Carga componentes HTML
   ↓
3. iniciarAplicacion() en app.js
   ↓
4. Carga datos de API
   ↓
5. Actualiza UI mediante módulos
   ↓
6. Escuchadores de eventos
   ↓
7. Actualiza cada 30-60 segundos
```

## Routing

**Antes**: URLs con hash (`/#actualidad`, `/#prediccion`)
**Ahora**: URLs limpias (`/actualidad`, `/prediccion`)

Implementado con History API:
- `window.history.pushState()` para navegar
- `popstate` event para botón atrás
- `.htaccess` rewrite para SPA

## Capas de Lluvia

```
capa-lluvia
├── El Silo (opacidad por nivel)
└── Los Llanos (opacidad por nivel)

capa-gotas-cristal
├── Gotas animadas
└── Generadas cada 420ms
```

Niveles (0-4):
- 0: Sin lluvia
- 1: Débil
- 2: Moderada
- 3: Fuerte
- 4: Muy fuerte

## Estaciones

**El Silo** (Archidona)
- API: EL_SILO
- Ubicación: estratégica

**Los Llanos** (Villanueva del Trabuco)
- API: LOS_LLANOS
- Ubicación: complementaria

## APIs Externas

### MeteoArchidona API
Base: `https://api-meteoarchidona.onrender.com`

Endpoints:
- `GET /condiciones-actuales/:estacion`
  - Temperatura, humedad, presión, viento, lluvia
- `GET /radar/:zona/timeline`
  - Datos de radar para visualización

## Convenciones

### IDs de Elementos

```
lluvia-{codigo}              # Lluvia general
lluvia-tasa-{codigo}         # Tasa de precipitación
lluvia-dia-{codigo}          # Lluvia del día
lluvia-mes-{codigo}          # Lluvia del mes
lluvia-anio-{codigo}         # Lluvia del año agrícola
temperatura-{codigo}        # Temperatura
veleta-{codigo}             # Veleta de dirección
panel-{nombre}              # Paneles (actualidad, prediccion, etc)
```

### Variables Globales Evitadas

Usamos módulos ES6 para evitar contaminación global:
- Estado en constantes/objetos módulo-locales
- Funciones exportadas explícitamente
- Sin polución del namespace

## Estilización

CSS modular organizado por:
- Variables globales (colores, tipografía)
- Componentes reutilizables
- Estados (activo, deshabilitado, próximamente)
- Media queries para responsive

Tema: Dark mode con acentos de color (oro, cyan)

## Próximas Mejoras

1. **Bundler**: Webpack/Vite para minificación
2. **Tests**: Jest para funciones críticas
3. **CI/CD**: GitHub Actions para deploy automático
4. **PWA**: Service Workers para offline
5. **TypeScript**: Tipado estático opcional
6. **Documentación**: JSDoc en funciones

## Performance

- CSS: Una sola carga, ~3KB minificado
- JS: Módulos lazy-loaded según panel
- API: Cache de 60 segundos
- Imágenes: Optimizadas, WebP con fallback
