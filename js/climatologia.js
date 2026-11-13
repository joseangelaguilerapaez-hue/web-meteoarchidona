/*
 * MeteoArchidona · Página Climatología
 *
 * Decisión de José del 13-11-2026: sección «Climatología», con el
 * subtítulo «El clima de la comarca desde 1940»: reconstrucción histórica
 * del clima de los pueblos de la comarca Nororiental de Málaga y de
 * Antequera con el reanálisis ERA5 de Copernicus, corregido con la
 * rejilla de AEMET y con nuestras estaciones. Todo en componentes que se
 * pueden poner en los dashboards, con fondo propio y la gama «Papel de
 * archivo».
 *
 * Componentes (cada uno en su módulo, con su hoja
 * css/climatologia-componentes.css):
 *
 *     data-componente="clima-climograma" → js/climatologia/climograma.js
 *     data-componente="clima-normales"   → js/climatologia/normales.js
 *     data-componente="clima-metodo"     → js/climatologia/metodo.js
 *
 * En la página, un solo selector de pueblo arriba manda en todos los
 * componentes (que van con data-selector="no").
 *
 * Detalle de datos y método en docs/climatologia.md de api-meteoarchidona.
 */

import {montarClimograma} from "./climatologia/climograma.js?v=20261113-clima1";
import {montarNormalesClima} from "./climatologia/normales.js?v=20261113-clima1";
import {montarMetodoClima} from "./climatologia/metodo.js?v=20261113-clima1";
import {pedirPuntos, PUNTO_POR_DEFECTO} from "./climatologia/comun.js?v=20261113-clima1";


export const COMPONENTES_CLIMATOLOGIA = {
    "clima-climograma": montarClimograma,
    "clima-normales": montarNormalesClima,
    "clima-metodo": montarMetodoClima
};

/* Componentes que dependen del pueblo elegido arriba. */
const DEPENDEN_DEL_PUEBLO = ["clima-climograma", "clima-normales"];


function montar(hueco) {
    const montarComponente = COMPONENTES_CLIMATOLOGIA[hueco.dataset.componente];
    if (!montarComponente) return;

    try {
        const promesa = montarComponente(hueco);
        if (promesa && promesa.catch) {
            promesa.catch(error => console.error(`Climatología: falló ${hueco.dataset.componente}`, error));
        }
    } catch (error) {
        console.error(`Climatología: no se pudo montar ${hueco.dataset.componente}`, error);
    }
}


function huecosDelPueblo() {
    return DEPENDEN_DEL_PUEBLO.flatMap(nombre => [...document.querySelectorAll(`[data-componente="${nombre}"]`)]);
}


async function prepararSelector() {
    const selector = document.querySelector("[data-selector-pueblo]");
    if (!selector) return;

    let puntos = [];
    try {
        puntos = await pedirPuntos();
    } catch {
        selector.closest("label")?.setAttribute("hidden", "");
        return;
    }

    for (const punto of puntos) {
        selector.appendChild(new Option(`${punto.nombre} (${punto.altitud} m)`, punto.codigo));
    }

    const guardado = new URLSearchParams(location.search).get("pueblo");
    const inicial = puntos.some(p => p.codigo === (guardado || "").toUpperCase()) ? guardado.toUpperCase() : PUNTO_POR_DEFECTO;
    selector.value = inicial;

    selector.addEventListener("change", () => {
        const url = new URL(location.href);
        url.searchParams.set("pueblo", selector.value.toLowerCase());
        history.replaceState(null, "", url);
        for (const hueco of huecosDelPueblo()) {
            hueco.dataset.punto = selector.value;
            montar(hueco);
        }
    });

    return inicial;
}


async function arrancar() {
    const inicial = await prepararSelector();

    for (const hueco of document.querySelectorAll("[data-componente]")) {
        if (inicial && DEPENDEN_DEL_PUEBLO.includes(hueco.dataset.componente)) {
            hueco.dataset.punto = inicial;
        }
        montar(hueco);
    }
}


arrancar();


/* Fin de fichero: js/climatologia.js */
