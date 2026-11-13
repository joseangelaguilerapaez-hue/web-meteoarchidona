/*
 * MeteoArchidona · Página Calidad del aire
 *
 * Decisión de José del 10-11-2026: sección propia «Calidad del aire» con
 * la previsión del modelo CAMS para Archidona y la calima (polvo del
 * Sáhara), toda en componentes que se puedan poner en los dashboards,
 * con el mismo aspecto que Embalses y Polen (blanco) en la gama «Arena y
 * cielo»: ocres y arena para la calima, celestes para el aire limpio.
 *
 * Componentes (cada uno en su módulo, con su hoja
 * css/calidad-aire-componentes.css):
 *
 *     data-componente="calima-aviso"       → js/calidad-aire/aviso-calima.js
 *     data-componente="aire-indice"        → js/calidad-aire/indice.js
 *     data-componente="aire-dias"          → js/calidad-aire/dias.js
 *     data-componente="aire-horas"         → js/calidad-aire/horas.js
 *     data-componente="aire-particulas"    → js/calidad-aire/particulas.js
 *     data-componente="calima-episodios"   → js/calidad-aire/episodios.js
 *     data-componente="aire-divulgacion"   → js/calidad-aire/divulgacion.js
 *
 * Además rellena la tabla de techos del índice con /aire/contaminantes.
 * Datos y fuentes en docs/calidad-aire.md de api-meteoarchidona.
 */

import {montarAvisoCalima} from "./calidad-aire/aviso-calima.js?v=20261111-aire1";
import {montarAireIndice} from "./calidad-aire/indice.js?v=20261111-aire1";
import {montarAireDias} from "./calidad-aire/dias.js?v=20261111-aire1";
import {montarAireHoras} from "./calidad-aire/horas.js?v=20261111-aire1";
import {montarAireParticulas} from "./calidad-aire/particulas.js?v=20261111-aire1";
import {montarEpisodiosCalima} from "./calidad-aire/episodios.js?v=20261111-aire1";
import {montarAireDivulgacion} from "./calidad-aire/divulgacion.js?v=20261111-aire1";
import {pedir, crear, pastillaCategoria, CATEGORIAS} from "./calidad-aire/comun.js?v=20261111-aire1";


export const COMPONENTES_CALIDAD_AIRE = {
    "calima-aviso": montarAvisoCalima,
    "aire-indice": montarAireIndice,
    "aire-dias": montarAireDias,
    "aire-horas": montarAireHoras,
    "aire-particulas": montarAireParticulas,
    "calima-episodios": montarEpisodiosCalima,
    "aire-divulgacion": montarAireDivulgacion
};


function montar(hueco) {
    const montarComponente = COMPONENTES_CALIDAD_AIRE[hueco.dataset.componente];
    if (!montarComponente) return;

    try {
        const promesa = montarComponente(hueco);
        if (promesa && promesa.catch) {
            promesa.catch(error => console.error(`Calidad del aire: falló ${hueco.dataset.componente}`, error));
        }
    } catch (error) {
        console.error(`Calidad del aire: no se pudo montar ${hueco.dataset.componente}`, error);
    }
}


const LIMITES = ["buena", "razonablemente_buena", "regular", "desfavorable", "muy_desfavorable"];

const COMO_SE_MIDE = {
    PM10: "media de 24 h",
    PM25: "media de 24 h",
    O3: "valor de la hora",
    NO2: "valor de la hora"
};


async function rellenarLimites() {
    const tabla = document.querySelector(".aire-limites");
    if (!tabla) return;

    const cabeza = tabla.querySelector("thead tr");
    const cuerpo = tabla.querySelector("tbody");

    let contaminantes;
    try {
        contaminantes = await pedir("/aire/contaminantes");
    } catch (error) {
        console.error("Calidad del aire: no se pudieron leer los techos del índice", error);
        cuerpo.textContent = "";
        const fila = crear("tr");
        const celda = crear("td", null, "No se han podido leer los techos del índice.");
        celda.colSpan = 7;
        fila.appendChild(celda);
        cuerpo.appendChild(fila);
        return;
    }

    for (const categoria of CATEGORIAS) {
        const celda = crear("th");
        celda.appendChild(pastillaCategoria(categoria, true));
        cabeza.appendChild(celda);
    }

    cuerpo.textContent = "";

    for (const contaminante of contaminantes.filter(item => item.limites)) {
        const fila = crear("tr");
        const nombre = crear("td");
        nombre.appendChild(crear("strong", null, contaminante.simbolo));
        nombre.appendChild(crear("small", null, ` · ${COMO_SE_MIDE[contaminante.codigo] || ""}`));
        fila.appendChild(nombre);

        LIMITES.forEach(clave => fila.appendChild(crear("td", "air-cifra", `hasta ${contaminante.limites[clave]}`)));
        fila.appendChild(crear("td", "air-cifra", `más de ${contaminante.limites.muy_desfavorable}`));
        cuerpo.appendChild(fila);
    }
}


function iniciar() {
    document.querySelectorAll(".aire [data-componente]").forEach(montar);
    rellenarLimites();
}


if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
} else {
    iniciar();
}


/* Fin de fichero: js/calidad-aire.js */
