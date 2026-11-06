/*
 * MeteoArchidona · Página Polen
 *
 * Decisión de José del 6-11-2026: sección de alergias al polen sin
 * AEMET, sobre todo para la primavera y para Archidona, toda en
 * componentes que se puedan poner en los dashboards, con el mismo
 * aspecto que Embalses (blanco) pero en verdes y marrones.
 *
 * Componentes (cada uno en su módulo, con su hoja
 * css/polen-componentes.css):
 *
 *     data-componente="polen-hoy"          → js/polen/hoy.js
 *     data-componente="polen-prevision"    → js/polen/prevision.js
 *     data-componente="polen-semana"       → js/polen/semana.js
 *     data-componente="polen-serie"        → js/polen/serie.js
 *     data-componente="polen-calendario"   → js/polen/calendario.js
 *
 * Este script monta los componentes y rellena la tabla de niveles con
 * los umbrales de la API. Detalle de datos y fuentes en docs/polen.md de
 * api-meteoarchidona.
 */

import {montarPolenHoy} from "./polen/hoy.js?v=20261106-polen1";
import {montarPolenPrevision} from "./polen/prevision.js?v=20261106-polen1";
import {montarPolenSemana} from "./polen/semana.js?v=20261106-polen1";
import {montarPolenSerie} from "./polen/serie.js?v=20261106-polen1";
import {montarPolenCalendario} from "./polen/calendario.js?v=20261106-polen1";
import {pedir, crear, pastillaNivel, granos} from "./polen/comun.js?v=20261106-polen1";


export const COMPONENTES_POLEN = {
    "polen-hoy": montarPolenHoy,
    "polen-prevision": montarPolenPrevision,
    "polen-semana": montarPolenSemana,
    "polen-serie": montarPolenSerie,
    "polen-calendario": montarPolenCalendario
};


function montar(hueco) {
    const montarComponente = COMPONENTES_POLEN[hueco.dataset.componente];
    if (!montarComponente) return;

    try {
        const promesa = montarComponente(hueco);
        if (promesa && promesa.catch) {
            promesa.catch(error => console.error(`Polen: falló ${hueco.dataset.componente}`, error));
        }
    } catch (error) {
        console.error(`Polen: no se pudo montar ${hueco.dataset.componente}`, error);
    }
}


async function rellenarUmbrales() {
    const cuerpo = document.querySelector(".polen-umbrales tbody");
    if (!cuerpo) return;

    let tipos;
    try {
        tipos = await pedir("/polen/tipos");
    } catch (error) {
        console.error("Polen: no se pudieron leer los umbrales", error);
        return;
    }

    cuerpo.textContent = "";

    for (const tipo of tipos) {
        const fila = crear("tr");
        const nombre = crear("td");
        nombre.appendChild(crear("strong", null, tipo.nombre));
        nombre.appendChild(document.createTextNode(` · ${tipo.nombre_cientifico}`));
        fila.appendChild(nombre);

        const tramos = [
            ["BAJO", `hasta ${granos(tipo.umbrales.bajo, false)}`],
            ["MEDIO", `hasta ${granos(tipo.umbrales.medio, false)}`],
            ["ALTO", `hasta ${granos(tipo.umbrales.alto, false)}`],
            ["EXTREMO", `más de ${granos(tipo.umbrales.alto, false)}`]
        ];

        for (const [nivel, texto] of tramos) {
            const celda = crear("td", "pol-cifra");
            celda.appendChild(pastillaNivel(nivel));
            celda.appendChild(document.createTextNode(` ${texto}`));
            fila.appendChild(celda);
        }

        cuerpo.appendChild(fila);
    }
}


for (const hueco of document.querySelectorAll("[data-componente]")) {
    montar(hueco);
}

rellenarUmbrales();


/* Fin de fichero: js/polen.js */
