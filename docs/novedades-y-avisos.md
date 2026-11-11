# Novedades y avisos (web)

Decisiones de José del 11-11-2026. El detalle de la API (tablas, migración 0056, endpoints y el
generador de avisos de la Estación Espacial) está en `docs/novedades.md` de `api-meteoarchidona`.

## En la portada (`js/novedades.js`)

- **Ventana**: novedades y avisos **manuales**, como hasta ahora (una vez por navegador; si cambian,
  vuelven a salir). La etiqueta dice NOVEDAD, AVISO o NOVEDADES Y AVISOS según lo que haya.
- **Franja** encima de la portada: avisos **automáticos** (origen `AUTOMATICO`), como los pases muy
  brillantes de la Estación Espacial. Desde el 12-11-2026 (José), **una sola línea**: el título pasa
  desplazándose de derecha a izquierda (marquesina) en **rojo**, con el **borde verde fluorescente**, y
  a la derecha «Detalles» (despliega el texto debajo), «Ver» (su enlace) y la X. Se para al pasar el
  ratón o tocarlo, y queda quieta si el sistema pide menos animación. Cerrado un aviso, no vuelve a salir en ese navegador salvo que cambie (`localStorage`,
  `ma_avisos_cerrados_v1`).
- Los enlaces, solo a nuestra web (empiezan por `/`); el texto, siempre como texto.

## Página «Novedades y avisos» (`/novedades`)

`pages/novedades.html` y `js/novedades-pagina.js`, con las mismas piezas que la ventana. Arriba lo
vigente (avisos primero); debajo, lo de los últimos 60 días (`GET /novedades/archivo?dias=60`). En el
menú, detrás de Actualidad. Dirección limpia en `.htaccess`, `servidor.py`, `sitemap.xml` y Nginx
(`scripts/configurar_seccion_novedades.py`, que José ejecuta en el VPS).

## Administración → Novedades y avisos

El editor añade **Tipo** (novedad o aviso) y **Enlace** (opcional). La lista marca «Aviso
automático» y enseña la clave; si se edita uno automático, el servidor lo vuelve a escribir en su
siguiente cálculo, pero si se desactiva, se queda desactivado.
