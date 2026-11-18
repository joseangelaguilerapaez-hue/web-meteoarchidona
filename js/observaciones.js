/*
 * MeteoArchidona · Página Seguimiento (observaciones)
 *
 * Monta los componentes de la página en sus huecos. De momento solo la
 * «Comparación visual» (José, 18-11-2026), debajo del Vistazo general;
 * el visor de seguimiento y la tabla siguen en sus iframes.
 *
 *     data-componente="comparacion-visual" → js/componentes/comparacion-visual.js
 */

import {montarComparacionVisual} from "./componentes/comparacion-visual.js?v=20261118-comparacion1";


const COMPONENTES_SEGUIMIENTO = {
    "comparacion-visual": montarComparacionVisual
};


for (const hueco of document.querySelectorAll("[data-componente]")) {
    const montar = COMPONENTES_SEGUIMIENTO[hueco.dataset.componente];
    if (!montar) {
        continue;
    }
    try {
        montar(hueco);
    } catch (error) {
        console.error(`Seguimiento: no se pudo montar ${hueco.dataset.componente}`, error);
    }
}


/* Fin de fichero: js/observaciones.js */
