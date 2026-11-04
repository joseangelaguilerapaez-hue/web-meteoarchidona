/*
 * MeteoArchidona · Componente «Predicción de AEMET» (compuesto)
 *
 * Hasta el 4-11-2026 era un solo bloque con todo dentro. Desde entonces
 * (decisión de José: dividir Predicción en componentes, como Sol) cada
 * pieza es su propio componente en js/prediccion/, que se puede poner
 * suelto en cualquier página o dashboard:
 *
 *     data-componente="prediccion-avisos"       → js/prediccion/avisos.js
 *     data-componente="prediccion-ahora"        → js/prediccion/ahora.js
 *     data-componente="prediccion-presentador"  → js/prediccion/presentador.js
 *     data-componente="prediccion-hoy"          → js/prediccion/hoy.js
 *     data-componente="prediccion-horas"        → js/prediccion/horas.js
 *     data-componente="prediccion-dias"         → js/prediccion/dias.js
 *
 * Este módulo los junta en el orden de siempre, para quien quiera la
 * predicción entera en un solo hueco:
 *
 *     <div data-componente="prediccion-aemet"></div>
 *
 *     import {montarPrediccionAemet} from "/js/prediccion-aemet.js?v=…";
 *     montarPrediccionAemet(hueco);
 *
 * MeteoArchidona no predice ni inventa: cada pieza dice de dónde viene
 * lo que enseña y, si AEMET no responde, lo avisa o conserva lo último.
 */

import {montarAvisos} from "./prediccion/avisos.js?v=20261104-componentes1";
import {montarAhora} from "./prediccion/ahora.js?v=20261104-componentes1";
import {montarPresentador} from "./prediccion/presentador.js?v=20261104-componentes1";
import {montarHoy} from "./prediccion/hoy.js?v=20261104-componentes1";
import {montarHoras} from "./prediccion/horas.js?v=20261104-componentes1";
import {montarDias} from "./prediccion/dias.js?v=20261104-componentes1";


/* Por nombre de data-componente, para las páginas que montan las piezas
 * sueltas (js/prediccion.js y, más adelante, los dashboards). */
export const COMPONENTES_PREDICCION = {
    "prediccion-avisos": montarAvisos,
    "prediccion-ahora": montarAhora,
    "prediccion-presentador": montarPresentador,
    "prediccion-hoy": montarHoy,
    "prediccion-horas": montarHoras,
    "prediccion-dias": montarDias
};


export function montarPrediccionAemet(raiz) {
    raiz.classList.add("pred-componente");
    raiz.textContent = "";

    for (const [nombre, montar] of Object.entries(COMPONENTES_PREDICCION)) {
        const hueco = document.createElement("div");
        hueco.dataset.componente = nombre;

        if (raiz.dataset.municipio) {
            hueco.dataset.municipio = raiz.dataset.municipio;
        }

        raiz.append(hueco);

        try {
            montar(hueco);
        } catch (error) {
            console.error(`Predicción: no se pudo montar ${nombre}`, error);
        }
    }
}


/* Fin de fichero: js/prediccion-aemet.js */
