/*
 * MeteoArchidona
 * Estadísticas del catálogo dentro de cualquier página
 *
 * Pone el visor (js/visor-estadisticas.js) en cada hueco marcado con el
 * código de una estadística del catálogo propio:
 *
 *     <section id="graficas" hidden>
 *         <div data-estadistica="SILO_LLANOS_TEMPERATURA_7D"></div>
 *     </section>
 *
 *     import {montarEstadisticas} from "/js/estadisticas-incrustadas.js?v=…";
 *     montarEstadisticas(document.getElementById("graficas"));
 *
 * Pide GET /estadisticas/catalogo/{codigo}/datos. Sin sesión, la API solo
 * sirve las de MeteoArchidona publicadas, que son justo las que se ponen
 * en las páginas públicas (decisión de José, 27-10-2026). Se pide por
 * código y no por número: el número cambia de una base a otra.
 *
 * Con data-presentacion="GRAFICA" se enseña solo la gráfica aunque la
 * estadística traiga también tabla: en una portada, una tabla de 30 filas
 * alarga demasiado la página. La tabla completa sigue en /estadisticas.
 *
 * La sección sigue oculta hasta que llega al menos una; el hueco que
 * falla se quita sin molestar al resto de la página. Primera página que
 * lo usa: Actualidad (29-10-2026). Es la pieza de los futuros dashboards.
 */

import {
    crearVisorEstadisticas
} from "./visor-estadisticas.js?v=20261027-visor1";


async function montarUna(hueco, urlApi){

    const codigo = hueco.dataset.estadistica;

    const respuesta = await fetch(
        `${urlApi}/estadisticas/catalogo/${encodeURIComponent(codigo)}/datos`,
        {credentials: "same-origin", cache: "no-store"}
    );

    if(!respuesta.ok){
        throw new Error(`${codigo}: HTTP ${respuesta.status}`);
    }

    const resultado = await respuesta.json();

    if(hueco.dataset.presentacion){
        resultado.presentacion = hueco.dataset.presentacion;
    }

    crearVisorEstadisticas(hueco).mostrar(resultado);

    return true;
}


export async function montarEstadisticas(seccion){

    if(!seccion){
        return false;
    }

    const urlApi = window.API_BASE || "/api";

    const huecos = [...seccion.querySelectorAll("[data-estadistica]")];

    const resultados = await Promise.allSettled(
        huecos.map(hueco => montarUna(hueco, urlApi))
    );

    let alguna = false;

    resultados.forEach((resultado, i) => {
        if(resultado.status === "fulfilled"){
            alguna = true;
            return;
        }
        console.warn("No se ha podido cargar la estadística.", resultado.reason);
        huecos[i].remove();
    });

    seccion.hidden = !alguna;

    return alguna;
}


// Fin de fichero: js/estadisticas-incrustadas.js
