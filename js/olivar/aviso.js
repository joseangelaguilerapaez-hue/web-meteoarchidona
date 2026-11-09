/*
 * MeteoArchidona · Componente «Aviso de El Olivar»
 *
 * El recordatorio fijo de la sección (José, 9-11-2026): lo que se ve aquí
 * es orientativo, calculado con nuestras estaciones, y no sustituye el
 * consejo de un técnico agrícola. Conviene ponerlo en cualquier dashboard
 * que lleve componentes de El Olivar.
 *
 *     <div data-componente="olivar-aviso"></div>
 *
 * No pide nada a la API.
 */

import {crear, prepararRaiz} from "./comun.js?v=20261109-olivar2";


export function montarAvisoOlivar(raiz) {
    prepararRaiz(raiz, "olivar-aviso");
    raiz.setAttribute("role", "note");

    const texto = crear("p");
    texto.appendChild(crear("strong", null, "Información orientativa. "));
    texto.appendChild(document.createTextNode(
        "Sale de los cálculos de MeteoArchidona con sus propias estaciones y modelos publicados. " +
        "No sustituye el consejo de un técnico agrícola ni los avisos oficiales de sanidad vegetal."
    ));
    raiz.appendChild(texto);
}


/* Fin de fichero: js/olivar/aviso.js */
