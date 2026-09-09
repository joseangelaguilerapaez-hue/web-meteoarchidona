# Plan de Refactorización - Estructura de Carpetas

## Estructura Actual

```
raíz/
├── componentes/       ← Nombres en español
├── css/              ← Solo estilos.css
├── js/               ← Mezcla de app + config + módulos
├── pages/            ← Páginas de la app
├── visores/          ← Visualizadores (radar)
├── assets/           ← Recursos (imágenes)
├── docs/             ← Documentación
└── index.html        ← Redirección
```

## Estructura Propuesta (FASE 2)

```
src/
├── components/       ← Normalizado a inglés
│   ├── header.html
│   ├── footer.html
│   ├── navbar.html
│   ├── cards/
│   │   └── station-card.html
│   └── index.html    ← Lista de componentes
├── js/
│   ├── modules/      ← Módulos reutilizables
│   │   ├── utils.js
│   │   ├── ui.js
│   │   ├── viento.js
│   │   ├── lluvia.js
│   │   └── index.js  ← Exporta todos
│   ├── config.js     ← Configuración centralizada
│   ├── app.js        ← App principal
│   └── bootstrap.js  ← Inicialización
├── pages/
│   ├── index.html    ← Dashboard
│   ├── info.html
│   ├── forecast.html ← prediccion.html renamed
│   ├── observations.html ← observaciones.html renamed
│   └── cameras.html  ← en-vivo.html renamed
├── styles/
│   ├── main.css      ← estilos.css
│   ├── variables.css ← Variables extraídas
│   ├── components.css
│   └── responsive.css
├── assets/
│   ├── images/
│   │   └── yz-project.jpg
│   ├── fonts/
│   └── icons/
└── index.html        ← Punto de entrada
```

## Cambios Principales

### 1. Normalizar Nombres
- `componentes/` → `src/components/`
- `prediccion.html` → `forecast.html`
- `en-vivo.html` → `cameras.html`
- `observaciones.html` → `observations.html`

### 2. Organizar JS
- Crear `js/modules/index.js` que exporte todo
- Centralizar config en `js/config.js`
- Crear `js/bootstrap.js` para inicialización

### 3. Modularizar CSS
- Extraer variables a archivo separado
- Separar estilos por componente
- Crear archivo responsive dedicado

### 4. Estructura de Carpetas Consistente
- `public/` para archivos estáticos
- `src/` para código fuente
- `docs/` para documentación
- `tests/` para tests (futuro)

## Migración (Pasos)

### Fase 1 (Actual) ✅
- ✅ Modularizar JS
- ✅ Crear package.json, .eslintrc.json
- ✅ Documentar arquitectura
- ✅ Limpiar duplicados

### Fase 2 (Próximo)
- [ ] Crear estructura src/
- [ ] Mover archivos a nuevas carpetas
- [ ] Actualizar imports/paths
- [ ] Actualizar .htaccess
- [ ] Testear navegación

### Fase 3 (Futuro)
- [ ] Webpack/Vite bundler
- [ ] Minificación automática
- [ ] Build pipeline
- [ ] CI/CD setup

## Impacto

### Ventajas
- Estructura clara y escalable
- Nombres consistentes (inglés)
- Más fácil onboarding
- Preparado para build tools

### Riesgo
- Cambio de rutas (requiere testing)
- Potencial romper links externos
- .htaccess necesita actualización

## Decisión

**RECOMENDACIÓN**: Hacer Fase 2 cuando:
- Proyecto tenga tests
- CI/CD esté configurado
- Team esté listo para cambios de estructura

**ALTERNATIVA**: Documentar estructura actual y refactorizar gradualmente sin mover archivos (bajo riesgo).

## Timeline Estimado

**Fase 2**: 2-3 horas
**Fase 3**: 4-6 horas (con aprendizaje de bundler)

Total: 6-9 horas para estructura profesional completa.
