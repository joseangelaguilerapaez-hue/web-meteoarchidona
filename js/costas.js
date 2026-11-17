/*
 * MeteoArchidona · Página Costas
 *
 * Decisión de José del 17 y 18-11-2026: sección con el estado de la mar
 * de toda la costa andaluza (Huelva, Cádiz, Málaga, Granada y Almería):
 * oleaje, temperatura del agua y mareas; boyas y mareógrafos medidos
 * mezclados con la previsión por playa, y un buscador de playas por su
 * nombre. Gama «Mar y arena» sobre blanco. Todo en componentes que se
 * pueden poner en los dashboards.
 *
 * Componentes (cada uno en su módulo, con su hoja
 * css/costas-componentes.css):
 *
 *     data-componente="costas-resumen"  → js/costas/resumen.js
 *     data-componente="costas-mapa"     → js/costas/mapa.js
 *     data-componente="costas-playa"    → js/costas/playa.js
 *     data-componente="costas-mareas"   → js/costas/mareas.js
 *     data-componente="costas-boya"     → js/costas/boya.js
 *
 * ?playa=ID en la dirección elige la playa de la ficha y de las mareas
 * (el enlace «Ver la playa» del mapa lleva aquí).
 *
 * Detalle de datos y fuentes en docs/costas.md de api-meteoarchidona.
 */

import {montarResumenCostas} from "./costas/resumen.js?v=20261118-costas1";
import {montarMapaCostas} from "./costas/mapa.js?v=20261118-costas1";
import {montarPlayaCostas} from "./costas/playa.js?v=20261118-costas1";
import {montarMareasCostas} from "./costas/mareas.js?v=20261118-costas1";
import {montarBoyaCostas} from "./costas/boya.js?v=20261118-costas1";


export const COMPONENTES_COSTAS = {
    "costas-resumen": montarResumenCostas,
    "costas-mapa": montarMapaCostas,
    "costas-playa": montarPlayaCostas,
    "costas-mareas": montarMareasCostas,
    "costas-boya": montarBoyaCostas
};


function montar(hueco) {
    const montarComponente = COMPONENTES_COSTAS[hueco.dataset.componente];
    if (!montarComponente) return;

    try {
        const promesa = montarComponente(hueco);
        if (promesa && promesa.catch) {
            promesa.catch(error => console.error(`Costas: falló ${hueco.dataset.componente}`, error));
        }
    } catch (error) {
        console.error(`Costas: no se pudo montar ${hueco.dataset.componente}`, error);
    }
}


/* ?playa=35247 elige la playa de la ficha y de las mareas. */
function playaDeLaDireccion() {
    const pedida = new URLSearchParams(location.search).get("playa");
    return pedida && /^\d{1,9}$/.test(pedida.trim()) ? pedida.trim() : null;
}


function arrancar() {
    const playa = playaDeLaDireccion();

    for (const hueco of document.querySelectorAll("[data-componente]")) {
        if (playa && ["costas-playa", "costas-mareas"].includes(hueco.dataset.componente)) {
            hueco.dataset.playa = playa;
        }
        montar(hueco);
    }
}


arrancar();


/* Fin de fichero: js/costas.js */
