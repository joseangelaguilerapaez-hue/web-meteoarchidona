# Embalses

Decisión de José del 5-11-2026: la sección de embalses de su antigua web (que sacaba de
embalses.net), ahora con datos propios del Boletín Hidrológico semanal del Ministerio, a nivel
nacional, **toda en componentes** que se pueden poner en los dashboards, y con un **aspecto propio de
agua**: blanco y azules, del celeste claro al azul profundo, frente al oscuro del resto del sitio.
Se conservan las líneas de siempre (bloques con bordes finos, radios de 14 px, etiquetas en
JetBrains Mono); solo cambia la paleta.

Los datos los sirve la API (`docs/embalses.md` de `api-meteoarchidona`): tablas, carga semanal de los
martes y endpoints `/embalses/...`.

## Página `/embalses`

`pages/embalses.html`, `js/embalses.js`, `css/embalses.css`. Andalucía por defecto, con un selector
para España, cualquier comunidad, cuenca o provincia. La dirección guarda la elección:
`/embalses?ambito=CUENCA&codigo=GUADALQUIVIR`, `/embalses?embalse=GUADALQUIVIR-IZNAJAR` (con la ficha
abierta arriba). Al tocar una cuenca cambia el ámbito; al tocar un embalse se abre su ficha.

## Componentes (`js/embalses/`)

Todos montables (`data-componente`), con `data-ambito` y `data-codigo` (como la API; sin ellos,
Andalucía). Paleta y estilos en `css/embalses-componentes.css`, acotados a `.emb-componente`, para que
se vean igual dentro de un dashboard oscuro. Cada uno carga la hoja si falta.

| `data-componente` | Qué enseña | Atributos propios |
| --- | --- | --- |
| `embalses-resumen` | Vaso con el %, hm³, variación de la semana, hace un año y medias de 5 y 10 años | `data-titulo="no"` |
| `embalses-cuencas` | Una tarjeta por cuenca del ámbito | — |
| `embalses-anio-hidrologico` | Gráfica del año hidrológico: actual, anterior, medias y franja mín.–máx. de 10 años | `data-anio`, `data-titulo="no"` |
| `embalses-lista` | Embalses con buscador y orden | `data-maximo` (25), `data-orden`, `data-buscador="no"` |
| `embalses-ficha` | Un embalse: datos, vaso, año hidrológico e histórico desde 1988 | `data-embalse` (código), `data-historico="no"` |
| `embalses-comarca` | Vasos de unos pocos embalses (Iznájar, Guadalhorce-Guadalteba, Conde de Guadalhorce, La Viñuela) | `data-embalses` (códigos con comas), `data-titulo` |

Estados: crítico < 25 %, bajo < 50 %, bueno < 75 %, lleno ≥ 75 %. Las gráficas son SVG propias,
redibujadas al ancho del hueco. Los datos cambian una vez por semana: caché de 10 minutos y sin
refresco automático.

## Agua y sequía: pestañas (14-11-2026)

Decisión de José del 13 y 14-11-2026 (`docs/agua-sequia.md` de la API): la sección se llama ahora
**«Agua y sequía»** (menú, título y cabecera) y sigue en `/embalses`. Va en pestañas, como
Predicción: **Embalses** (por defecto, lo de siempre), **Sequía** y **Ríos** (por llegar). La pestaña
abierta queda en la dirección: `/embalses#sequia`, `/embalses#rios`; los parámetros de Embalses
(`?ambito=…`, `?embalse=…`) se conservan.

### Pestaña Sequía (`js/sequia/`, `css/sequia-componentes.css`)

Misma paleta de agua (carga también `css/embalses-componentes.css`); las clases secas se salen del
azul hacia ocres y rojizos. Los componentes se cargan la primera vez que se abre la pestaña.

| Componente | Qué es | Opciones |
| --- | --- | --- |
| `sequia-suelo` | Humedad del suelo de un pueblo en cuatro capas frente a lo normal 1991-2020; los últimos días, del modelo (trazo discontinuo) | `data-punto`, `data-selector="no"`, `data-dias` (90), `data-capa` (2) |
| `sequia-lluvia-anio` | Lluvia acumulada desde el 1 de octubre frente a la normal; en Archidona, también El Silo y Los Llanos | `data-punto`, `data-selector="no"` |
| `sequia-indices` | SPI y SPEI a 1, 3, 6 y 12 meses, con barras de la escala elegida | `data-punto`, `data-selector="no"`, `data-meses` (36), `data-escala` (6), `data-indice` (`spei`/`spi`) |
| `sequia-mapa` | Mapa de España del Observatorio Europeo de la Sequía: SPEI, SPI, humedad del suelo, vegetación o indicador combinado, con fecha a elegir (fase 2) | `data-producto` (`SPEI`), `data-escala` (3), `data-selector="no"` |
| `sequia-oficial` | Situación oficial del Ministerio: recuento de escenarios, los dos mapas oficiales y las tablas por demarcación con el escenario estimado o revisado (fase 2) | `data-demarcacion`, `data-mapas="no"`, `data-tablas="no"` |

Pueblos (los tres primeros): los de Climatología (`/climatologia/puntos`). La corrección del escenario oficial está en Administración → Sequía. Datos: `/agua/sequia/...` de la API. Están
también en el pintor de dashboards.

## Pendiente

- Mapa de embalses, cuando el catálogo de la API tenga coordenadas.
- Dar de alta sus bloques en el catálogo de auditoría.
