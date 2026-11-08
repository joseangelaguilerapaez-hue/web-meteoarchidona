/*
 * MeteoArchidona · Página Sismología
 *
 * Decisión de José del 8-11-2026: sección de terremotos con el IGN como
 * fuente oficial y el EMSC como aviso rápido, guardados en nuestra base
 * (a menos de 300 km de Archidona), toda en componentes que se puedan
 * poner en los dashboards. Fondo blanco con la gama «Basalto y magma».
 *
 * Componentes (cada uno en su módulo, con su hoja
 * css/sismologia-componentes.css):
 *
 *     data-componente="sismologia-aviso"          → js/sismologia/aviso.js
 *     data-componente="sismologia-ultimo"         → js/sismologia/ultimo.js
 *     data-componente="sismologia-resumen"        → js/sismologia/resumen.js
 *     data-componente="sismologia-mapa"           → js/sismologia/mapa.js
 *     data-componente="sismologia-lista"          → js/sismologia/lista.js
 *     data-componente="sismologia-estadisticas"   → js/sismologia/estadisticas.js
 *
 * Detalle de datos y fuentes en docs/sismologia.md de api-meteoarchidona.
 */

import {montarAvisoTerremoto} from "./sismologia/aviso.js?v=20261108-sismo2";
import {montarUltimoTerremoto} from "./sismologia/ultimo.js?v=20261108-sismo2";
import {montarResumenSismico} from "./sismologia/resumen.js?v=20261108-sismo2";
import {montarMapaTerremotos} from "./sismologia/mapa.js?v=20261108-sismo2";
import {montarListaTerremotos} from "./sismologia/lista.js?v=20261108-sismo2";
import {montarEstadisticasSismicas} from "./sismologia/estadisticas.js?v=20261108-sismo2";


export const COMPONENTES_SISMOLOGIA = {
    "sismologia-aviso": montarAvisoTerremoto,
    "sismologia-ultimo": montarUltimoTerremoto,
    "sismologia-resumen": montarResumenSismico,
    "sismologia-mapa": montarMapaTerremotos,
    "sismologia-lista": montarListaTerremotos,
    "sismologia-estadisticas": montarEstadisticasSismicas
};


function montar(hueco) {
    const montarComponente = COMPONENTES_SISMOLOGIA[hueco.dataset.componente];
    if (!montarComponente) return;

    try {
        const promesa = montarComponente(hueco);
        if (promesa && promesa.catch) {
            promesa.catch(error => console.error(`Sismología: falló ${hueco.dataset.componente}`, error));
        }
    } catch (error) {
        console.error(`Sismología: no se pudo montar ${hueco.dataset.componente}`, error);
    }
}


document.querySelectorAll("[data-componente]").forEach(montar);


/* Fin de fichero: js/sismologia.js */
