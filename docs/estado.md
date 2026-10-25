# Estado del proyecto — web-meteoarchidona

Última actualización: 2026-10-23.
Origen: reconstruido a partir del historial de Git, ramas y pull requests. Lo marcado
**(por confirmar)** necesita que José lo ratifique o corrija.

## Cómo se mantiene este documento

Es la fuente de verdad de "por dónde vamos". Al empezar una sesión se lee; al terminar
cada tarea se actualiza **en el mismo PR que el cambio**:

1. Mover lo que corresponda entre *Hecho*, *En construcción* y *Pendiente*.
2. Añadir una línea fechada al *Registro* (una línea, sin detalles de código).
3. Si algún documento de `docs/` ya no es cierto, corregirlo o dejar aquí la nota de que está desfasado.

No se marca nada como hecho que no esté en `main`.

## Hecho (en `main`)

- Auditoría de uso, primera entrega (PR #12, publicada el 24 oct en `5a28551`): aviso de consentimiento, ventana de privacidad con preferencias (`componentes/privacidad.html`), botón «Privacidad» en el pie y `js/auditoria.js`, que cuenta cada página vista de forma anónima para todos los visitantes (`/auditoria/vistas`, sin identificador ni nada en el navegador) y, solo con consentimiento, envía a la API ACCESO, SALIDA y las visualizaciones marcadas con `data-auditoria-visualizacion` (Predicción, visor de Seguimiento, tabla de estaciones, Timelapses y fichas). Verificada con una visita real de José: aviso, aceptación, sesión y eventos llegan bien a la base. Segunda entrega: eventos dentro de los visores (vídeo, radar, YouTube) y de los selectores.
- Visor de radar regional multirradar, con estilos y caché corregidos (PR #2 a #4, sep).
- Panel de administración V2 (PR #6, sep).
- Timelapses en Actualidad y gestión de productos de timelapse en el panel de administración, con navegación Configuración/Productos (15–17 oct).
- Visor de vídeo MP4 con controles temporales, adaptado a móvil y pantalla completa (16 oct).
- En vivo: selector dinámico de directos de YouTube que carga las emisiones desde la API pública (Murcia, Nerja, puerto de Málaga), 15–21 oct.

## En construcción / abierto

- Auditoría, segunda entrega: selecciones (cámara de la ficha, día del timelapse, selectores de En vivo) y activaciones (abrir timelapse, «Reproducir» de YouTube) hechas en la rama `feature/auditoria-selecciones`; quedan los eventos del visor de vídeo y del visor de Seguimiento. Comprobar que la visualización de fichas ya llega a todos: desde el 25 oct Nginx sirve los `.html` con `no-cache`, así que probablemente ya no hace falta forzar la versión de `componentes/ficha-estacion.html` **(por confirmar)**.
- **Predicción**: muestra datos reales de AEMET desde el 23 oct (API PR #10 y #14). Reorientación decidida el 25 oct (`docs/prediccion.md`, sección 2 bis): toda la predicción de AEMET, «Ahora» con datos reales de El Silo, texto propio redactado por IA y, más adelante, correo diario. Pasos 1 y 3 **publicados el 25 oct** (web en `a7b1427`, API en `1954a3c`): «Ahora en Archidona» con la observación real de El Silo, sin datos de muestra, y el texto del presentador redactado por Claude a partir de AEMET (se regenera con cada edición nueva de AEMET). El bloque aún no está en el catálogo de auditoría.

## Pendiente

- Caché de los estáticos en Nginx: `/css`, `/js` y `/assets` se sirven sin `Cache-Control`. Procedimiento listo en `scripts/configurar_cache_estaticos.py`, **pendiente de ejecutar en el servidor** (25 oct).


- Privacidad y cookies: borrador del aviso de consentimiento, la política de privacidad y la de cookies en `docs/privacidad-borrador.md` (24 oct). Antes de publicarlo faltan los datos del responsable, los plazos de conservación y el proveedor de alojamiento **(por confirmar)**, y construir el aviso y la página.
- Estadísticas, usuarios, publicidad y redimensionamiento con nuevos puntos de medición: existen como documentos de especificación en `docs/`, pero no consta implementación en el historial reciente **(por confirmar cuáles se van a construir y en qué orden)**.
- Observaciones: ver `docs/observaciones.md` para lo previsto **(por confirmar el estado real)**.

## Ramas antiguas

`feature/administracion-v2` y `zonnen69` no tienen commits que no estén ya en `main`. **(por confirmar)** si se pueden borrar. No borrar ramas sin que José lo pida.

## Registro

- 2026-10-23 · Creados `CLAUDE.md` y este documento (PR #7); estado reconstruido desde Git.
- 2026-10-24 · Borrador de privacidad y cookies para la auditoría de uso.
- 2026-10-24 · La API ya aplica los plazos de conservación de la política de privacidad.
- 2026-10-24 · Registros de Nginx: 14 días; anotado en el borrador de privacidad.
- 2026-10-24 · Auditoría de uso en la web: aviso de consentimiento, ventana de privacidad y envío de eventos de página y visualizaciones.
- 2026-10-24 · Páginas vistas anónimas de todos los visitantes; textos del aviso y de la privacidad ajustados (decisión de José).
- 2026-10-24 · Publicada en producción la auditoría de uso (aviso, privacidad y envío de eventos); verificada con una visita real.
- 2026-10-25 · Reorientación de Predicción decidida por José y escrita en `docs/prediccion.md` (2 bis); estado de Predicción corregido.
- 2026-10-25 · Predicción: «Ahora» con datos reales de El Silo, bloque «Hoy» marcado como predicción de AEMET y fuera los datos de muestra.
- 2026-10-25 · Predicción: bloque «El tiempo hoy, contado por MeteoArchidona» con el texto redactado por IA (`GET /prediccion/{municipio}/texto`); oculto si no hay texto.
- 2026-10-25 · Publicados «Ahora» con El Silo y el texto del presentador; primer texto real visible en la web. Detectado que Nginx no fija la caché del HTML.
- 2026-10-25 · Nginx sirve páginas y componentes `.html` con `Cache-Control: no-cache` (aprobado y aplicado por José); el `.htaccess` no se aplica en producción.
- 2026-10-25 · Auditoría: selecciones y activaciones declarativas (`data-auditoria-seleccion`, `data-auditoria-activacion`), YouTube desde su visor y copia del catálogo en `js/auditoria.js` para no perder lotes.
- 2026-10-25 · Escrito `scripts/configurar_cache_estaticos.py` para que Nginx cachee `/css`, `/js` y `/assets` (un año los versionados, treinta días las imágenes), con cinco pruebas de su transformación del texto. Falta ejecutarlo en el VPS.
