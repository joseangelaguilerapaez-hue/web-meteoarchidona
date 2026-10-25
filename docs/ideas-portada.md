# Ideas para la portada (Actualidad)

Escrito el 25 de octubre de 2026 a partir de `pages/actualidad.html`, los módulos de
`js/actualidad/` y las rutas públicas que hoy ofrece `api-meteoarchidona`.

La portada es `/` (sirve `pages/actualidad.html`): es la primera cosa que ve quien
llega desde Google o desde un enlace compartido. Hoy tiene cuatro bloques:

1. Panel superior: «Condiciones actuales», «Sol y luna» y las fichas de estación.
2. Timelapse del día anterior (oculto hasta que hay vídeo publicado).
3. Dos gráficos.
4. Una rejilla de seis accesos.

Este documento no es un plan cerrado: es la lista de lo que sobra, lo que engaña y lo
que falta, ordenada para irla aplicando poco a poco. Cada punto lleva **qué pasa hoy**,
**qué propongo** y **qué cuesta**. Lo que necesite API nueva lo dice.

---

## Lo que engaña al visitante (primero esto)

### 1. Los dos gráficos son dibujos, no datos

**Hoy.** «Temperatura · últimas 24 horas» y «Lluvia · últimos 7 días» son
`polyline` y `rect` escritos a mano en el HTML (`pages/actualidad.html`, líneas 446 a
593). Ningún JavaScript los toca: no hay nada en `js/actualidad/` que busque esos
elementos. El propio `aria-label` dice «Gráfico de temperatura de muestra». La leyenda
nombra El Silo y Los Llanos, así que quien lo ve cree que esa es la temperatura real de
anoche. Es el mismo problema que tenía Predicción con sus datos de muestra, y ese se
quitó el 25 de octubre.

**Qué propongo.** Dos pasos, en este orden:

- **Paso corto (una tarde).** Quitar los gráficos falsos de la portada. Mejor un hueco
  que un dato inventado.
- **Paso real.** Hacerlos de verdad. El histórico **ya está guardado** en PostgreSQL
  (`servicios/persistencia_historico_ecowitt.py`,
  `servicios/persistencia_historico_weatherlink.py`, y hay backfill), pero **no hay
  ruta pública** que lo sirva: solo lo ven las rutas de administración. Hace falta algo
  del estilo

      GET /estaciones/{codigo}/historico?desde=...&hasta=...&paso=10min

  con los campos mínimos (instante, temperatura, lluvia acumulada) y caché, como la de
  predicción. El cambio de backend va en `api-meteoarchidona`.

**Cuesta.** El paso corto, nada. El paso real: una ruta nueva en la API con sus
pruebas, y en la web un módulo que dibuje el SVG con datos. Es el trabajo más grande de
esta lista y el que más cambia la portada.

### 2. Cuatro de los seis accesos no llevan a ninguna parte

**Hoy.** La rejilla de abajo tiene seis tarjetas. `#graficos`, `#estaciones` y
`/en-vivo` funcionan. Las otras tres —`#historicos`, `#alertas`, `#estado`— apuntan a
anclas que **no existen en ninguna página del sitio**. Quien las pulsa no ve nada: ni
error ni salto. Son promesas de secciones que no están construidas.

**Qué propongo.** Dejar solo lo que existe y aprovechar el sitio para enlazar las
secciones reales que hoy no se enlazan desde la portada: **Predicción**,
**Observaciones** e **Información**. Seis tarjetas que llevan a seis sitios de verdad.

Si se quieren conservar «Alertas» o «Estado del sistema» como objetivo, que sea en el
documento de pendientes, no como un enlace muerto en producción.

**Cuesta.** Un rato. Solo HTML y los textos.

---

## Lo que está desaprovechado

### 3. «Condiciones actuales» no dice la temperatura

**Hoy.** La tarjeta que encabeza la portada y se llama «Condiciones actuales» no trae
ninguna condición: un sol con una nube **dibujados y fijos** (no cambian con el tiempo
real), «⌖ ARCHIDONA», «Málaga · Andalucía» y las horas de amanecer y atardecer. La
temperatura hay que ir a buscarla a la ficha de estación de más abajo.

**Qué propongo.** Que esa tarjeta sea el titular: temperatura de referencia de
Archidona en grande, sensación o humedad y viento debajo, y la hora de la lectura.
El dato ya está: Predicción usa la observación real de El Silo, y aquí se puede usar lo
mismo que las fichas (`/estaciones/{codigo}/condiciones-actuales/...`,
`js/actualidad/api.js`). Y que el icono responda al dato en vez de ser siempre un sol
con una nube.

Cuidado con una cosa: si se usa El Silo como «la temperatura de Archidona», hay que
**decir de qué estación es**. Si esa estación se queda sin datos, la tarjeta tiene que
decirlo, igual que ahora dicen las fichas «Sin datos desde...».

**Cuesta.** Medio. Reaprovecha código que ya existe; el trabajo está en el diseño de la
tarjeta y en los casos de fallo.

### 4. Los rayos están en la API y no se ven en la web

**Hoy.** La API tiene ruta pública de descargas eléctricas, con imagen incluida
(`api/descargas_electricas.py`: `GET /descargas-electricas` y `.../imagen`). En toda la
web **no hay una sola referencia** a esas rutas. Está hecho y no se usa.

**Qué propongo.** Una tarjeta de rayos en la portada, visible solo cuando hay actividad
cercana en las últimas horas: «3 descargas en la última hora, la más próxima a 12 km».
Es justo el tipo de cosa por la que la gente vuelve a una web del tiempo local en una
tarde de tormenta. Antes de construirla hay que mirar qué devuelve exactamente la ruta y
con qué cobertura.

**Cuesta.** Medio, y hay que comprobar primero el dato.

### 5. La predicción no asoma por la portada

**Hoy.** Predicción ya da datos reales de AEMET y, desde el 25 de octubre, un texto
redactado a partir de ellos (`GET /prediccion/{municipio}/texto`). La portada no dice
ni una palabra de mañana.

**Qué propongo.** Una tira baja con los tres próximos días (máxima, mínima, icono) o
las dos primeras frases del texto del presentador, enlazando a `/prediccion`. Barato,
porque el endpoint ya existe y la web ya sabe leerlo.

**Cuesta.** Poco.

### 6. El timelapse aparece y desaparece sin avisar

**Hoy.** La sección nace con `hidden` y solo se muestra si hay vídeo publicado del día
anterior. Quien entró ayer y lo vio, hoy puede no encontrarlo y pensar que se ha roto.

**Qué propongo.** Dejarlo oculto cuando no hay vídeo (es lo correcto), pero decidir qué
ocurre cuando falta varios días seguidos: o un enlace permanente a los timelapses, o una
línea breve explicando cada cuánto se publican. Esto es más una decisión que un cambio.

**Cuesta.** Poco, una vez decidido.

---

## Detalles menores (se pueden hacer de paso)

- **El título no se ve.** El `h1` de la portada es `solo-lectores`: existe para
  buscadores y lectores de pantalla, pero en pantalla no hay ningún rótulo que diga qué
  es esto. Un visitante nuevo tiene que deducirlo.
- **La descripción para Google es pobre.** «Actualidad meteorológica de
  MeteoArchidona.» no menciona Archidona, ni las estaciones, ni las cámaras. Es la
  frase que se lee en los resultados de búsqueda y en WhatsApp al compartir el enlace.
- **Los iconos de los accesos son emoji** (📊 📈 📷 📡 ⚠️ ✅). Cada sistema los pinta a
  su manera y el ⚠️ sale en color propio, que choca con la paleta. Si se rehace la
  rejilla (punto 2), es el momento de pasarlos a SVG.
- **Orden en móvil.** Conviene revisar que lo primero que se ve al entrar desde el
  teléfono sea el dato del tiempo, y no la tarjeta de la luna.

---

## Añadido el 25 de octubre, después de ver la página publicada

Tres cosas que saltaron a la vista con los cambios ya en la web, y lo que se hizo:

- **El hueco de las fichas sin cámara.** Esconder la zona con `display: none` no quitaba
  su columna de la rejilla: la fila superior medía 511 px con los datos apretados en 220
  y 280 vacíos al lado. Sin cámara, la zona superior pasa a una sola columna. **Hecho.**
- **El timelapse, enorme.** Ocupaba 1279 px de ancho en una pantalla de 1440. La lista
  pasa a columnas de 560 px como mucho, centradas. **Hecho.**
- **El icono del tiempo.** Nuestras estaciones no miden el estado del cielo, así que se
  toma el de AEMET para la hora en curso y manda nuestra medida cuando contradice (si
  llueve, llueve). De noche, luna con su fase. **Hecho.**

Queda de aquí:

- Poner esos mismos iconos en el adelanto de tres días, que sigue sin ellos.
- En la ficha sin cámara, cuando exista la ruta de histórico, la máxima y la mínima del
  día, que es lo que más se echa de menos.
- Plegar la sección de timelapses cuando haya tres o cuatro cámaras.

## Orden que propongo

1. Quitar los gráficos de muestra (punto 1, paso corto).
2. Arreglar la rejilla de accesos (punto 2) con sus iconos y su descripción.
3. Convertir «Condiciones actuales» en el titular de verdad (punto 3).
4. Asomar la predicción (punto 5).
5. Gráficos reales, con la ruta nueva en la API (punto 1, paso real).
6. Rayos, una vez comprobado el dato (punto 4).

Los cuatro primeros son de la web sola. El quinto necesita cambio en
`api-meteoarchidona` y es el que hay que planificar aparte.

<!-- Fin de fichero: docs/ideas-portada.md -->
