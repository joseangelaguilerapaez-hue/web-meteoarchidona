/*
 * MeteoArchidona · Componente «Condiciones actuales»
 *
 * La tarjeta de la portada con la lectura real de ahora en Archidona
 * (estación El Silo, o la siguiente con dato al día), el cielo según
 * AEMET y la hora del sol. Sacada de Actualidad el 4-11-2026 (decisión
 * de José: todo en componentes, para los dashboards).
 *
 *     <div data-componente="condiciones-actuales"></div>
 *
 *     import {montarCondicionesActuales} from "/js/componentes/condiciones-actuales.js?v=…";
 *     montarCondicionesActuales(hueco);
 *
 * La lógica sigue en js/actualidad/resumen.js; los dibujos, en
 * js/iconos-tiempo.js, y el amanecer y el atardecer los pone
 * js/sol-luna.js. Este módulo los carga si faltan. Usa id fijos: uno
 * por página. Se renueva cada minuto.
 */

import {asegurarHoja, asegurarScript, prepararTarjeta} from "./comun.js?v=20261104-componentes1";
import {actualizarResumen} from "../actualidad/resumen.js?v=20261113-episodio1";


const REFRESCO_MS = 60 * 1000;

const MARCADO = `
<h2 class="seccion-titulo">
    Condiciones actuales
</h2>


<div
    class="estado"
    id="resumen-estado"
>

    <span class="punto"></span>

    Datos MeteoArchidona

</div>


<!--
    La lectura de la estación de referencia (El Silo), la misma que usa
    «Ahora en Archidona» en Predicción. La rellena js/actualidad/resumen.js.
-->
<div
    class="resumen-ahora"
    id="resumen-ahora"
>


<!--
    Estado del cielo. Lo rellena js/actualidad/resumen.js con la hora en
    curso de la predicción de AEMET, salvo que la estación esté midiendo
    lluvia. Nace oculto: sin dato no se dibuja nada.
-->
<div
    class="resumen-cielo"
    id="resumen-cielo"
    hidden
>

    <div
        class="resumen-cielo-dibujo"
        id="resumen-cielo-dibujo"
        aria-hidden="true"
    ></div>

    <div
        class="resumen-cielo-texto"
        id="resumen-cielo-texto"
    ></div>

</div>


<div class="resumen-temperatura">

    <span id="resumen-temperatura">--</span><span class="resumen-unidad">°C</span>

</div>


<dl class="resumen-detalles">


<div class="resumen-detalle">

    <dt>Humedad</dt>

    <dd id="resumen-humedad">--</dd>

</div>


<div class="resumen-detalle">

    <dt>Viento</dt>

    <dd id="resumen-viento">--</dd>

</div>


<div class="resumen-detalle">

    <dt>Lluvia hoy</dt>

    <dd id="resumen-lluvia">--</dd>

</div>


</dl>


</div>


<div class="ubicacion">
    ⌖ ARCHIDONA
</div>


<div class="ubicacion-sub">
    Málaga · Andalucía
</div>


<div class="sol-horas">


<div class="sol-hora">

    ☀ <time id="sol-amanecer">--:--</time>

    <span>
        Amanecer
    </span>

</div>


<div class="sol-hora">

    ☾ <time id="sol-atardecer">--:--</time>

    <span>
        Atardecer
    </span>

</div>


</div>
`;


export function montarCondicionesActuales(raiz) {
    asegurarHoja("/css/componentes-actualidad.css?v=20261104-componentes1");
    asegurarHoja("/css/iconos-tiempo.css?v=20261025-icono1");
    prepararTarjeta(raiz, ["tarjeta", "resumen"], MARCADO);

    Promise.all([
        asegurarScript("/js/iconos-tiempo.js?v=20261025-icono1", "IconosTiempo"),
        asegurarScript("/js/sol-luna.js?v=20261104-componentes1", "MeteoLuna")
    ]).then(([, luna]) => {
        luna?.actualizar?.();
        void actualizarResumen();
    });

    window.setInterval(() => {
        if (!document.hidden) {
            void actualizarResumen();
        }
    }, REFRESCO_MS);
}


/* Fin de fichero: js/componentes/condiciones-actuales.js */
