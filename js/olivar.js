/*
 * MeteoArchidona · Página El Olivar
 *
 * Decisión de José del 9-11-2026: sección «El Olivar», agrometeorología
 * del olivar con nuestras dos Davis (El Silo y Los Llanos), todo por
 * estación y comparable, en componentes que se puedan poner en los
 * dashboards, con fondo blanco y la gama «Aceite y oro». Primera entrega:
 * frío invernal y heladas; segunda: grados-día, ET0 y balance hídrico.
 *
 * Componentes (cada uno en su módulo, con su hoja
 * css/olivar-componentes.css):
 *
 *     data-componente="olivar-aviso"     → js/olivar/aviso.js
 *     data-componente="olivar-resumen"   → js/olivar/resumen.js
 *     data-componente="olivar-frio"      → js/olivar/frio.js
 *     data-componente="olivar-heladas"   → js/olivar/heladas.js
 *     data-componente="olivar-grados-dia" → js/olivar/grados-dia.js
 *     data-componente="olivar-balance"   → js/olivar/balance.js
 *
 * Detalle de datos y modelos en docs/olivar.md de api-meteoarchidona.
 */

import {montarAvisoOlivar} from "./olivar/aviso.js?v=20261109-olivar2";
import {montarResumenOlivar} from "./olivar/resumen.js?v=20261109-olivar2";
import {montarFrioOlivar} from "./olivar/frio.js?v=20261109-olivar2";
import {montarHeladasOlivar} from "./olivar/heladas.js?v=20261109-olivar2";
import {montarGradosDiaOlivar} from "./olivar/grados-dia.js?v=20261109-olivar2";
import {montarBalanceOlivar} from "./olivar/balance.js?v=20261109-olivar2";


export const COMPONENTES_OLIVAR = {
    "olivar-aviso": montarAvisoOlivar,
    "olivar-resumen": montarResumenOlivar,
    "olivar-frio": montarFrioOlivar,
    "olivar-heladas": montarHeladasOlivar,
    "olivar-grados-dia": montarGradosDiaOlivar,
    "olivar-balance": montarBalanceOlivar
};


function montar(hueco) {
    const montarComponente = COMPONENTES_OLIVAR[hueco.dataset.componente];
    if (!montarComponente) return;

    try {
        const promesa = montarComponente(hueco);
        if (promesa && promesa.catch) {
            promesa.catch(error => console.error(`El Olivar: falló ${hueco.dataset.componente}`, error));
        }
    } catch (error) {
        console.error(`El Olivar: no se pudo montar ${hueco.dataset.componente}`, error);
    }
}


for (const hueco of document.querySelectorAll("[data-componente]")) {
    montar(hueco);
}


/* Fin de fichero: js/olivar.js */
