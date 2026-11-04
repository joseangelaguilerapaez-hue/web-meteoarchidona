/*
 * MeteoArchidona · Página Estadísticas
 *
 * Desde el 4-11-2026 el aviso de registro, el catálogo y el visor son el
 * componente js/componentes/catalogo-estadisticas.js, que se puede poner
 * en cualquier página o dashboard. Este script solo lo monta.
 */

import {montarCatalogoEstadisticas} from "./componentes/catalogo-estadisticas.js?v=20261104-componentes1";


for (const hueco of document.querySelectorAll('[data-componente="catalogo-estadisticas"]')) {
    try {
        montarCatalogoEstadisticas(hueco);
    } catch (error) {
        console.error("Estadísticas: no se pudo montar el catálogo", error);
    }
}


// Fin de fichero: js/estadisticas.js
