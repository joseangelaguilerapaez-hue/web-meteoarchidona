/*
 * MeteoArchidona · Componente «Timelapses»
 *
 * Los timelapses publicados, montables en cualquier página o dashboard.
 * Hasta el 4-11-2026 solo los montaba Actualidad buscando su sección por
 * id; desde entonces son un componente más (decisión de José: un
 * componente al que se le pasa la cámara y trae su visor y el selector
 * de sus timelapses).
 *
 *     <div data-componente="timelapses" data-camara="1"></div>
 *     <div data-componente="timelapses"></div>
 *
 *     import {montarComponenteTimelapses} from "/js/componentes/timelapses.js?v=…";
 *     montarComponenteTimelapses(hueco);
 *
 * Opciones:
 *   - data-camara: número de la cámara (el id de la API: en Los Llanos,
 *     1 la panorámica y 2 la PTZ). Monta solo la ficha de esa cámara:
 *     su nombre, el selector de días y el visor. Si la cámara no tiene
 *     timelapses publicados, lo dice en el hueco.
 *   - Sin data-camara: la sección completa, con la cabecera y una ficha
 *     por cámara, como en Actualidad. Si no hay ningún timelapse, el
 *     hueco se oculta.
 *
 * Las reglas de relleno son las de js/timelapses.js, iguales en los dos
 * casos: últimos siete días con vídeo, uno por día, el COMPLETO antes
 * que el PARCIAL, y el día anterior seleccionado de entrada. Los vídeos
 * no se descargan hasta pulsar «Reproducir».
 *
 * Admite varios en la misma página. Carga css/timelapses.css y
 * js/api.js si la página no los tiene.
 */

import {asegurarHoja, asegurarScript} from "./comun.js?v=20261104-componentes1";

import {
    montarTimelapses,
    montarTimelapsesCamara
} from "../timelapses.js?v=20261104-camara1";


const HOJA = "/css/timelapses.css?v=20261104-camara1";

const SCRIPT_API = "/js/api.js?v=20261003-vps1";


export async function montarComponenteTimelapses(hueco) {

    asegurarHoja(HOJA);
    await asegurarScript(SCRIPT_API, "API_BASE");

    hueco.classList.add("componente-timelapses");

    const camara = String(hueco.dataset.camara || "").trim();

    if (camara) {
        return montarTimelapsesCamara(hueco, camara);
    }

    hueco.classList.add("timelapses-seccion");
    return montarTimelapses(hueco);
}


/* Fin de fichero: js/componentes/timelapses.js */
