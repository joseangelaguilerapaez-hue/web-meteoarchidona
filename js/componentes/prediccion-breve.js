/*
 * MeteoArchidona · Componente «Los próximos días»
 *
 * Tres días de AEMET en corto, con enlace a Predicción. Sacado de
 * Actualidad el 4-11-2026. Nace oculto y solo aparece si la predicción
 * llega.
 *
 *     <div data-componente="prediccion-breve"></div>
 *
 *     import {montarPrediccionBreve} from "/js/componentes/prediccion-breve.js?v=…";
 *     montarPrediccionBreve(hueco);
 *
 * La lógica sigue en js/actualidad/prediccion-breve.js (cada 30 minutos).
 * Usa id fijos: uno por página.
 */

import {asegurarHoja, asegurarScript, prepararTarjeta} from "./comun.js?v=20261104-componentes1";
import {iniciarPrediccionBreve} from "../actualidad/prediccion-breve.js?v=20261025-icono2";


const MARCADO = `
<div class="prediccion-breve-cabecera">


<div>

    <h2
        class="seccion-titulo"
        id="prediccion-breve-titulo"
    >
        Los próximos días
    </h2>

    <p class="prediccion-breve-fuente">
        Predicción de AEMET para Archidona.
    </p>

</div>


<a
    class="prediccion-breve-enlace"
    href="/prediccion"
>
    Ver los siete días
</a>


</div>


<p
    class="prediccion-breve-vieja"
    id="prediccion-breve-vieja"
    hidden
>
    AEMET lleva un rato sin publicar: esta predicción no es la del último
    boletín.
</p>


<div
    class="prediccion-breve-dias"
    id="prediccion-breve-dias"
></div>
`;


export function montarPrediccionBreve(raiz) {
    asegurarHoja("/css/componentes-actualidad.css?v=20261104-componentes1");
    asegurarHoja("/css/iconos-tiempo.css?v=20261025-icono1");
    prepararTarjeta(raiz, ["tarjeta", "prediccion-breve"], MARCADO);
    raiz.id = "prediccion-breve";
    raiz.setAttribute("aria-labelledby", "prediccion-breve-titulo");
    raiz.hidden = true;

    void asegurarScript("/js/iconos-tiempo.js?v=20261025-icono1", "IconosTiempo")
        .then(() => iniciarPrediccionBreve());
}


/* Fin de fichero: js/componentes/prediccion-breve.js */
