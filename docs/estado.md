# Estado del proyecto — web-meteoarchidona

Última actualización: 2026-10-26.
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

- Caché de los estáticos en Nginx (petición de Mario): `/css` y `/js` un año, `/assets` 30 días. **Aplicada en el VPS** el 26 oct con `scripts/configurar_cache_estaticos.py` (web en `3365b09`), tras versionar las importaciones de Administración (PR #34) y ajustar el script a los dos `server` del fichero real (PR #35). Copia de la configuración anterior en `/home/jose/meteoarchidona-web.nginx.20261026T084045…bak`.
- Auditoría de uso, primera entrega (PR #12, publicada el 24 oct en `5a28551`): aviso de consentimiento, ventana de privacidad con preferencias (`componentes/privacidad.html`), botón «Privacidad» en el pie y `js/auditoria.js`, que cuenta cada página vista de forma anónima para todos los visitantes (`/auditoria/vistas`, sin identificador ni nada en el navegador) y, solo con consentimiento, envía a la API ACCESO, SALIDA y las visualizaciones marcadas con `data-auditoria-visualizacion` (Predicción, visor de Seguimiento, tabla de estaciones, Timelapses y fichas). Verificada con una visita real de José: aviso, aceptación, sesión y eventos llegan bien a la base. Segunda entrega: eventos dentro de los visores (vídeo, radar, YouTube) y de los selectores.
- Visor de radar regional multirradar, con estilos y caché corregidos (PR #2 a #4, sep).
- Panel de administración V2 (PR #6, sep).
- Timelapses en Actualidad y gestión de productos de timelapse en el panel de administración, con navegación Configuración/Productos (15–17 oct).
- Visor de vídeo MP4 con controles temporales, adaptado a móvil y pantalla completa (16 oct).
- En vivo: selector dinámico de directos de YouTube que carga las emisiones desde la API pública (Murcia, Nerja, puerto de Málaga), 15–21 oct.
- El aviso de privacidad ocupa menos en el móvil y su fondo es opaco (25 oct).
- Actualidad avisa cuando una estación lleva más de una hora sin mandar datos: la ficha dice «Sin datos desde…» en vez de «En línea» y el punto deja de ser verde (25 oct).
- Las fichas de estaciones sin cámara ya no muestran el recuadro «vídeo no disponible» ni cargan su visor (25 oct).
- Portada: fuera los gráficos de muestra, accesos a secciones que existen con iconos propios, «Condiciones actuales» con la lectura real de una estación —y visible en móvil— y adelanto de tres días de la predicción de AEMET (25 oct, PR #24 a #26).

## En construcción / abierto

- Fecha en el nombre de los timelapses (rama `feature/timelapses-fecha-en-nombre`, 26 oct): check «Añadir la fecha al nombre» en la programación (Administración) y título público tomado de la programación. Necesita la migración 0030 de la API, que debe estar aplicada **antes** de desplegar esto.

- Cuentas de usuario, segunda entrega (PR #39, **publicado el 26 oct**): «He olvidado mi PIN» (enlace del correo con el token en el fragmento `#nuevo-pin=`), ventana «Mi cuenta» al pulsar el nombre y «Borrar mi cuenta» (pide el PIN; la API borra a los 30 días), y **aviso de privacidad con las cuentas** (`componentes/privacidad.html`: datos, plazos, cookie `ma_sesion`, aviso a los responsables, 14 años). Texto de privacidad aprobado por José; usa el PR #44 de la API, ya en producción.
- Cuentas de usuario, pantallas (PR #38, **publicado el 26 oct**, probado por José con una cuenta real): botones «Iniciar sesión» y «Registrarse» en la cabecera (o el nombre y «Salir»), formularios de registro (nombre, correo, PIN de 6 cifras repetido, casilla de 14 años) e inicio de sesión («Recordarme» 30 días) en una ventana sobre la página, y aviso de `?cuenta=activada` / `?cuenta=enlace-no-valido` al volver del correo. Usa `/usuarios` de `api-meteoarchidona` (PR #42, ya en producción desde el 26 oct). **Abiertas al público el 26 oct** (`CUENTAS_ABIERTAS = true` en `js/cuenta.js`, tras aprobar José el aviso de privacidad); poniéndolo en `false` se ocultan de golpe, y `?cuentas=ver` las muestra en un navegador aunque estén ocultas. Faltan las cuentas de administrador.

- Patrullas de cámara en Administración, paso 2 de 4 (rama `feature/admin-patrullas`, 25 oct): módulo «Patrullas» con el mismo esquema que Timelapses (listado con filtros y editor) para crear patrullas sobre cámaras PTZ con preset inicial, velocidad, órdenes (mover a preset, esperar, zoom) y programaciones (una vuelta en fecha o diaria, activación por franja), y botones para activar/desactivar, dar una vuelta y borrar. Añade además el zoom opcional al formulario de timelapses. Usa `/admin/patrullas` de `api-meteoarchidona` (migración 0027 aplicada en producción el 25 oct). Probado en navegador contra una API simulada; falta probarlo con la API real. Diseño: `docs/patrullas.md` de `api-meteoarchidona`.

- Auditoría, segunda entrega: selecciones (cámara de la ficha, día del timelapse, selectores de En vivo) y activaciones (abrir timelapse, «Reproducir» de YouTube) hechas en la rama `feature/auditoria-selecciones`; quedan los eventos del visor de vídeo y del visor de Seguimiento. Comprobar que la visualización de fichas ya llega a todos: desde el 25 oct Nginx sirve los `.html` con `no-cache`, así que probablemente ya no hace falta forzar la versión de `componentes/ficha-estacion.html` **(por confirmar)**.
- **Predicción**: muestra datos reales de AEMET desde el 23 oct (API PR #10 y #14). Reorientación decidida el 25 oct (`docs/prediccion.md`, sección 2 bis): toda la predicción de AEMET, «Ahora» con datos reales de El Silo, texto propio redactado por IA y, más adelante, correo diario. Pasos 1 y 3 **publicados el 25 oct** (web en `a7b1427`, API en `1954a3c`): «Ahora en Archidona» con la observación real de El Silo, sin datos de muestra, y el texto del presentador redactado por Claude a partir de AEMET (se regenera con cada edición nueva de AEMET). El bloque aún no está en el catálogo de auditoría.

## Pendiente



- Privacidad y cookies: borrador del aviso de consentimiento, la política de privacidad y la de cookies en `docs/privacidad-borrador.md` (24 oct). Antes de publicarlo faltan los datos del responsable, los plazos de conservación y el proveedor de alojamiento **(por confirmar)**, y construir el aviso y la página.
- Estadísticas, usuarios, publicidad y redimensionamiento con nuevos puntos de medición: existen como documentos de especificación en `docs/`, pero no consta implementación en el historial reciente **(por confirmar cuáles se van a construir y en qué orden)**.
- Observaciones: ver `docs/observaciones.md` para lo previsto **(por confirmar el estado real)**.
- Portada, lo que queda de `docs/ideas-portada.md`: gráficos de temperatura y de lluvia con datos reales (necesitan una ruta pública de histórico en `api-meteoarchidona`: los datos ya se guardan en PostgreSQL, pero hoy solo los sirven las rutas de administración); tarjeta de rayos con la ruta pública de descargas eléctricas, que funciona y no se usa en toda la web; y decidir qué se enseña cuando no hay timelapse del día anterior.
- Dar de alta en el catálogo de auditoría el adelanto de la predicción de la portada y el bloque del texto de Predicción.

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
- 2026-10-25 · Aviso de privacidad legible en el móvil: fondo sólido, menos alto y botones a la misma anchura (PR #20).
- 2026-10-25 · Predicción: la flecha de viento de la tira de horas pasa de 11 a 15 px; heredaba el tamaño de su fila y no se distinguía la dirección (PR #23). El hueco de las 00:00 en la probabilidad de lluvia es de la API, banda que cruza la medianoche, y va en su propio cambio allí.
- 2026-10-25 · Repasada la portada y escritas las mejoras en `docs/ideas-portada.md`, para irlas aplicando por partes (PR #24).
- 2026-10-25 · Portada: fuera los dos gráficos de muestra, que eran líneas y barras escritas a mano, y el acceso «Gráficos» que apuntaba a esa sección (PR #25).
- 2026-10-25 · Portada: los accesos del final llevan a secciones que existen (tenían tres anclas inexistentes) y estrenan iconos SVG en vez de emoji (PR #26).
- 2026-10-25 · Portada: «Condiciones actuales» enseña la lectura real de la estación de referencia, con su nombre y su hora, y pasa a otra estación si la de referencia está parada; se ve también en móvil, donde la columna estaba oculta (PR #26).
- 2026-10-25 · Portada: adelanto de tres días de la predicción de AEMET con enlace a Predicción, y descripción propia para buscadores y para compartir (PR #26).
- 2026-10-25 · Actualidad: el estado de la ficha se calcula con la antigüedad de la última lectura, no solo con el estado de la estación. La Vega llevaba doce días parada y seguía diciendo «En línea» sobre unos grados en blanco.
- 2026-10-25 · Actualidad: la zona de cámara desaparece en las estaciones que no tienen ninguna publicada. Tres de las cuatro fichas enseñaban un recuadro negro con el logotipo y cargaban un iframe para no mostrar nada (PR #29).
- 2026-10-25 · La tarjeta de la portada y la ficha de estación comparten la cuenta de «cuánto hace de esta lectura»: `resumen.js` la importa de `meteorologia.js` en vez de repetirla.
- 2026-10-25 · Portada: la ficha sin cámara cierra su columna (quedaban 280 px vacíos de 511) y el timelapse baja de 1279 px de ancho a columnas de 560 como mucho.
- 2026-10-25 · Portada: «Condiciones actuales» estrena icono del cielo, de AEMET para la hora en curso, con la lluvia medida por encima y luna con su fase de noche. Los dibujos pasan de `js/prediccion.js` a `js/iconos-tiempo.js`, compartidos por las dos páginas, y la predicción se pide una sola vez para toda la portada.
- 2026-10-25 · Módulo de patrullas en Administración y zoom en el formulario de timelapses (paso 2 de las patrullas).
- 2026-10-25 · Administración por apartados: cada apartado ocupa la pantalla entera con su dirección (`administracion#patrullas`, `#sql`…) y botón «← Administración»; el índice muestra solo el menú y el resumen.
- 2026-10-26 · Administración: todas las importaciones entre módulos llevan `?v=` (una sola versión por módulo) y una prueba lo exige en todo `js/`; requisito para activar la caché de un año en Nginx.
- 2026-10-26 · `configurar_cache_estaticos.py` se paraba en el VPS: el fichero tiene dos `server` con el mismo nombre (HTTPS y la redirección de HTTP). Ahora elige el que tiene `root /srv/meteoarchidona/web`.
- 2026-10-26 · Caché de los estáticos aplicada en el VPS; Nginx validado y recargado.
- 2026-10-26 · Administración: botón «Proteger»/«Quitar protección» y etiquetas de conservación en Productos; campos «Conservación de los fotogramas» y «Publicar automáticamente» en las programaciones de timelapse (necesita el PR #40 de la API).
- 2026-10-26 · Pantallas de cuenta en la cabecera (registro, inicio y cierre de sesión), ocultas hasta abrir las cuentas; `?cuentas=ver` las muestra en un navegador para probarlas.
- 2026-10-26 · Pantallas de «PIN olvidado», «Mi cuenta» y borrado de cuenta, y aviso de privacidad con las cuentas; pendiente de aprobación de José y del PR #44 de la API.
- 2026-10-26 · Cuentas abiertas al público: botones de registro e inicio de sesión visibles para todos (decisión de José tras probarlas con cuentas reales).
- 2026-10-26 · Timelapses: el título público sale del nombre de la programación, con la fecha si el check está marcado; ya no se monta fijo en la web.
- 2026-10-26 · Timelapses: la web muestra el título que guarda la API en cada vídeo (migración 0031), sin montarlo; pendiente de fusionar y desplegar.
- 2026-10-26 · Timelapses: el check «Añadir la fecha al nombre» arranca marcado en las programaciones nuevas.
- 2026-10-26 · Timelapses: corregido el versionado de los `principal.js` de Actualidad y Administración, que no llegaban a los navegadores con caché.
