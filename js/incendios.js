/*
 * MeteoArchidona · Página Incendios
 *
 * Decisión de José del 15-11-2026: sección propia «Incendios», riesgo de
 * incendio forestal de toda España con detalle de la comarca, solo con
 * los niveles oficiales de AEMET (que manda) y de EFFIS (Copernicus). Todo
 * en componentes que se pueden poner en los dashboards, con fondo propio
 * y la gama «Brasa sobre oscuro».
 *
 * Componentes (cada uno en su módulo, con su hoja
 * css/incendios-componentes.css):
 *
 *     data-componente="incendios-resumen"     → js/incendios/resumen.js
 *     data-componente="incendios-epoca"       → js/incendios/epoca.js
 *     data-componente="incendios-comarca"     → js/incendios/comarca.js
 *     data-componente="incendios-pueblo"      → js/incendios/pueblo.js
 *     data-componente="incendios-mapa"        → js/incendios/mapa.js
 *     data-componente="incendios-temporada"   → js/incendios/temporada.js
 *     data-componente="incendios-divulgacion" → js/incendios/divulgacion.js
 *
 * Detalle de datos y método en docs/incendios.md de api-meteoarchidona.
 */

import {montarResumenIncendios} from "./incendios/resumen.js?v=20261115-incendios1";
import {montarEpocaIncendios} from "./incendios/epoca.js?v=20261115-incendios1";
import {montarComarcaIncendios} from "./incendios/comarca.js?v=20261115-incendios1";
import {montarPuebloIncendios} from "./incendios/pueblo.js?v=20261115-incendios1";
import {montarMapaIncendios} from "./incendios/mapa.js?v=20261115-incendios1";
import {montarTemporadaIncendios} from "./incendios/temporada.js?v=20261115-incendios1";
import {montarDivulgacionIncendios} from "./incendios/divulgacion.js?v=20261115-incendios1";


export const COMPONENTES_INCENDIOS = {
    "incendios-resumen": montarResumenIncendios,
    "incendios-epoca": montarEpocaIncendios,
    "incendios-comarca": montarComarcaIncendios,
    "incendios-pueblo": montarPuebloIncendios,
    "incendios-mapa": montarMapaIncendios,
    "incendios-temporada": montarTemporadaIncendios,
    "incendios-divulgacion": montarDivulgacionIncendios
};


function montar(hueco) {
    const montarComponente = COMPONENTES_INCENDIOS[hueco.dataset.componente];
    if (!montarComponente) return;

    try {
        const promesa = montarComponente(hueco);
        if (promesa && promesa.catch) {
            promesa.catch(error => console.error(`Incendios: falló ${hueco.dataset.componente}`, error));
        }
    } catch (error) {
        console.error(`Incendios: no se pudo montar ${hueco.dataset.componente}`, error);
    }
}


/* ?pueblo=antequera elige el pueblo de la ficha y de la temporada. */
function puebloDeLaDireccion() {
    const pedido = new URLSearchParams(location.search).get("pueblo");
    return pedido ? pedido.trim().toUpperCase().replace(/[^A-Z_]/g, "") : null;
}


function arrancar() {
    const pueblo = puebloDeLaDireccion();

    for (const hueco of document.querySelectorAll("[data-componente]")) {
        if (pueblo && ["incendios-pueblo", "incendios-temporada"].includes(hueco.dataset.componente)) {
            hueco.dataset.punto = pueblo;
        }
        montar(hueco);
    }
}


arrancar();


/* Fin de fichero: js/incendios.js */
