# Sección Sol y sus componentes

Página `/sol` (`pages/sol.html`), publicada el 4-11-2026. Recupera la sección del Sol de la antigua
web de José: el Sol casi en directo, las tormentas solares, las alertas y los índices.

## De dónde salen los datos

Todo se pide **directamente a los servicios públicos**, desde el navegador. No pasa por
`api-meteoarchidona`.

- NOAA, Centro de Predicción del Tiempo Espacial (`services.swpc.noaa.gov`): escalas R, S y G y su
  previsión, alertas, índice Kp y su previsión, viento solar, campo Bz, rayos X, fulguraciones,
  flujo F10.7 y el óvalo de auroras.
- NASA, Observatorio de Dinámica Solar (`sdo.gsfc.nasa.gov`): imágenes del disco solar.
- ESA y NASA, SOHO (`soho.nascom.nasa.gov`): coronógrafos LASCO C2 y C3.

Datos cada 5 minutos e imágenes cada 15 (lo que se renuevan en origen), solo con la pestaña a la
vista. Las horas de la NOAA llegan en UTC y se enseñan en hora de Madrid.

## Componentes para dashboards (4-11-2026)

Decisión de José: sacar de la página los cuatro bloques más importantes como componentes, para
poder ponerlos en los dashboards configurables. La página Sol se monta con ellos.

| Componente | `data-componente` | Módulo | Función |
|---|---|---|---|
| Tiempo espacial ahora | `sol-tiempo-espacial` | `js/sol/tiempo-espacial.js` | `montarTiempoEspacial` |
| Alertas solares | `sol-alertas` | `js/sol/alertas-solares.js` | `montarAlertasSolares` |
| El Sol en directo | `sol-directo` | `js/sol/sol-directo.js` | `montarSolDirecto` |
| Índice Kp con previsión | `sol-indice-kp` | `js/sol/indice-kp.js` | `montarIndiceKp` |
| Previsión de la NOAA a 3 días | `sol-prevision-noaa` | `js/sol/prevision-noaa.js` | `montarPrevisionNoaa` |
| Fulguraciones de 7 días | `sol-fulguraciones` | `js/sol/fulguraciones.js` | `montarFulguraciones` |
| Corona y eyecciones (LASCO C2 y C3) | `sol-coronografos` | `js/sol/coronografos.js` | `montarCoronografos` |
| Óvalo de auroras | `sol-auroras` | `js/sol/auroras.js` | `montarAuroras` |

Los cuatro últimos se sacaron de la página el 4-11-2026 por la tarde (decisión de José: «ya que
nos ponemos, lo configuramos todo»). Sus estilos pasaron de `css/sol.css` a
`css/sol-componentes.css`.

Uso en cualquier página:

```html
<div data-componente="sol-alertas"></div>

<script type="module">
import {montarAlertasSolares} from "/js/sol/alertas-solares.js?v=20261104-componentes2";
montarAlertasSolares(document.querySelector('[data-componente="sol-alertas"]'));
</script>
```

(En el sitio el `<script>` va en un fichero aparte; las pruebas no admiten código dentro del HTML.)

Opciones, por atributos del hueco:

- `sol-tiempo-espacial`: `data-modo="ampliado"` añade viento solar, Bz, rayos X y flujo F10.7.
  Sin él (compacto), las tres escalas con nombre corto y el Kp: es el modo de los dashboards.
- `sol-alertas`: `data-horas` (72 por defecto) y `data-anteriores="si"` para enseñar, plegadas,
  las más viejas (lo usa la página).
- `sol-directo`: `data-filtro` con el filtro de entrada (`0193` corona por defecto, `0171`,
  `0304`, `0131`, `HMIIC` manchas, `HMIB` magnetismo).
- `sol-indice-kp`: `data-dias` hacia atrás (3 por defecto, de 1 a 7).
- `sol-fulguraciones`: `data-cuantas`, cuántas de las más fuertes se listan (8 por defecto; `0`
  deja solo el recuento de X, M y C).
- `sol-coronografos`: `data-camaras`, `C2`, `C3` o `C2,C3` (las dos por defecto).

Lo que tienen en común:

- Cada uno trae su marcado, sin `id`: puede haber varios en la misma página.
- Cargan solos su hoja, `css/sol-componentes.css`, si la página no la tiene.
- Se adaptan al **ancho del hueco**, no al de la pantalla (`container-type` y `@container`). La
  gráfica del Kp se vuelve a dibujar si el hueco cambia de ancho.
- Llevan un pie pequeño con la hora de la última lectura, o el aviso si la NOAA no responde. Si un
  servicio falla, solo ese componente lo dice.
- Comparten `js/sol/comun.js`: si dos componentes leen el mismo fichero de la NOAA, se pide una
  sola vez por minuto, y un único reloj refresca todo.
- No llevan título: lo pone la casilla del dashboard o la sección de la página.

## Solo en la página

Solo el glosario y las fuentes (texto). Todo lo demás son componentes, que monta `js/sol.js`.

## Pendiente

- Los ocho componentes están en el catálogo de componentes de la API (`utilidades/componentes.py`).
- Dar de alta sus bloques en el catálogo de auditoría (`data-auditoria-visualizacion`).
