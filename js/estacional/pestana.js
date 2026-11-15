/*
 * MeteoArchidona · Componente «Predicción estacional» (pestaña entera)
 *
 * La pestaña «Estacional» de Predicción (José, 14-11-2026): el texto, el
 * trimestre, los tres meses, qué dice cada modelo y «Cómo se hace». Cada
 * pieza es a su vez un componente que se puede poner suelto en otras
 * páginas o dashboards (js/estacional/*.js).
 *
 *     <div data-componente="prediccion-estacional"></div>
 *
 * Más adelante irá al lado de las Cabañuelas (modelos frente a tradición):
 * la barra de js/estacional/comun.js admite otro origen con los mismos
 * escenarios.
 */

import { crear, asegurarHoja, vaciar } from "./comun.js?v=20261115-estacional1";
import { montarEstacionalTexto } from "./texto.js?v=20261115-estacional1";
import { montarEstacionalTrimestre } from "./trimestre.js?v=20261115-estacional1";
import { montarEstacionalMeses } from "./meses.js?v=20261115-estacional1";
import { montarEstacionalModelos } from "./modelos.js?v=20261115-estacional1";
import { montarEstacionalNota } from "./nota.js?v=20261115-estacional1";


const PIEZAS = [
    ["estacional-trimestre", montarEstacionalTrimestre],
    ["estacional-texto", montarEstacionalTexto],
    ["estacional-meses", montarEstacionalMeses],
    ["estacional-modelos", montarEstacionalModelos],
    ["estacional-nota", montarEstacionalNota]
];


export function montarPrediccionEstacional(raiz) {
    asegurarHoja();
    vaciar(raiz);
    raiz.classList.add("est-pestana");

    for (const [nombre, montar] of PIEZAS) {
        const hueco = crear("div");
        hueco.dataset.componente = nombre;
        if (raiz.dataset.salida) {
            hueco.dataset.salida = raiz.dataset.salida;
        }
        raiz.appendChild(hueco);
        montar(hueco).catch((error) => {
            console.error(`Estacional: no se pudo montar ${nombre}`, error);
        });
    }
}


/* Fin de fichero: js/estacional/pestana.js */
