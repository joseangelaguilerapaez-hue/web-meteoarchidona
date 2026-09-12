# MeteoArchidona · web

Web pública de [meteoarchidona.com](https://meteoarchidona.com): las
lecturas de las estaciones meteorológicas propias de la comarca de
Archidona, el visor de radar y satélite, y las cámaras en vivo.

Es un sitio estático. No hay compilación, ni dependencias que instalar,
ni paso de publicación: los ficheros del repositorio son exactamente los
que se sirven.

Los datos los pone una API aparte, en su propio repositorio.

## Cómo se prueba en local

```bash
python servidor.py
```

Y abrir <http://localhost:8123>. Hace falta Python 3; no hay nada más
que instalar.

No vale `python -m http.server` ni abrir los ficheros a pelo, por dos
razones:

- **Las direcciones son limpias** (`/en-vivo`, no `/pages/en-vivo.html`)
  y quien las traduce es el servidor. Con otro, esas direcciones dan
  404.
- **La API no autoriza a `localhost`**, así que el navegador descartaría
  sus respuestas y las estaciones saldrían con guiones. `servidor.py`
  hace de intermediario en `/api/`, y así se ven datos reales mientras
  se trabaja.

## Cómo está montado

```
index                 no existe: "/" sirve pages/actualidad.html
pages/                una página por sección
  actualidad.html       portada: fichas de las estaciones
  observaciones.html    marco del visor de radar
  prediccion.html       en construcción
  en-vivo.html          cámaras
  administracion.html   panel privado, con PIN
componentes/
  cabecera.html         la navegación, en un solo sitio
visores/
  radar.html            el visor, que se mete en un iframe
css/, js/             un fichero por página, con el mismo nombre
assets/, datos/       imágenes, tipografías y el geojson del mapa
docs/                 diseño funcional de cada subsistema
.htaccess             direcciones, redirecciones, cabeceras y caché
servidor.py           servidor de desarrollo
```

Las direcciones que ve el visitante:

| Dirección | Fichero |
|---|---|
| `/` | `pages/actualidad.html` |
| `/observaciones` | `pages/observaciones.html` |
| `/prediccion` | `pages/prediccion.html` |
| `/en-vivo` | `pages/en-vivo.html` |
| `/administracion` | `pages/administracion.html` |

Las viejas (`/index.html`, `/en-vivo.html`, `/pages/en-vivo.html`…)
redirigen con un 301 a la buena.

## Reglas de la casa

**Nada de CSS ni de JavaScript dentro del HTML.** Cada página enlaza su
`css/<pagina>.css` y su `js/<pagina>.js`. El HTML es marcado y nada más.

**La cabecera se toca en un solo sitio**, `componentes/cabecera.html`.
La inserta `js/cabecera.js` en el `<div id="cabecera">` de cada página,
y el enlace de la sección actual se marca con
`<body data-seccion="...">`.

**Al añadir una sección hay que tocar tres sitios**, o la página existirá
a medias:

1. `.htaccess`, para que la dirección limpia lleve al fichero.
2. La lista `SECCIONES` de `servidor.py`, para poder probarla en local.
3. `componentes/cabecera.html`, para que salga en el menú.

**Al publicar hay que subir el `?v=` de los enlaces.** Las hojas y los
scripts se cachean una semana (ver `.htaccess`); sin cambiar ese número,
el visitante seguiría con la versión vieja.

**La dirección de la API se decide en `js/api.js`** y en ningún otro
sitio: `/api` en local, la API en Render en producción.

## Qué se comprueba solo

`.github/workflows/ci.yml` valida en cada empujón la sintaxis de todo el
JavaScript, el del repositorio y el que hubiera dentro de un HTML, y que
no entren espacios en blanco al final de línea.

Lo que **no** hay todavía: pruebas de verdad. Están pendientes, junto
con el Service Worker para que el sitio abra sin conexión.

## Al desplegar

El sitio está en Hostinger, que sirve con LiteSpeed y lee el `.htaccess`
con la misma sintaxis que Apache. Nada de ese fichero se puede probar en
local, así que conviene comprobar a mano:

```
/                 → Actualidad
/en-vivo          → la página
/en-vivo.html     → 301 a /en-vivo
/.git/config      → 404
/css/cabecera.css → llega comprimido
```
