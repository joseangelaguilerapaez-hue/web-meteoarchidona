/*
 * MeteoArchidona · Página Seguimiento (observaciones)
 *
 * Monta los componentes de la página en sus huecos. De momento solo el
 * «Vistazo general» (José, 18-11-2026): tabla de estaciones o Comparación
 * visual con un selector; el visor de seguimiento sigue en su iframe.
 *
 *     data-componente="vistazo-general" → js/componentes/vistazo-general.js
 */

import {montarVistazoGeneral} from "./componentes/vistazo-general.js?v=20261118-pantalla1";


const COMPONENTES_SEGUIMIENTO = {
    "vistazo-general": montarVistazoGeneral
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
