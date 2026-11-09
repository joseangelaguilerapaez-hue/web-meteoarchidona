# Estado del proyecto — web-meteoarchidona

Última actualización: 2026-11-09.
Origen: reconstruido a partir del historial de Git, ramas y pull requests. Lo marcado
**(por confirmar)** necesita que José lo ratifique o corrija.

## Cómo se mantiene este documento

Es la fuente de verdad de "por dónde vamos". Al empezar una sesión se lee.

**Este fichero no se toca en los PR de código.** Se actualiza en una rama propia de
documentación (`docs/...`), al final de cada tanda de trabajo, cuando ya se sabe qué quedó
fusionado y qué llegó al VPS. Regla nueva del 2 de noviembre de 2026, decidida por José
después de que cuatro fusiones seguidas se comieran líneas de aquí: varios PR abiertos a la
vez tocando este fichero garantizan el conflicto, y resolverlo a mano pierde texto.

Qué lleva esa rama de documentación:

1. Mover lo que corresponda entre *Hecho*, *En construcción* y *Pendiente*.
2. Añadir una línea fechada al *Registro* (una línea, sin detalles de código).
3. Si algún documento de `docs/` ya no es cierto, corregirlo o dejar aquí la nota de que está desfasado.

No se marca nada como hecho que no esté en `main`, ni como publicado lo que no se haya
comprobado en meteoarchidona.com.

## Hecho (en `main`)

- El Olivar · agrometeorología del olivar (PR #126, **publicada** el 9 nov, `8677b70`): página `/olivar` con la gama «Aceite y oro» sobre fondo blanco, en el menú, en el sitemap y en `.htaccess` (aprobado por José), alta en Nginx con `scripts/configurar_seccion_olivar.py`; componentes `olivar-aviso`, `olivar-resumen`, `olivar-frio` y `olivar-heladas`, también en los dashboards. Datos de la API (migración 0048, `docs/olivar.md` de la API). Comprobado: `/olivar` responde 200.
- **Sismología** (PR #120, #122, #123, #124 y #125, 8 y 9 nov; **publicada**, web en `3877143` y luego con el helicorder): página `/sismologia` en blanco con la gama «Basalto y magma»: aviso, último cercano, año en cifras, mapa redondo sobre las ortofotos PNOA (botón Satélite/Mapa, fuera del radio oscurecido, fichas al tocar y terremotos que crecen al acercar), lista, Helicorder de EGOR · sismograma de 24 horas (días anteriores con botones), estadísticas y textos divulgativos. Radio a elegir arriba (100 a 300 km, 200 por defecto). Todo en componentes montables en dashboards. José lo revisó en el móvil y lo dio por bueno.
- **Polen** (PR #110, 6 nov, decisión de José: alergias al polen sin AEMET, mismo aspecto que Embalses en verdes y marrones; **publicada** el 7 nov, web en `ca1b74e`, `/polen` da 200 tras el alta en Nginx; con la API en `0945e2e` y la migración 0046): página `/polen` con cinco componentes montables en dashboards (`js/polen/`: hoy, próximos días, lo medido en Granada, semana a semana y calendario polínico), con la paleta de campo en `css/polen-componentes.css`. Previsión del modelo CAMS para Archidona (en noviembre, todo nulo) y recuentos de la UGR (Granada, última semana 37). Alta en el menú, `.htaccess` y `sitemap.xml` con permiso de José. Revisada por José en el navegador el 7 nov («lo veo perfecto»).
- **Embalses** (PR #96, 5 nov, decisión de José: nivel nacional y aspecto de agua; **publicada**, web en `22ca082`, con la API y la migración 0043): página `/embalses` con selector de ámbito (Andalucía por defecto, cuencas, comunidades, provincias y toda España) y seis componentes montables en dashboards (`js/embalses/`), con la paleta clara de agua en `css/embalses-componentes.css`. Alta en el menú, `.htaccess` y `sitemap.xml` con permiso de José.

- **Novedades** (PR #97, 5 nov, decisiones de José; **publicada**, web en `34c4a56`, con la API y la migración 0044): ventana encima de la portada con las novedades vigentes, una vez por visita (`js/novedades.js`, `css/novedades.css`); cabecera y bloques de imagen (`/assets/...`) y texto; editor en Administración → Novedades con caducidad. Primera novedad «¿Por qué registrarte en MeteoArchidona?» (PR #98, imágenes de ejemplo en `assets/novedades/registro-*.webp`; **publicada** y cargada en la API el 5 nov, caducidad ajustable en Administración → Novedades); ventajas al día en `docs/ventajas-registro.md`.

- **Administración → Usuarios y entrada sin PIN** (PR #82, 4 nov, decisión de José; **publicada**, web en `3d3d74d`, con la API `37ee9f2` y la migración 0039): lista de cuentas con buscador y casilla «Administrador»; un usuario administrador con sesión en la web entra en Administración sin el PIN y el permiso se renueva solo; tras «Cerrar sesión», botón «Entrar con mi cuenta». José ya es administrador. Diseño en `docs/usuarios.md` de la API, 2.7.

- **Mi cuenta** (PR #84 y #85, 4 nov, decisiones de José; **publicada**, web en `a875042`, con la API `c2e3623` y la migración 0040; bloque de Nginx dado de alta con `scripts/configurar_seccion_mi_cuenta.py`): página `/mi-cuenta`, privada, a la que lleva el nombre de la cabecera, con pestañas Mis datos, Suscripciones (precio «Gratis · 0,00 €», pausar, reanudar, borrar y alta por servicio y localidad) y Preferencias. En Administración → Usuarios, precio y disponibilidad de los servicios. Comprobada por José en el móvil. Diseño en `docs/usuarios.md` de la API, 8.5 y 8.6.

- **Predicción por pestañas** (PR #67, #68 y #71, 2 y 3 nov, decisiones de José; **publicada**, web en `38b3be6`, revisada por José en el móvil): pestañas «AEMET» (lo de siempre, ahora componente `js/prediccion-aemet.js`) y «Modelos numéricos» (`js/modelos-numericos.js`): resumen automático redactado por IA, penacho por modelo con escenarios, media, franja del 80 %, salida operativa y control, comparación de modelos con casillas para marcar o desmarcar, niveles 2 m, 925, 850, 700 y 500 hPa, lluvia y nieve cada 6 h, El Silo o Los Llanos, zoom con dos dedos. Detalle en `docs/prediccion.md`, 2 ter. Usa la API desplegada con las migraciones 0036 y 0037. Falta dar de alta sus bloques en el catálogo de auditoría.

- Pantalla completa en horizontal (PR #63, **publicado el 2 nov** en `aa7585d`, José confirma que funciona): con la web instalada como aplicación, el manifiesto fija `portrait-primary` y Android no giraba la pantalla completa aunque el móvil tuviera la rotación automática (lo vio José en su Samsung con un timelapse). Los dos visores (`js/visor-video-multimedia.js` para MP4 y `js/visor-video.js` para el directo) piden `screen.orientation.lock("landscape")` al entrar y la liberan al salir. En iPhone no existe esa orden y sigue mandando el giro del teléfono. Versión `?v=20261102-horizontal1`.
- Pantalla completa de YouTube en horizontal (PR #69, **publicado el 3 nov** en `3601c31`, José confirma que funciona en el móvil con la aplicación instalada): el PR #63 no tocó el visor de YouTube y al maximizar un directo de En vivo se quedaba en vertical. `visores/youtube.js` escucha el cambio de pantalla completa (el botón es de YouTube y no se puede escuchar), pide horizontal al entrar y la libera al salir; si el iframe no puede, lo pide la página contenedora. En ordenador e iPhone no hace nada y la pantalla completa sigue igual. Versión `?v=20261102-horizontal1`.

- Botón de pantalla completa bajo el termómetro (PR #57, 1 nov, decisión de José; **publicado** el 1 nov, `b9e0223`, y comprobado por José en el móvil): en el directo los controles del visor dejan de ir centrados abajo, donde tapaban la barra de humedad grabada en el vídeo, y se colocan en la vertical del termómetro (5,5 % del ancho) y a la altura del logotipo (centro de la franja 75,4–97,2 % del alto), sobre el rectángulo real del vídeo para respetar las bandas negras. El MP4 de los timelapses conserva su barra centrada. Si con su tamaño normal llegarían al logotipo (vídeo muy pequeño, como la panorámica en un móvil en vertical), pasan a los botones pequeños de las fichas compactas (decisión de José).

- Directo con instrumentos (PR #53, **publicado el 31 oct**, decisión de José): el VPS graba termómetro, probeta, barra de humedad y logotipo en el vídeo en directo (PR de `api-meteoarchidona`). En directo el visor deja de pintar su línea de cifras y su marca, que saldrían repetidas; los MP4 no cambian. Publicado después de activar los instrumentos en el VPS; José lo comprobó en las dos cámaras. Lo que quedaba —el botón de pantalla completa tapaba el centro de la barra de humedad de la panorámica— se resolvió con el PR #57.

- Timelapses de una sola vez (PR #51, **publicado el 29 oct**, decisión de José): tipo «Una sola vez (fecha concreta)» en el formulario de programaciones de Administración, con fecha y hora; en el listado se ve con su fecha y hora. Al terminar, la API la desactiva sola. Depende de la API con el tipo `UNA_VEZ` (PR #59 de `api-meteoarchidona`, migración 0033), desplegada antes que esta web el mismo día.

- Sección **Estadísticas** (`/estadisticas`, PR #48, **publicada el 28 oct** en `d01cbab`): apartado del menú tras Predicción, visible para todos. Sin sesión, aviso de que hace falta registrarse con los botones de cuenta; con sesión de usuario o token de Administración vigente en la pestaña, catálogo por secciones y visor con gráfica, tabla y PDF (`GET /estadisticas/catalogo` y `/catalogo/{id}/datos`). La dirección guarda la abierta (`/estadisticas#LLUVIA_HOY`). Nginx: bloque `location = /estadisticas` añadido con `scripts/configurar_seccion_estadisticas.py` (copia previa `/home/jose/meteoarchidona-web.nginx.20261028T135356838551Z.bak`); `curl` da 200. Falta darla de alta en el catálogo de auditoría.
- Caché de los estáticos en Nginx (petición de Mario): `/css` y `/js` un año, `/assets` 30 días. **Aplicada en el VPS** el 26 oct con `scripts/configurar_cache_estaticos.py` (web en `3365b09`), tras versionar las importaciones de Administración (PR #34) y ajustar el script a los dos `server` del fichero real (PR #35). Copia de la configuración anterior en `/home/jose/meteoarchidona-web.nginx.20261026T084045…bak`.
- Auditoría de uso, primera entrega (PR #12, publicada el 24 oct en `5a28551`): aviso de consentimiento, ventana de privacidad con preferencias (`componentes/privacidad.html`), botón «Privacidad» en el pie y `js/auditoria.js`, que cuenta cada página vista de forma anónima para todos los visitantes (`/auditoria/vistas`, sin identificador ni nada en el navegador) y, solo con consentimiento, envía a la API ACCESO, SALIDA y las visualizaciones marcadas con `data-auditoria-visualizacion` (Predicción, visor de Seguimiento, tabla de estaciones, Timelapses y fichas). Verificada con una visita real de José: aviso, aceptación, sesión y eventos llegan bien a la base. Segunda entrega: eventos dentro de los visores (vídeo, radar, YouTube) y de los selectores.
- **Contador de visitas** en la cabecera (PR #99, #102, #103, #104 y #105, 5 y 6 nov, decisiones de José; **publicado**, web en `dfeb3e2`, revisado por José en el móvil): recuadro pequeño entre la hora y el logotipo de Y&Z, bajo los botones de cuenta, con título «Visitas» y filas Hoy, Semana (de lunes a hoy), Mes y Año. Columna «Páginas» (páginas vistas del contador anónimo, cuenta a todos) que pasa a «Únicos» (cada visitante una vez por periodo, solo de quienes aceptan las estadísticas) con la casilla «Únicos», y columna «Registrados» (usuarios con cuenta distintos). Componente montable `js/componentes/contador-visitas.js` (`data-componente="contador-visitas"`), también en dashboards. Entre 1251 y 1480 px el menú baja de fila con el contador a la vista; no se muestra con el móvil tumbado ni por debajo de 340 px. Usa `GET /auditoria/contador-visitas` de la API (PR #101, #103 y #104, desplegados).
- Visor de radar regional multirradar, con estilos y caché corregidos (PR #2 a #4, sep).
- Panel de administración V2 (PR #6, sep).
- Timelapses en Actualidad y gestión de productos de timelapse en el panel de administración, con navegación Configuración/Productos (15–17 oct).
- Visor de vídeo MP4 con controles temporales, adaptado a móvil y pantalla completa (16 oct).
- En vivo: selector dinámico de directos de YouTube que carga las emisiones desde la API pública (Murcia, Nerja, puerto de Málaga), 15–21 oct.
- El aviso de privacidad ocupa menos en el móvil y su fondo es opaco (25 oct).
- Actualidad avisa cuando una estación lleva más de una hora sin mandar datos: la ficha dice «Sin datos desde…» en vez de «En línea» y el punto deja de ser verde (25 oct).
- Las fichas de estaciones sin cámara ya no muestran el recuadro «vídeo no disponible» ni cargan su visor (25 oct).
- Portada: fuera los gráficos de muestra, accesos a secciones que existen con iconos propios, «Condiciones actuales» con la lectura real de una estación —y visible en móvil— y adelanto de tres días de la predicción de AEMET (25 oct, PR #24 a #26).

- Aplicación instalable (PWA), 1 nov: `manifest.webmanifest` y `sw.js` en la raíz, `js/pwa.js` que da de alta el trabajador (en `localhost` no), iconos de 512 y recortable, y etiquetas de tema e instalación en las seis páginas. Las páginas van primero a la red y guardan copia para enseñarla sin conexión; los datos de la API no se guardan nunca. Hecha por Mario (PR #59). **Publicada** el 1 nov en `68e420f` y `scripts/configurar_pwa.py` ejecutado en el VPS por José: el manifiesto se sirve como `application/manifest+json`, `sw.js` y el manifiesto van con `no-cache`, el trabajador queda activo y en su caché no hay ninguna respuesta de la API. Copia de la configuración anterior de Nginx en `/home/jose/meteoarchidona-web.nginx.20261101T175029179953Z.bak`.

- Botón «Instalar la aplicación» en el pie (PR #62, fusionado el 1 nov, **publicado el 2 nov** con el `git pull` del PR #63 y comprobado en vivo; decisión de José tras conseguir instalarla solo desde Safari): en Chrome, Edge y Samsung abre el diálogo del sistema; en Safari del iPhone explica los tres pasos de «Añadir a pantalla de inicio», que es lo único que deja hacer Apple; en los navegadores que no instalan, y a quien ya la tiene instalada, no se enseña.
- Configuración en Administración (PR #61, #74 y #76; diseño en `docs/configuracion.md` de la API). **Publicada el 3 nov** (web `5b80a56`, API con la migración 0038) y comprobada por José en el móvil: siete pestañas (Apariencia, Timelapses, Seguimiento, Directo y cámaras, Predicción, Usuarios y Otros) con los once parámetros; casilla «Activo» solo en el distintivo; números con unidad, rango y valor por defecto; en el distintivo, aviso de cuándo se quita y cuenta atrás de la vigencia (días exactos de reloj desde que se guarda).
- Distintivo en la cabecera (PR #75), **publicado el 3 nov** (`0b0f303`) y comprobado por José: bajo el logotipo, lazo del color de Configuración (o monigote); en el ordenador, el texto del día pequeño debajo; en el móvil y la tableta, solo el lazo y, al tocarlo, un globo con el texto en letra grande. Lo lee de `/configuracion/publica` cada 10 minutos.
- Botón «Reenviar activación» en Administración → Usuarios para las cuentas sin confirmar (web PR #116 y API PR #116, decisión de José del 8 nov porque a una cuenta el correo de activación le llegó a spam y lo borró). **Publicado el 8 nov** (web `f4bfbb8`, API `3d63995`, sin migración). La purga de 7 días de la API respeta las cuentas con un enlace de activación vigente.
- Ficha de mantenimiento del usuario en Administración → Usuarios (web PR #118 y API PR #117, decisión de José del 8 nov; `docs/usuarios.md` de la API, 2.8): al pulsar una cuenta se ve todo (cuenta, suscripciones, sesiones, registro de seguridad, «Mi web», dashboards) y se cambian estado y suscripciones, con cambio de PIN, cierre de sesiones, reenvío de activación y borrado. **Publicada el 8 nov** (web `42eeccc`, API `3fb4259`, sin migración).

## En construcción / abierto

- Gráficas en Actualidad (rama `feature/actualidad-graficas`, 29 oct, elegidas por José): debajo de los timelapses, «El Silo frente a Los Llanos» con dos estadísticas del catálogo, `SILO_LLANOS_TEMPERATURA_7D` y `SILO_LLANOS_MAXIMAS_MINIMAS_30D` (esta solo la gráfica, `data-presentacion="GRAFICA"`), y enlace a «Más estadísticas». Las monta `js/estadisticas-incrustadas.js`, pieza reutilizable para los futuros dashboards: un `data-estadistica="CODIGO"` por hueco; la sección sigue oculta si no llega ninguna. Las ve cualquier visitante. **Necesita antes el PR #56 de la API** (pedir por código) desplegado.

- Informes y estadísticas, visor y configurador (rama `feature/estadisticas-visor`, 27 oct). `js/visor-estadisticas.js` y `css/visor-estadisticas.css`: componente reutilizable que dibuja en SVG propio (sin librerías) la gráfica (líneas, barras, áreas, puntos, dos ejes, huecos, incompletos y ventana de valores), la tabla con fila de resumen y el PDF por la impresión del navegador con logotipo, ficha y aviso informativo en el pie. Apartado «Estadísticas» en Administración (`js/administracion/estadisticas.js`): cabecera, series (añadir copia la última, duplicar, quitar) y vista previa automática con `POST /estadisticas/vista-previa`. Usa la API desplegada el 27 oct (`4f46351`). Guardar y publicar en el catálogo, pendiente. Probado con Chromium sin pantalla y la API simulada, en ordenador y móvil.

- Fecha en el nombre de los timelapses (rama `feature/timelapses-fecha-en-nombre`, 26 oct): check «Añadir la fecha al nombre» en la programación (Administración) y título público tomado de la programación. Necesita la migración 0030 de la API, que debe estar aplicada **antes** de desplegar esto.

- Cuentas de usuario, segunda entrega (PR #39, **publicado el 26 oct**): «He olvidado mi PIN» (enlace del correo con el token en el fragmento `#nuevo-pin=`), ventana «Mi cuenta» al pulsar el nombre y «Borrar mi cuenta» (pide el PIN; la API borra a los 30 días), y **aviso de privacidad con las cuentas** (`componentes/privacidad.html`: datos, plazos, cookie `ma_sesion`, aviso a los responsables, 14 años). Texto de privacidad aprobado por José; usa el PR #44 de la API, ya en producción.
- Cuentas de usuario, pantallas (PR #38, **publicado el 26 oct**, probado por José con una cuenta real): botones «Iniciar sesión» y «Registrarse» en la cabecera (o el nombre y «Salir»), formularios de registro (nombre, correo, PIN de 6 cifras repetido, casilla de 14 años) e inicio de sesión («Recordarme» 30 días) en una ventana sobre la página, y aviso de `?cuenta=activada` / `?cuenta=enlace-no-valido` al volver del correo. Usa `/usuarios` de `api-meteoarchidona` (PR #42, ya en producción desde el 26 oct). **Abiertas al público el 26 oct** (`CUENTAS_ABIERTAS = true` en `js/cuenta.js`, tras aprobar José el aviso de privacidad); poniéndolo en `false` se ocultan de golpe, y `?cuentas=ver` las muestra en un navegador aunque estén ocultas. Faltan las cuentas de administrador.

- Patrullas de cámara en Administración, paso 2 de 4 (rama `feature/admin-patrullas`, 25 oct): módulo «Patrullas» con el mismo esquema que Timelapses (listado con filtros y editor) para crear patrullas sobre cámaras PTZ con preset inicial, velocidad, órdenes (mover a preset, esperar, zoom) y programaciones (una vuelta en fecha o diaria, activación por franja), y botones para activar/desactivar, dar una vuelta y borrar. Añade además el zoom opcional al formulario de timelapses. Usa `/admin/patrullas` de `api-meteoarchidona` (migración 0027 aplicada en producción el 25 oct). Probado en navegador contra una API simulada; falta probarlo con la API real. Diseño: `docs/patrullas.md` de `api-meteoarchidona`.

- Auditoría, segunda entrega: selecciones (cámara de la ficha, día del timelapse, selectores de En vivo) y activaciones (abrir timelapse, «Reproducir» de YouTube) hechas en la rama `feature/auditoria-selecciones`; quedan los eventos del visor de vídeo y del visor de Seguimiento. Comprobar que la visualización de fichas ya llega a todos: desde el 25 oct Nginx sirve los `.html` con `no-cache`, así que probablemente ya no hace falta forzar la versión de `componentes/ficha-estacion.html` **(por confirmar)**.
- **Predicción**: muestra datos reales de AEMET desde el 23 oct (API PR #10 y #14). Reorientación decidida el 25 oct (`docs/prediccion.md`, sección 2 bis): toda la predicción de AEMET, «Ahora» con datos reales de El Silo, texto propio redactado por IA y, más adelante, correo diario. Pasos 1 y 3 **publicados el 25 oct** (web en `a7b1427`, API en `1954a3c`): «Ahora en Archidona» con la observación real de El Silo, sin datos de muestra, y el texto del presentador redactado por Claude a partir de AEMET (se regenera con cada edición nueva de AEMET). El bloque aún no está en el catálogo de auditoría.

## Pendiente

- Sismología: histórico desde 1370 (aplazado; descarga manual en CSV desde el ordenador) y, como ideas, sismógrafo propio en tiempo real (Raspberry Shake) o pedir al IGN acceso en tiempo real.
- Mejoras propuestas tras el repaso del 27 oct: `docs/mejoras.md` (código muerto, documentos desfasados, seguridad de la consola SQL por comprobar, pestañas en segundo plano, imágenes, accesibilidad…). **Por decidir con José** qué se hace y en qué orden.
- Ventajas de registrarse: `docs/ventajas-registro.md` reúne qué gana el usuario registrado (estadísticas e informes propios, catálogo en sus dashboards, dashboards propios) y por qué importa a MeteoArchidona. Se irá ampliando; su texto se llevará a la web cuando cada ventaja funcione. Falta decidir dónde se muestra.

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
- 2026-10-27 · Abierto `docs/ventajas-registro.md` con las primeras ventajas del usuario registrado (estadísticas propias, catálogo y dashboards), a petición de José.
- 2026-10-27 · Informes y estadísticas: visor reutilizable (gráfica, tabla y PDF) y configurador con vista previa en Administración; pendiente de fusionar y publicar.
- 2026-10-27 · Repaso del proyecto y lista de mejoras propuestas en `docs/mejoras.md`, para comentarla con José.
- 2026-10-28 · Estadísticas como sección pública del menú: aviso de registro sin sesión y catálogo con visor para usuarios y Administración; necesita el bloque de Nginx.
- 2026-10-28 · Publicada la sección Estadísticas: web en `d01cbab` y bloque de Nginx aplicado; `/estadisticas` responde 200.
- 2026-10-29 · Actualidad: gráficas de El Silo frente a Los Llanos (7 días y máximas y mínimas de 30 días) con el visor de estadísticas; pendiente de fusionar y publicar.
- 2026-10-29 · Timelapses de una sola vez en el formulario de Administración; pendiente de fusionar y de desplegar después de la API.
- 2026-10-31 · El visor en directo deja de pintar cifras y marca porque el VPS las graba en el vídeo; pendiente de publicar tras activarlo en el VPS.
- 2026-10-29 · Publicados los timelapses de una sola vez (PR #51), después de la API y su migración 0033.
- 2026-10-31 · Publicado el visor sin cifras ni marca en directo (PR #53): los instrumentos ya van grabados en el vídeo.
- 2026-11-01 · Logotipo nuevo: la nube de la A lleva copos de nieve en lugar de gotas. Sustituidos el original, la cabecera, los iconos (192 y Apple) y el favicon con los mismos nombres; pendiente de fusionar y publicar.
- 2026-11-01 · Versión `?v=20261101-nieve` en el logotipo de la cabecera, los iconos y el favicon para que los navegadores dejen la copia antigua en caché.
- 2026-11-01 · Logotipos de Cámaras y Estaciones también con nieve en la nube de la A (originales, cabeceras de 128 px e iconos de 192 px), con versión en sus referencias para saltar la caché.
- 2026-11-01 · La cabecera fijaba el logotipo desde `cabecera.js` sin versión y seguía saliendo el antiguo; ahora la ruta lleva `?v=20261101-nieve`.
- 2026-11-01 · Directo: el botón de pantalla completa pasa de encima de la barra de humedad a debajo del termómetro, a la altura del logotipo.
- 2026-11-01 · Directo: en vídeos muy pequeños los botones bajo el termómetro pasan a tamaño pequeño para no tapar el logotipo.
- 2026-11-01 · Repasada la web en móvil (390 px) página por página: ninguna desborda a lo ancho. Pendiente: `/api/usuarios/yo` responde 401 a quien no ha entrado y deja un error rojo en la consola en todas las páginas.
- 2026-11-01 · La web se puede instalar en el teléfono: manifiesto, trabajador de servicio con aviso de sin conexión y iconos propios. Falta el paso de Nginx en el VPS.
- 2026-11-01 · Botón bajo el termómetro publicado en el VPS (`b9e0223`); José confirma que queda bien.
- 2026-11-01 · Administración → Configuración: pantalla de parámetros de la web (primero, el distintivo del directo); pendiente de la API y de publicar.
- 2026-11-01 · PWA publicada en el VPS y comprobada en vivo: manifiesto con su tipo, trabajador activo controlando la página y cero respuestas de la API guardadas.
- 2026-11-01 · José la instala desde Safari del iPhone; en el iPhone ningún otro navegador puede. De ahí el botón del pie.
- 2026-11-01 · Botón «Instalar la aplicación» en el pie, con diálogo nativo donde lo hay y pasos de Safari donde no; escondido en los navegadores que no instalan.
- 2026-11-02 · Visor de vídeo: la pantalla completa se pone en horizontal sola en Android y vuelve a vertical al salir; la PWA tenía la orientación bloqueada en vertical.
- 2026-11-02 · Pantalla completa en horizontal publicada en el VPS (`aa7585d`); José la prueba en su Samsung y funciona.
- 2026-11-02 · Configuración en Administración fusionada (PR #61); sigue sin publicar en el VPS.
- 2026-11-02 · Reparado este documento: la fusión del PR #61 había devuelto el directo con instrumentos a «En construcción», duplicado el botón del pie y dejado dos veces la cabecera «En construcción / abierto».
- 2026-11-02 · Norma nueva de José: `docs/estado.md` deja de tocarse en los PR de código; se actualiza en una rama de documentación propia al final de cada tanda.
- 2026-11-03 · Pantalla completa de YouTube en horizontal (PR #69) publicada en el VPS (`3601c31`); José la prueba en el móvil con la aplicación instalada y funciona.
- 2026-11-03 · Predicción por pestañas (AEMET y Modelos numéricos) publicada y revisada por José; la Configuración de Administración necesita ahora la migración 0038 de la API.
- 2026-11-03 · Configuración publicada con siete pestañas y once parámetros; distintivo en la cabecera (globo grande en el móvil); vigencia del distintivo con cuenta atrás en Configuración. Comprobado por José.
- 2026-11-04 · Publicadas Administración → Usuarios con entrada sin PIN (`3d3d74d`) y la página Mi cuenta con suscripciones (`a875042`); comprobadas por José.
- 2026-11-05 · Embalses publicada (`22ca082`) y componentes de embalses montables en dashboards.
- 2026-11-05 · Novedades publicadas (`34c4a56`); primera novedad, la del registro, publicada (`2856c0c`), caducidad ajustable en Administración.
- 2026-11-06 · Contador de visitas publicado en la cabecera (páginas, únicos y registrados); revisado por José en el móvil.
- 2026-11-07 · Polen publicada (`ca1b74e`): `/polen` en Nginx, API con migración 0046 y primeras cargas (15 días de previsión, 3.445 semanas de la UGR).
- 2026-11-07 · Patrullas: el código pasa a ser un desplegable (GENERAL, AMANECER, ATARDECER, NOCHE, TORMENTAS, LLUVIA, NIEVE, NIEBLA, VIGILANCIA, PRUEBA) con «Otro…» para uno nuevo; al elegirlo rellena el nombre si está vacío.
- 2026-11-08 · Administración → Patrullas: apartado «Enviar la cámara a un preset» (cámara PTZ, preset, estado de la orden en vivo y directo de la cámara al lado) y botón «Leer presets de la cámara».
- 2026-11-08 · Reenviar la activación desde Administración → Usuarios (PR #116 en web y API), publicado en el VPS (`f4bfbb8` / `3d63995`); de paso, el visor de «Enviar la cámara a un preset» pasa su estilo en línea a CSS.
- 2026-11-08 · Ficha de mantenimiento del usuario en Administración (PR #118 web, #117 API), publicada en el VPS.
- 2026-11-09 · Sismología publicada y revisada por José: mapa redondo con radio a elegir y Helicorder de EGOR.
- 2026-11-09 · El Olivar (frío y heladas) publicado en el VPS (`8677b70`): página `/olivar` y cuatro componentes.
