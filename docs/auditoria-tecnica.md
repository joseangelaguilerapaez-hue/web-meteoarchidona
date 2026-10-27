# Auditoría técnica de la web

Revisión periódica del estado de meteoarchidona.com: qué funciona, qué
falla y qué conviene arreglar, con casillas para ir marcando el avance.

No confundir con [auditoria.md](auditoria.md), que es el diseño del
subsistema de analítica propia.

**Última revisión: 27 de octubre de 2026**, solo contra el repositorio y
`docs/estado.md`: desde la sesión de Claude no se llega al sitio publicado,
así que lo que dependa de medir en producción queda **por confirmar**. La
primera revisión, del 12 de octubre, sí se midió contra el sitio.

Las mejoras nuevas que salieron del repaso del 27 de octubre están en
[mejoras.md](mejoras.md); aquí solo se sigue el estado de lo ya apuntado.


## Resumen

| Área | Estado |
| --- | --- |
| Disponibilidad | Bien el 12-10; sin medir el 27-10 |
| Velocidad | Bien: la API bajó de 11 s a 0,6 s con la mudanza al VPS (12-10) |
| Seguridad | **Por confirmar: el 12-10 la consola SQL y la documentación de la API eran públicas, y no consta que se arreglara** |
| Caché del navegador | Bien: estáticos un año en Nginx y HTML con `no-cache` (25 y 26-10) |
| Contenido | Bien: la predicción usa datos reales de AEMET desde el 23-10 |
| Calidad del código | Bien: 40 pruebas en verde y CI en verde (27-10) |

Lo urgente sigue siendo confirmar la seguridad. Lo demás es mejora.


## 1. Disponibilidad y velocidad

Medido el 12-10-2026 por la mañana.

| Dirección | Código | Tiempo |
| --- | --- | --- |
| `/` | 200 | 0,24 s |
| `/prediccion` | 200 | 0,15 s |
| `/observaciones` | 200 | 0,16 s |
| `/en-vivo` | 200 | 0,14 s |
| `/informacion` | 200 | 0,17 s |
| `/administracion` | 200 | 0,19 s |
| `/api/estaciones` | 200 | 0,46 s |

- Las cinco estaciones pedidas a la vez tardan **0,57 s**. En Render
  llegaron a tardar 11 s: la mudanza al VPS lo resolvió.
- Ninguna página suelta errores en la consola del navegador.
- El CI de GitHub está en verde, y las 23 pruebas del repositorio pasan.

- [ ] Nada que arreglar aquí hoy. Volver a medir en la próxima revisión.
- [ ] Medir de nuevo contra el sitio publicado (no se pudo el 27-10)


## 2. Seguridad · urgente

| Qué | Estado hoy |
| --- | --- |
| `/api/docs` y `/api/openapi.json` | **Públicos** |
| `/api/admin/sql` | **Público** (la página, no los datos) |
| `/api/admin/weatherlink` | **Público** (la página) |
| `POST /api/admin/sql/ejecutar` | Pide clave, pero ejecuta cualquier SQL |

Desde la mudanza, todo eso cuelga del propio dominio. Cualquiera puede
leer en la documentación que existe una consola que ejecuta SQL contra
la base de datos y con qué cabecera se llama.

El arreglo está escrito y probado desde el 5-10: rama local
`seguridad-sql` del repositorio de la API (commit `7b92ac4`) y parche en
`C:\Web Meteo\api-seguridad-sql-2026-10.patch`. Oculta la documentación,
saca la consola del esquema y la deja en solo lectura salvo que el
servidor diga lo contrario, con `SET TRANSACTION READ ONLY` para que
quien rechace una escritura sea PostgreSQL. 975 pruebas pasan.

El 27-10 no consta en este repositorio si se aplicó. **Por confirmar con
José**; basta pedir esas cuatro direcciones y ver si responden.

- [ ] Que Yoseba revise el parche
- [ ] Aplicarlo y desplegar en el VPS
- [ ] Cambiar la clave de administración, que lleva meses tecleándose
- [ ] Decidir si la consola debe aceptar el token del PIN de seis cifras
- [ ] Pedir clave también para las páginas `/admin/...`


## 3. Caché del navegador

- Los estáticos (CSS, JS, imágenes) se sirven **sin `Cache-Control`**,
  solo con `ETag`: el navegador los vuelve a pedir en cada visita.
  Hostinger los guardaba una semana; nginx aún no se ha configurado.
- El HTML de `/`, `/prediccion` e `/informacion` tampoco manda nada, así
  que el navegador decide por su cuenta cuánto guardarlo y puede no
  llegar a ver un `?v=` nuevo.
- Hay un procedimiento escrito para esto último en
  `scripts/configurar_cache_administracion.py`, que hoy solo cubre
  `/administracion`. La versión que cubría las seis se revirtió el 10-10
  (commit `5b21c04`) mientras se buscaba la avería de la API, que
  resultó no tener relación.

- [x] Volver a poner los tres commits revertidos: las importaciones de
      Administración llevan `?v=` y una prueba lo exige (26-10)
- [x] Configurar en nginx un año de caché para `/css`, `/js` y `/assets`,
      que es seguro porque todo va versionado con `?v=` (aplicado el 26-10)
- [x] Que las páginas lleven `expires -1`: Nginx sirve todos los `.html`
      con `no-cache` desde el 25-10


## 4. Contenido pendiente

- **Predicción enseña datos de muestra.** La página está hecha desde el
  22-9 y avisa de ello, pero `/api/prediccion/archidona` sigue dando
  404. Falta la ruta en la API; el contrato está en
  [prediccion-endpoint.md](prediccion-endpoint.md) y el usuario ya tiene
  la clave de AEMET.
- **Las tarjetas de cámaras de la portada eran un dibujo** con dos
  nombres inventados. Yoseba ha metido estos días el catálogo público de
  cámaras y un selector en la ficha de estación: hay que volver a mirar
  cómo queda eso antes de tocar nada.

- [x] Ruta `/prediccion/archidona` en la API (datos reales desde el 23-10)
- [x] Revisar las tarjetas de cámaras de la portada con lo nuevo: las
      fichas sin cámara ya no enseñan el recuadro vacío (PR #29, 25-10)


## 5. Peso y limpieza

| Fichero | Tamaño | Uso |
| --- | --- | --- |
| `assets/logo-estaciones.png` | 1,5 MB | **No lo usa nadie** |
| `assets/logo-meteoarchidona.png` | 821 KB | Original del logo; la web usa la copia de 128 px |
| `assets/logo-camaras.png` | 490 KB | Fondo en `css/visor-video.css` |

- La portada carga el logo pequeño, de 28 KB, así que el peso real está
  bien. El problema es de repositorio y del visor de vídeo.
- **`.htaccess` (10 KB) ya no lo lee nadie:** el sitio lo sirve nginx y
  su configuración no está en el repositorio. Las pruebas, sin embargo,
  siguen comprobándolo, así que documenta reglas que no están en vigor.

- [ ] Reducir `logo-camaras.png` o servirlo en tamaño de pantalla
- [ ] Decidir qué hacer con `logo-estaciones.png` (borrar o usar)
- [ ] Decidir el futuro del `.htaccess`: guardarlo como documentación o
      sustituirlo por la configuración real de nginx

El 27-10 se retiraron además `js/actualidad.js` (61 KB) y
`js/administracion.js` (85 KB), que ninguna página cargaba. El resto de
este apartado sigue igual: ver los puntos 5 y 6 de [mejoras.md](mejoras.md).


## 6. Accesibilidad y buscadores

- Las seis páginas declaran `lang="es"` y tienen un solo `<h1>`.
- Todas las imágenes llevan `alt`, incluidas las decorativas con `alt=""`.
- `sitemap.xml` y `robots.txt` responden, y la administración queda
  fuera del índice.
- Sin revisar todavía: contraste de colores, navegación solo con teclado
  y lectores de pantalla.

- [ ] Repasar contraste y teclado en una próxima revisión


## 7. Legal

- **No hay aviso legal ni página de privacidad.** Aplazado por decisión
  del usuario el 13-9-2026; sigue pendiente de retomar.
- La web usa recursos de terceros: IGN/CNIG y OpenTopoMap en los mapas,
  AEMET en el radar, y cámaras de Sierra Nevada en En vivo.

- [x] Aviso de consentimiento y ventana de privacidad publicados (24 y 26-10)
- [ ] Retomar el aviso legal cuando el usuario lo decida


## Historial

- **12-10-2026.** Primera auditoría. La API, caída la víspera por un
  fallo de modelos de cámaras, está arreglada y rápida. Lo urgente pasa
  a ser la seguridad de la consola SQL.
- **27-10-2026.** Segunda revisión, solo desde el repositorio. Caché,
  predicción real y privacidad, hechas. La seguridad de la consola SQL,
  por confirmar. Retirado el código muerto de Actualidad y Administración.

<!-- Fin de fichero: docs/auditoria-tecnica.md -->
