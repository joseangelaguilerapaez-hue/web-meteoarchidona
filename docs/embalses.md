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

## Pendiente

- Mapa de embalses, cuando el catálogo de la API tenga coordenadas.
- Dar de alta sus bloques en el catálogo de auditoría.
