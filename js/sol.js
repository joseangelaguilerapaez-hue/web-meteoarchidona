/*
 * MeteoArchidona · Página Sol
 *
 * Desde el 4-11-2026 todo lo de la página son componentes reutilizables
 * (decisión de José: poder ponerlos en los dashboards). Este script solo
 * los monta en sus huecos.
 *
 * Componentes (cada uno en su módulo, con su hoja css/sol-componentes.css):
 *
 *     data-componente="sol-tiempo-espacial"  → js/sol/tiempo-espacial.js
 *     data-componente="sol-alertas"          → js/sol/alertas-solares.js
 *     data-componente="sol-directo"          → js/sol/sol-directo.js
 *     data-componente="sol-coronografos"     → js/sol/coronografos.js
 *     data-componente="sol-indice-kp"        → js/sol/indice-kp.js
 *     data-componente="sol-prevision-noaa"   → js/sol/prevision-noaa.js
 *     data-componente="sol-fulguraciones"    → js/sol/fulguraciones.js
 *     data-componente="sol-auroras"          → js/sol/auroras.js
 *
 * Todo se pide directamente a NOAA, NASA y ESA; no pasa por la API.
 * Detalle en docs/sol.md.
 */

import {montarTiempoEspacial} from "./sol/tiempo-espacial.js?v=20261104-componentes2";
import {montarAlertasSolares} from "./sol/alertas-solares.js?v=20261104-componentes2";
import {montarSolDirecto} from "./sol/sol-directo.js?v=20261104-componentes2";
import {montarIndiceKp} from "./sol/indice-kp.js?v=20261104-componentes2";
import {montarCoronografos} from "./sol/coronografos.js?v=20261104-componentes2";
import {montarPrevisionNoaa} from "./sol/prevision-noaa.js?v=20261104-componentes2";
import {montarFulguraciones} from "./sol/fulguraciones.js?v=20261104-componentes2";
import {montarAuroras} from "./sol/auroras.js?v=20261104-componentes2";


export const COMPONENTES_SOL = {
    "sol-tiempo-espacial": montarTiempoEspacial,
    "sol-alertas": montarAlertasSolares,
    "sol-directo": montarSolDirecto,
    "sol-coronografos": montarCoronografos,
    "sol-indice-kp": montarIndiceKp,
    "sol-prevision-noaa": montarPrevisionNoaa,
    "sol-fulguraciones": montarFulguraciones,
    "sol-auroras": montarAuroras
};


function montarComponentes() {
    for (const hueco of document.querySelectorAll("[data-componente]")) {
        const montar = COMPONENTES_SOL[hueco.dataset.componente];
        if (!montar) continue;
        try {
            montar(hueco);
        } catch (error) {
            console.error(`Sol: no se pudo montar ${hueco.dataset.componente}`, error);
        }
    }
}


montarComponentes();

/* Fin de fichero: js/sol.js */
