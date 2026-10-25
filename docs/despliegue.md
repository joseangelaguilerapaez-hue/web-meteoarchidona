# Despliegue de la web en producción

Confirmado el 2026-10-23 sobre el propio servidor, con José.

**Fusionar en `main` no despliega nada.** La web se publica haciendo `git pull` en el VPS de Hostinger
desde Termius. Solo José entra y despliega. Claude no puede conectarse al servidor: prepara los comandos
y José los pega.

La documentación completa (servicios, rutas, API, Nginx, migraciones) está en
`docs/despliegue.md` del repositorio `api-meteoarchidona`, porque es el mismo servidor. Aquí solo lo de la web.

## Dónde está

- Carpeta en el servidor: `/srv/meteoarchidona/web` (rama `main`).
- Servida por Nginx, sitio `meteoarchidona-web` (`/etc/nginx/sites-enabled/`).

## Actualizar

```
cd /srv/meteoarchidona/web
GIT_SSH_COMMAND='ssh -i /home/jose/.ssh/id_ed25519_github -o IdentitiesOnly=yes' git pull --ff-only
git log --oneline -1
```

Es un sitio estático: no hay que reiniciar nada. El `git log` debe coincidir con el último commit de
`main` en GitHub. Si `git pull --ff-only` falla, hay cambios locales en el servidor: no forzar, avisar a José.

## Caché

Los `.js` y `.css` se cachean en el navegador y se versionan con `?v=`. Si cambias uno que ya está en
producción, sube también su `?v=`; si no, los visitantes seguirán viendo la versión vieja.

Las páginas y los componentes `.html` no se versionan: Nginx los sirve con `expires -1`
(`Cache-Control: no-cache`), así que el navegador pregunta siempre si han cambiado y recibe la versión
nueva en cuanto se publica. Aplicado el 2026-10-25 en `/etc/nginx/sites-enabled/meteoarchidona-web`
(es un fichero, no un enlace): `expires -1` en `location = /`, `/prediccion` e `/informacion` (las demás
páginas ya lo tenían) y una regla general `location ~ \.html$`. Se usa `expires` y no `add_header`
porque un `add_header` dentro de un `location` anula las cabeceras de seguridad del `server`.
Copia de la configuración anterior: `/etc/nginx/meteoarchidona-web.antes-cache-20261025`.

Ojo: no dejar copias de seguridad dentro de `sites-enabled/`, porque Nginx las carga como sitios.

Los estáticos (`/css`, `/js` y `/assets`) se sirven hoy **sin ninguna cabecera de caché**, solo con
`ETag`: el navegador los vuelve a pedir en cada visita. Para arreglarlo hay un procedimiento
equivalente al anterior, pendiente de ejecutar en el servidor:

```
sudo python3 scripts/configurar_cache_estaticos.py
```

Añade dentro del `server` del sitio `expires 1y;` para `/css` y `/js`, que van siempre versionados
con `?v=`, y `expires 30d;` para `/assets`, que no se versiona: si algún día se cambia el logotipo,
conviene que la gente lo vea en semanas y no en meses. Comprueba antes, hace copia, valida con
`nginx -t`, recarga y restaura si algo falla. Se puede ejecutar dos veces sin que pase nada.

Comprobación:

```
curl -sI https://meteoarchidona.com/css/cabecera.css | grep -i -E 'cache-control|expires'
```

Comprobación:

```
curl -sI https://meteoarchidona.com/prediccion | grep -i -E 'cache-control|expires|strict-transport'
```

## Por confirmar

- El `README.md` y el `.htaccess` hablan de LiteSpeed, pero el servidor usa Nginx. El `.htaccess` **no se
  aplica en producción** (confirmado el 2026-10-25: sus cabeceras de caché no llegaban). Cualquier regla
  que haga falta va en la configuración de Nginx.
