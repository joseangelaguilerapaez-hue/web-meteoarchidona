# Mejoras propuestas — web-meteoarchidona

Repaso del proyecto del 27 de octubre de 2026, medido contra el repositorio (`main` en `81592d8`),
no de memoria. Es una lista para comentar con José: nada de esto está decidido. Cada punto lleva
prioridad, esfuerzo aproximado y en qué repositorio va.

Punto de partida: las 40 pruebas pasan, el CI está en verde y la web no tiene dependencias ni
compilación. Lo que sigue es limpieza, rendimiento y orden, no averías.


## Resumen

| # | Mejora | Prioridad | Esfuerzo | Dónde |
| --- | --- | --- | --- | --- |
| 1 | Borrar `js/actualidad.js` y `js/administracion.js`, que nadie carga | Alta | Bajo | web |
| 2 | Poner al día `docs/estado.md` y `docs/auditoria-tecnica.md` | Alta | Bajo | web |
| 3 | Confirmar la seguridad de la consola SQL y de `/api/docs` | Alta | Bajo* | API |
| 4 | No pedir datos con la pestaña en segundo plano | Alta | Medio | web |
| 5 | Imágenes pesadas | Media | Bajo | web |
| 6 | Decidir el futuro del `.htaccess` | Media | Bajo | web |
| 7 | Regla común para `innerHTML` | Media | Bajo | web |
| 8 | Accesibilidad: teclado, ventanas y `aria-live` | Media | Medio | web |
| 9 | Script para comprobar y subir los `?v=` | Media | Medio | web |
| 10 | Nombres de ficheros en `docs/` | Baja | Bajo | web |
| 11 | Limpiar ramas ya fusionadas | Baja | Bajo | web |
| 12 | Web instalable en el móvil (manifiesto) | Baja | Bajo | web |
| 13 | Aviso en el CI de ficheros grandes | Baja | Bajo | web |

\* Si el parche ya está aplicado, es solo comprobarlo y anotarlo.


## Prioridad alta

### 1. Código muerto: `js/actualidad.js` y `js/administracion.js`

- [x] Hecho el 27 oct: borrados, comentarios corregidos y la prueba ahora comprueba
  `js/actualidad/principal.js`.

Son 61 KB y 85 KB. Desde que se partieron en `js/actualidad/` y `js/administracion/` ninguna página
los carga (último cambio, 16 oct). Solo los nombran comentarios en `js/api.js`, `js/lluvia.js`,
`js/cabecera.js` y `componentes/cabecera.html`, y una prueba
(`tests/test_estructura.py:173`, «lluvia.js tiene que ir detrás de actualidad.js») que ya no
comprueba nada porque ninguna página tiene `actualidad.js`.

Riesgo: que alguien los edite creyendo que están en uso, y que el CI los siga validando.

Propuesta: borrarlos, corregir los comentarios para que apunten a los módulos actuales y cambiar la
prueba por la que tenga sentido hoy (por ejemplo, `lluvia.js` detrás de `actualidad/principal.js`).

### 2. Documentos de estado desfasados

- [x] Hecho el 27 oct: `estado.md` al día y segunda revisión de `auditoria-tecnica.md`. Queda
  por confirmar con José si el visor de estadísticas y la fecha de los timelapses están publicados.

- `docs/estado.md` tiene en *En construcción* cosas que ya están en `main`: el visor de
  estadísticas (PR #46) y la fecha en el nombre de los timelapses (PR #41 a #43) aparecen como
  «rama…» o «pendiente de fusionar». Falta saber si están **publicadas** en el VPS
  **(por confirmar con José)**.
- `docs/auditoria-tecnica.md` es del 12 oct: da por pendientes la predicción real y la caché de
  Nginx, que ya están hechas, y no dice si se aplicó el parche de seguridad (punto 3).

Propuesta: corregir `estado.md` y hacer una segunda revisión fechada de la auditoría técnica, con
las mismas tablas y casillas.

### 3. Seguridad de la consola SQL y de la documentación de la API

- [ ] Comprobado

La auditoría del 12 oct marcaba como urgente que `/api/docs`, `/api/openapi.json` y las páginas
`/api/admin/sql` y `/api/admin/weatherlink` eran públicas, con un parche preparado en la rama
`seguridad-sql` de la API. No consta en ningún documento de este repositorio que se aplicara.

Propuesta: comprobarlo (basta un `curl` a esas direcciones) y anotarlo. Si sigue abierto, el cambio
va en `api-meteoarchidona`, y conviene además cambiar la clave de administración.

### 4. Pestañas en segundo plano

- [ ] Hecho

Hay 21 `setInterval` en la web y solo `js/sol-luna.js`, `js/auditoria.js` y `visores/radar.js`
escuchan `visibilitychange`. Actualidad, En vivo, Observaciones y Predicción siguen pidiendo datos a
la API, y En vivo refrescando las imágenes de las cámaras, con la pestaña oculta o el móvil
bloqueado.

Propuesta: un pequeño ayudante común (por ejemplo en `js/api.js` o un módulo nuevo) que pause los
refrescos mientras la pestaña está oculta y pida datos nada más volver. Menos carga para la API y
menos batería y datos móviles para el visitante.


## Prioridad media

### 5. Imágenes pesadas

- [ ] Hecho

| Fichero | Tamaño | Uso |
| --- | --- | --- |
| `assets/logo-estaciones.png` | 1,5 MB | No lo usa nadie |
| `assets/logo-meteoarchidona.png` | 821 KB | Original del logo; lo carga el PDF de `js/visor-estadisticas.js:730` |
| `assets/logo-camaras.png` | 490 KB | Fondo en `css/visor-video.css` |

Propuesta: borrar el que no se usa, reducir los otros dos a su tamaño de pantalla (el PDF no
necesita 821 KB de logo) y guardar los originales fuera de lo que sirve Nginx. Al cambiar una imagen
cacheada, cambiarle el nombre o la versión (Nginx la guarda 30 días).

### 6. El `.htaccess`

- [ ] Decidido

Producción es Nginx y el `.htaccess` no se aplica, pero las pruebas siguen validándolo
(`tests/test_estructura.py:92-107` y `:233`) y documenta una caché de una semana que no es la real.

Propuesta: sustituirlo por una copia de referencia de la configuración de Nginx de la web (sin nada
secreto) y que las pruebas comprueben esa copia. **Necesita orden expresa de José**: es uno de los
ficheros que no se tocan sin ella.

### 7. `innerHTML`

- [ ] Hecho

Casi todos los `innerHTML` pintan textos fijos o componentes propios, así que no hay un fallo
conocido. Aun así, `js/actualidad/resumen.js:312` mete `estado.texto` y `js/en-vivo.js:1006`
mete `zona.nota`; si algún día esos textos vienen de la API, quedaría una puerta abierta.

Propuesta: dejar escrita la regla que ya sigue `js/informacion.js` (lo que llega de la API, con
`textContent`) y revisar esos dos sitios.

### 8. Accesibilidad

- [ ] Revisado

Bien: `lang="es"`, un `<h1>` por página, `alt` en las imágenes y la lluvia animada respeta
`prefers-reduced-motion`.

Falta:
- Ventanas de cuenta y de privacidad: que el foco se quede dentro, que `Esc` las cierre y que el
  foco vuelva al botón que las abrió.
- `aria-live` en las lecturas que cambian solas (Predicción no tiene ninguno).
- Contraste de `css/paleta.css` sobre los fondos oscuros, y navegación completa con teclado.

### 9. Versionado `?v=` a mano

- [ ] Hecho

Cada `.js` o `.css` cambiado exige subir su `?v=` en todas las páginas que lo cargan. La prueba
detecta que falte, pero no que se haya quedado viejo; el PR #44 fue precisamente eso.

Propuesta: un script en `scripts/` (Python, sin dependencias) que calcule la versión a partir del
contenido del fichero y avise —o reescriba— cuando no coincide. Se ejecuta a mano antes del commit
y, en modo comprobación, en el CI. No es una herramienta de compilación: los ficheros siguen siendo
los que se sirven.


## Prioridad baja

### 10. Nombres en `docs/`

- [ ] Hecho

`Usuarios.md` (mayúscula) y `redimensionamiento Meteoarchidona.md` (espacio) rompen la convención
del resto y complican los enlaces y la línea de órdenes. Renombrarlos a `usuarios.md` y
`redimensionamiento.md` y actualizar las referencias.

### 11. Ramas

- [ ] Decidido

Hay más de 40 ramas en GitHub y la mayoría ya está fusionada en `main`. Propuesta: lista de las
fusionadas para que José decida cuáles borrar. **No se borra ninguna sin que lo pida.**

### 12. Web instalable

- [ ] Hecho

Ya existen iconos de 192 px (`assets/icono-192.png` y otros), pero no hay `manifest.webmanifest`.
Con él y el enlace en las páginas, la web se puede añadir a la pantalla de inicio del móvil con su
icono y su nombre. Sin service worker de momento: no hace falta para esto.

### 13. CI

- [ ] Hecho

El CI ya valida JS, JSON/GeoJSON y ejecuta las pruebas. Propuesta: que avise si un commit añade un
fichero de más de 500 KB, para que no vuelvan a colarse originales de imágenes.


## Funcionalidad que ya está en la lista

No son mejoras nuevas, pero conviene decidir el orden junto con lo anterior (ver `docs/estado.md`):

- Gráficos de temperatura y lluvia en la portada: necesitan una ruta pública de histórico en
  `api-meteoarchidona`.
- Tarjeta de rayos con la ruta pública de descargas eléctricas, que funciona y no se usa.
- Guardar y publicar informes de estadísticas en el catálogo.
- Dar de alta en el catálogo de auditoría el adelanto de la predicción y el texto de Predicción.
- Cuentas de administrador.
