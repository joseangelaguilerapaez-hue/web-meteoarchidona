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

## Por confirmar

- El `README.md` y el `.htaccess` hablan de LiteSpeed, pero el servidor usa Nginx. Hasta aclararlo, no
  asumas que el `.htaccess` se aplica en producción.
