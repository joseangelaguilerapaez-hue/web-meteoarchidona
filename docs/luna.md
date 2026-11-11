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

## Componentes (fases 1 a 3, 11-11-2026)

| Componente | `data-componente` | Módulo | Función | Opciones |
|---|---|---|---|---|
| La Luna ahora | `luna-ahora` | `js/luna/luna-ahora.js` | `montarLunaAhora` | `data-modo="compacto"` |
| Salida y puesta de la Luna | `luna-horario` | `js/luna/horario.js` | `montarHorarioLuna` | `data-dias` (7; de 1 a 31) |
| Calendario lunar | `luna-calendario` | `js/luna/calendario.js` | `montarCalendarioLuna` | `data-selector="no"` |
| Distancia y superlunas | `luna-distancia` | `js/luna/distancia.js` | `montarDistanciaLuna` | `data-anio` |
| Crepúsculos y horas doradas | `luna-crepusculos` | `js/luna/crepusculos.js` | `montarCrepusculos` | `data-dias` (1; hasta 14) |
| Planetas esta noche | `luna-planetas-noche` | `js/luna/planetas-noche.js` | `montarPlanetasNoche` | `data-todos="no"` |
| El cielo ahora | `luna-planetas-ahora` | `js/luna/planetas-ahora.js` | `montarPlanetasAhora` | |
| Pasos de satélites (fase 2) | `luna-pasos` | `js/luna/pasos.js` | `montarPasos` | `data-dias` (3; hasta 10), `data-tipo` (`ISS`, `TIANGONG`, `STARLINK`), `data-todos="si"` |
| ¿Se puede observar? (fase 2) | `luna-observacion` | `js/luna/observacion.js` | `montarObservacion` | `data-noches` (4; de 1 a 4) |
| Aviso del cielo (fase 2) | `luna-aviso` | `js/luna/aviso.js` | `montarAvisoCielo` | `data-horas` (18; hasta 48), `data-solo-aviso="si"` |
| Próximos eventos (fase 3) | `luna-eventos` | `js/luna/eventos.js` | `montarEventos` | `data-dias` (90; hasta 730), `data-tipo` (`ECLIPSE_SOLAR`, `CONJUNCION`, `LLUVIA_ESTRELLAS`…), `data-limite` (12), `data-todos="si"` |
| Próximo eclipse (fase 3) | `luna-eclipse` | `js/luna/eclipse.js` | `montarEclipse` | `data-tipo` (`solar`, `lunar`, `todos`) |
| Lluvias de estrellas (fase 3) | `luna-lluvias` | `js/luna/lluvias.js` | `montarLluvias` | `data-anio`, `data-proximas="si"` |
| Calendario lunar del campo (fase 3) | `luna-campo` | `js/luna/campo.js` | `montarCampo` | `data-selector="no"` |

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

Fase 2: el aviso va arriba en la página con `data-solo-aviso="si"` (no ocupa sitio si no hay nada);
en los pasos de la ISS, enlace al directo de la NASA («Space Station Views»). Colores de los niveles
del índice: Excelente `#4cd38a`, Buena `#a3e26b`, Regular `#f2c94c`, Mala `#f59a4b` e Imposible `#e05b5b`.
Fase 3: «Próximos eventos» enseña por defecto lo vistoso (eclipses, conjunciones, ocultaciones,
oposiciones, elongaciones, lluvias, cometas, superlunas, equinoccios y solsticios) y solo lo que se
ve desde aquí; con `data-todos="si"`, también fases, perigeos, apogeos y lo que no se ve. «Próximo
eclipse» lleva una cuenta atrás que se mueve cada segundo (solo con la pestaña a la vista), el Sol
tapado dibujado con la magnitud de El Silo y el aviso de las gafas homologadas. El calendario del
campo lleva siempre a la vista el aviso de que es tradición y no ciencia (decisión de José).
Toda la sección se versiona junta (`?v=20261111-luna4`); un test lo comprueba.

## Aspecto

`css/luna.css`: fondo azul noche con unas pocas estrellas, bloques `luna-bloque` y textos en oro
lunar. Paleta (`css/luna-componentes.css`): noche `#0b1530`, tarjeta `#13224a`, texto `#e6ecf8`,
oro lunar `#f2c94c`, cian estelar `#7fd3ff`, hora dorada `#f5a623` y hora azul `#3b6fd8`.

## Alta de la dirección

`/luna` está en `servidor.py`, `.htaccess` y `sitemap.xml`, y en Nginx se da de alta con
`scripts/configurar_seccion_luna.py` (el mismo procedimiento que las demás secciones).

## Pendiente

- Fase 4 (mapa del cielo, auroras con `data-archidona` en `sol-auroras`, cielo oscuro y directos,
  con el de la Estación Espacial).
- Dar de alta sus bloques en el catálogo de auditoría (`data-auditoria-visualizacion`).
