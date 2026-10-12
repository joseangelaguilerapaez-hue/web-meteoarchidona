# Auditoría técnica de la web

Revisión periódica del estado de meteoarchidona.com: qué funciona, qué
falla y qué conviene arreglar, con casillas para ir marcando el avance.

No confundir con [auditoria.md](auditoria.md), que es el diseño del
subsistema de analítica propia.

**Última revisión: 12 de octubre de 2026.** Medido contra el sitio
publicado y contra el repositorio, no de memoria.


## Resumen

| Área | Estado |
| --- | --- |
| Disponibilidad | Bien: las seis páginas y la API responden |
| Velocidad | Bien: la API bajó de 11 s a 0,6 s con la mudanza al VPS |
| Seguridad | **Mal: la consola SQL y la documentación de la API siguen públicas** |
| Caché del navegador | Regular: los estáticos se vuelven a pedir en cada visita |
| Contenido | Regular: la predicción aún enseña datos de muestra |
| Calidad del código | Bien: 23 pruebas en verde y CI en verde |

Lo urgente es lo de seguridad. Lo demás es mejora.


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

- [ ] Volver a poner los tres commits revertidos (están en la historia)
- [ ] Configurar en nginx un año de caché para `/css`, `/js` y `/assets`,
      que es seguro porque todo va versionado con `?v=`
- [ ] Ejecutar el script en el VPS para que las seis páginas lleven
      `expires -1`


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

- [ ] Ruta `/prediccion/archidona` en la API
- [ ] Revisar las tarjetas de cámaras de la portada con lo nuevo


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

- [ ] Retomar el aviso legal cuando el usuario lo decida


## Historial

- **12-10-2026.** Primera auditoría. La API, caída la víspera por un
  fallo de modelos de cámaras, está arreglada y rápida. Lo urgente pasa
  a ser la seguridad de la consola SQL.

<!-- Fin de fichero: docs/auditoria-tecnica.md -->
