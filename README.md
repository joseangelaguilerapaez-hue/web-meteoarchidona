# MeteoArchidona

Plataforma de monitoreo meteorológico en tiempo real para la comarca de Archidona.

## Características

- **Condiciones actuales** - Temperatura, humedad, presión, viento
- **Predicción** - Pronóstico meteorológico
- **Observaciones** - Radar meteorológico interactivo
- **Cámaras en vivo** - Visualización en tiempo real
- **Información** - Detalles y contacto

## Tecnología

- HTML5, CSS3, JavaScript (ES6 modules)
- Fetch API, History API (SPA)
- Apache/Hostinger

## Instalación

```bash
npm install
npm run check  # Lint + Prettier
```

## Scripts

- `npm run lint` - ESLint
- `npm run format` - Prettier
- `npm run check` - Lint + check

## Arquitectura

Ver [ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Seguridad

- [SECURITY.md](docs/SECURITY.md) - Políticas y configuración
- [VULNERABILITIES.md](docs/VULNERABILITIES.md) - Vulnerabilidades comunes
- [CSP.md](docs/CSP.md) - Content Security Policy
- [VALIDATION_GUIDE.md](docs/VALIDATION_GUIDE.md) - Validación de datos
- [DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md) - Pre-deployment

## Performance

- [PERFORMANCE.md](docs/PERFORMANCE.md) - Optimizaciones y métricas
- [OPTIMIZATION_CHECKLIST.md](docs/OPTIMIZATION_CHECKLIST.md) - Guía paso-a-paso
- [MINIFICATION_RESULT.md](docs/MINIFICATION_RESULT.md) - Resultados minificación (40% reducción)

```bash
npm run minify  # Minificar CSS/JS
```

## API

Endpoints: `https://api-meteoarchidona.onrender.com`

- `GET /condiciones-actuales/:estacion` - Condiciones
- `GET /radar/:zona/timeline` - Radar

Ver [API.md](docs/API.md) para documentación completa.

## Testing

```bash
npm test                # Ejecutar todos (73 tests)
npm test:watch         # Modo watch (reload automático)
```

**Tests:** 73 total
- `tests/utils.test.js` (19 tests)
- `tests/validation.test.js` (24 tests)
- `tests/lluvia.test.js` (17 tests)
- `tests/viento.test.js` (8 tests)
- `tests/ui.test.js` (5 tests)

Ver [TESTING.md](docs/TESTING.md) para detalles.

## Contacto

- 📧 info@meteoarchidona.com
- 🔧 soporte@meteoarchidona.com