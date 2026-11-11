# Sección Luna y sus componentes

Página `/luna` (`pages/luna.html`), la hermana de Sol: la astronomía vista desde Archidona. Decisiones
de José del 11-11-2026 (nombre «Luna», gama «Azul noche y oro lunar» sobre fondo oscuro propio, mapa
del cielo interactivo en el navegador, empezar por la Luna, los crepúsculos y los planetas). Diseño
completo, datos y fases en `docs/luna.md` de `api-meteoarchidona`.

## De dónde salen los datos

Al revés que Sol, todo pasa por la API (`/api/luna/...`): lo calcula nuestro servidor con Skyfield
para la estación de El Silo y lo guarda en la base. La imagen de la Luna es de Dial-a-Moon (NASA)
y la API solo da su dirección; si la NASA no responde, el componente dibuja la fase. Horas siempre
en hora de Madrid.

## Componentes (fase 1, 11-11-2026)

| Componente | `data-componente` | Módulo | Función | Opciones |
|---|---|---|---|---|
| La Luna ahora | `luna-ahora` | `js/luna/luna-ahora.js` | `montarLunaAhora` | `data-modo="compacto"` |
| Salida y puesta de la Luna | `luna-horario` | `js/luna/horario.js` | `montarHorarioLuna` | `data-dias` (7; de 1 a 31) |
| Calendario lunar | `luna-calendario` | `js/luna/calendario.js` | `montarCalendarioLuna` | `data-selector="no"` |
| Distancia y superlunas | `luna-distancia` | `js/luna/distancia.js` | `montarDistanciaLuna` | `data-anio` |
| Crepúsculos y horas doradas | `luna-crepusculos` | `js/luna/crepusculos.js` | `montarCrepusculos` | `data-dias` (1; hasta 14) |
| Planetas esta noche | `luna-planetas-noche` | `js/luna/planetas-noche.js` | `montarPlanetasNoche` | `data-todos="no"` |
| El cielo ahora | `luna-planetas-ahora` | `js/luna/planetas-ahora.js` | `montarPlanetasAhora` | |

Lo que tienen en común (como Sol y El Olivar):

- Cada uno trae su marcado, sin `id`: puede haber varios en la misma página.
- Cargan solos su hoja, `css/luna-componentes.css` (paleta `--lun-*`), si la página no la tiene.
- Se adaptan al **ancho del hueco** (`container-type` y `@container`).
- Comparten `js/luna/comun.js`: peticiones con caché corta, horas de Madrid, el dibujo de la fase
  y un reloj que solo refresca con la pestaña a la vista (Luna y cielo ahora, cada 10 minutos y cada
  minuto; el resto, cada media hora o cada hora).
- Pie pequeño con la fuente; si la API no tiene aún la efeméride (503), lo dicen.
- Están en `js/dashboards/pintor.js` y en el catálogo de componentes de la API (tipo `LUNA`).

«Planetas esta noche» pide la noche en curso: antes de las 12:00, la que empezó ayer por la tarde.

## Aspecto

`css/luna.css`: fondo azul noche con unas pocas estrellas, bloques `luna-bloque` y textos en oro
lunar. Paleta (`css/luna-componentes.css`): noche `#0b1530`, tarjeta `#13224a`, texto `#e6ecf8`,
oro lunar `#f2c94c`, cian estelar `#7fd3ff`, hora dorada `#f5a623` y hora azul `#3b6fd8`.

## Alta de la dirección

`/luna` está en `servidor.py`, `.htaccess` y `sitemap.xml`, y en Nginx se da de alta con
`scripts/configurar_seccion_luna.py` (el mismo procedimiento que las demás secciones).

## Pendiente

- Fases 2 a 4 (satélites, índice de observación, eventos, mapa del cielo, auroras con
  `data-archidona` en `sol-auroras`, cielo oscuro y directos).
- Dar de alta sus bloques en el catálogo de auditoría (`data-auditoria-visualizacion`).
