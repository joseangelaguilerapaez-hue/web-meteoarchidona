/*
 * MeteoArchidona · Componente «Sol y luna»
 *
 * Amanecer, atardecer, duración del día y cuánto cambia, fase de la luna
 * con su dibujo y las próximas luna llena y nueva. Sacado de Actualidad
 * el 4-11-2026.
 *
 *     <div data-componente="sol-luna"></div>
 *
 *     import {montarSolLuna} from "/js/componentes/tarjeta-sol-luna.js?v=…";
 *     montarSolLuna(hueco);
 *
 * Los cálculos son de js/sol-luna.js (en el navegador, sin pedir nada a
 * nadie), que este módulo carga si falta y que se renueva solo cada diez
 * minutos. Usa id fijos: uno por página.
 */

import {asegurarHoja, asegurarScript, prepararTarjeta} from "./comun.js?v=20261104-componentes1";


const MARCADO = `
<h2
    class="seccion-titulo"
    id="sol-luna-titulo"
>
    Sol y luna
</h2>


<div class="sol-luna-dia">

    <span class="sol-luna-etiqueta">
        Duración del día
    </span>

    <strong
        class="sol-luna-duracion"
        id="sol-duracion"
    >
        --
    </strong>

    <span
        class="sol-luna-nota"
        id="sol-diferencia"
    ></span>

</div>


<div class="luna">

    <svg
        class="luna-dibujo"
        viewBox="-50 -50 100 100"
        aria-hidden="true"
    >
        <circle
            class="luna-sombra"
            r="46"
        ></circle>

        <path
            class="luna-luz"
            id="luna-luz"
            d=""
        ></path>
    </svg>


    <div>

        <div
            class="luna-fase"
            id="luna-fase"
        >
            --
        </div>

        <div
            class="sol-luna-nota"
            id="luna-iluminada"
        ></div>

    </div>

</div>


<div class="sol-horas">


<div class="sol-hora">

    ● <time id="luna-proxima-llena">--</time>

    <span>
        Luna llena
    </span>

</div>


<div class="sol-hora">

    ○ <time id="luna-proxima-nueva">--</time>

    <span>
        Luna nueva
    </span>

</div>


</div>
`;


export function montarSolLuna(raiz) {
    asegurarHoja("/css/componentes-actualidad.css?v=20261104-componentes1");
    prepararTarjeta(raiz, ["tarjeta", "sol-luna"], MARCADO);
    raiz.setAttribute("aria-labelledby", "sol-luna-titulo");

    void asegurarScript("/js/sol-luna.js?v=20261104-componentes1", "MeteoLuna")
        .then(luna => luna?.actualizar?.());
}


/* Fin de fichero: js/componentes/tarjeta-sol-luna.js */
