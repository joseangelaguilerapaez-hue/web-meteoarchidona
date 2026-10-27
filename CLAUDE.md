# CLAUDE.md — web-meteoarchidona

Web pública de meteoarchidona.com: lecturas de las estaciones propias, visor de radar y
satélite, cámaras en vivo e información. Es un **sitio estático**: sin compilación y sin
dependencias que instalar. Los ficheros del repositorio son exactamente los que se sirven.

**Fusionar en `main` no publica nada**: José actualiza el VPS de Hostinger con `git pull` desde
Termius. Lee `docs/despliegue.md` antes de decir que algo "ya está en producción".

Los datos los sirve `api-meteoarchidona` (repositorio aparte). Esta web solo los consume.
No pertenece a Horizonte 4K: no mezcles código, configuración ni secretos con ese proyecto.

## Mapa

- `pages/`: una página HTML por sección (`actualidad`, `en-vivo`, `observaciones`, `prediccion`, `informacion`, `administracion`). `/` sirve `pages/actualidad.html`.
- `js/`: un script por página más módulos (`api.js` centraliza las llamadas a la API; `js/actualidad/` y `js/administracion/` agrupan subsistemas; `js/vendor/` es de terceros).
- `css/`: una hoja por componente o página; `paleta.css` define los colores.
- `componentes/`: fragmentos HTML reutilizables (cabecera, pie, fichas y tablas de estaciones).
- `visores/`: visores embebidos (radar, vídeo, YouTube).
- `datos/`: GeoJSON de límites y localidades; `assets/`: imágenes y fuentes.
- `servidor.py`: servidor de desarrollo. `tests/`: pruebas de estructura y del servidor.
- `docs/`: especificaciones de subsistemas (observaciones, predicción, publicidad, estadísticas, usuarios, auditoría). Lee solo el documento del subsistema que toques.

## Probar en local

`python servidor.py` y abrir http://localhost:8123. No sirve `python -m http.server` ni abrir
los archivos a pelo: las direcciones limpias (`/en-vivo`) las traduce el servidor y la API
no autoriza a `localhost`, por lo que `servidor.py` hace de intermediario en `/api/`.

## Validación (igual que el CI)

- `python -m unittest discover -s tests -v`: estructura del sitio y direcciones del servidor.
- El CI además valida el JavaScript externo y el incluido en los HTML, y el JSON/GeoJSON. Si cambias JS o datos, revisa que siga siendo válido antes de subir.

## Cómo trabajar

- Edita los archivos directamente. Varios archivos relacionados van en un mismo commit y un solo push.
- **Se trabaja en la rama `zonnen69`**: todos los cambios van ahí, salvo que José diga otra cosa. PR a `main` cuando José lo pida. No empujes a `main` sin que se pida.
- Commits al estilo del historial: `fix(en-vivo): descripción en español`, `feat(...)`, `docs(...)`.
- No introduzcas herramientas de compilación ni dependencias nuevas sin que se pida.
- El navegador cachea: si cambias un `.js` o `.css` que ya está en producción, mira cómo versiona el resto del proyecto los recursos antes de decidir.
- Si un cambio exige un endpoint o un campo nuevo, el cambio de backend va en `api-meteoarchidona`, no aquí. Dilo en el PR.

## Estado del proyecto

**Al empezar una sesión, lee `docs/estado.md`**: qué está hecho, qué está en construcción y qué
queda pendiente. Es la fuente de verdad de "por dónde vamos".

**Al terminar cada tarea, actualiza `docs/estado.md` en el mismo PR**: mueve lo que corresponda
entre Hecho, En construcción y Pendiente, y añade una línea fechada al Registro. No marques como
hecho nada que no esté en `main`. Si dudas del estado real de algo, déjalo "por confirmar" y
pregúntaselo a José en vez de suponerlo.

## Cosas que no se hacen sin orden expresa

- Subir nada a GitHub (push, ramas nuevas en el remoto, PR, comentarios): primero se pregunta a José
  y se espera a que diga que sí. Hacer commits en local sí se puede.
- Cambiar `.htaccess`, `robots.txt` o `sitemap.xml`: afectan directamente al servidor en producción.
- Poner claves o credenciales en el código.
