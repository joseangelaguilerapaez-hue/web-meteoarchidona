/*
 * MeteoArchidona · Página En vivo
 *
 * Desde el 4-11-2026 las cámaras (selector de zona y rejilla) son el
 * componente js/componentes/camaras-en-vivo.js, que se puede poner en
 * cualquier página o dashboard. Este script solo lo monta. Los directos
 * de YouTube siguen en js/en-vivo-youtube.js con el visor reutilizable
 * visores/youtube.html.
 */

import {montarCamarasEnVivo} from "./componentes/camaras-en-vivo.js?v=20261104-componentes1";


for (const hueco of document.querySelectorAll('[data-componente="camaras-en-vivo"]')) {
    try {
        montarCamarasEnVivo(hueco);
    } catch (error) {
        console.error("En vivo: no se pudieron montar las cámaras", error);
    }
}


/* Fin de fichero: js/en-vivo.js */
