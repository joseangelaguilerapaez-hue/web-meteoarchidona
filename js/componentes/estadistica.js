/*
 * MeteoArchidona · Componente «Estadística»
 *
 * Una gráfica o un informe del catálogo de estadísticas, montable en
 * cualquier página o dashboard (decisión de José, 5-11-2026). Antes solo
 * se podía incrustar buscando huecos dentro de una sección, como hace
 * Actualidad con sus dos gráficas; ahora es un componente más.
 *
 *     <div data-componente="estadistica"
 *          data-estadistica="SILO_LLANOS_TEMPERATURA_7D"
 *          data-presentacion="GRAFICA"></div>
 *
 *     import {montarComponenteEstadistica} from "/js/componentes/estadistica.js?v=…";
 *     montarComponenteEstadistica(hueco);
 *
 * Opciones:
 *   - data-estadistica (obligatoria): código o número de la estadística
 *     del catálogo. El código es lo seguro en las páginas: el número
 *     cambia de una base a otra.
 *   - data-presentacion: GRAFICA para enseñar solo la gráfica aunque la
 *     estadística traiga tabla. Sin ella, como venga definida.
 *
 * Sin sesión, la API solo sirve las de MeteoArchidona publicadas; con la
 * sesión de un registrado, cualquiera publicada del catálogo. Las propias
 * de cada usuario saldrán igual cuando exista su guardado (la API las
 * servirá a su dueño por este mismo camino).
 *
 * El visor es el común (js/visor-estadisticas.js): gráfica, tabla y PDF.
 * Si la estadística no existe o no está disponible, el hueco se oculta
 * sin molestar al resto de la página. Admite varios en la misma página.
 */

import {asegurarHoja, asegurarScript} from "./comun.js?v=20261104-componentes1";

import {
    montarEstadistica
} from "../estadisticas-incrustadas.js?v=20261105-componente1";


const HOJA = "/css/visor-estadisticas.css?v=20261027-visor1";

const SCRIPT_API = "/js/api.js?v=20261003-vps1";


export async function montarComponenteEstadistica(hueco) {

    if (!hueco) {
        return false;
    }

    const codigo = String(hueco.dataset.estadistica || "").trim();

    if (!codigo) {
        console.warn("Estadística: falta data-estadistica en el hueco.");
        hueco.hidden = true;
        return false;
    }

    asegurarHoja(HOJA);
    await asegurarScript(SCRIPT_API, "API_BASE");

    hueco.classList.add("componente-estadistica");

    try {
        return await montarEstadistica(hueco, window.API_BASE || "/api");
    } catch (error) {
        console.warn("No se ha podido cargar la estadística.", error);
        hueco.hidden = true;
        return false;
    }
}


// Fin de fichero: js/componentes/estadistica.js
