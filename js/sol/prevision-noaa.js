/*
 * MeteoArchidona · Componente «Previsión de la NOAA»
 *
 * Tabla de los próximos tres días del Centro de Predicción del Tiempo
 * Espacial: probabilidad de apagones de radio (R1–R2 y R3+), de tormenta
 * de radiación (S1+) y escala de tormenta geomagnética prevista (G).
 *
 *     <div data-componente="sol-prevision-noaa"></div>
 *
 *     import {montarPrevisionNoaa} from "/js/sol/prevision-noaa.js?v=20261104-componentes2";
 *     montarPrevisionNoaa(hueco);
 *
 * Se renueva solo cada 5 minutos. Puede haber varios en una página.
 */

import {
    FUENTES, DATOS_CADA_MS,
    crear, vaciar, aviso, prepararRaiz, ponerPie,
    pedir, numero, fechaUTC, formatoDiaCorto, nivelEscala, cadaRato
} from "./comun.js?v=20261104-componentes2";


export function montarPrevisionNoaa(raiz) {
    prepararRaiz(raiz, "sol-prevision");

    const caja = crear("div", "sol-prevision-caja");
    aviso(caja, "Cargando la previsión…");
    raiz.appendChild(caja);

    cadaRato(async () => {
        ponerPie(raiz, await pintar(caja));
    }, DATOS_CADA_MS);
}


async function pintar(caja) {
    let escalas;
    try {
        escalas = await pedir(FUENTES.escalas);
    } catch (error) {
        aviso(caja, "La previsión de la NOAA no está disponible ahora.");
        return false;
    }

    const dias = ["1", "2", "3"].map(k => escalas[k]).filter(Boolean);
    if (dias.length === 0) {
        aviso(caja, "La NOAA no ha publicado previsión.");
        return true;
    }

    vaciar(caja);
    const tabla = crear("table", "sol-tabla");
    const cabecera = crear("tr");
    ["Día", "Radio R1–R2", "Radio R3+", "Radiación S1+", "Tormenta G"].forEach(t => {
        const th = crear("th", null, t);
        th.scope = "col";
        cabecera.appendChild(th);
    });
    const thead = crear("thead");
    thead.appendChild(cabecera);
    tabla.appendChild(thead);

    const cuerpo = crear("tbody");
    for (const dia of dias) {
        const fila = crear("tr");
        const fecha = fechaUTC(`${dia.DateStamp}T12:00:00`);
        const th = crear("th", null, fecha ? formatoDiaCorto.format(fecha) : dia.DateStamp);
        th.scope = "row";
        fila.appendChild(th);

        const r = dia.R || {};
        const s = dia.S || {};
        const g = dia.G || {};
        fila.appendChild(celdaProbabilidad(r.MinorProb));
        fila.appendChild(celdaProbabilidad(r.MajorProb));
        fila.appendChild(celdaProbabilidad(s.Prob));

        const nivel = nivelEscala(g.Scale);
        const celdaG = crear("td");
        celdaG.appendChild(crear("span", `sol-marca nivel-${nivel}`, nivel > 0 ? `G${nivel}` : "No"));
        fila.appendChild(celdaG);

        cuerpo.appendChild(fila);
    }
    tabla.appendChild(cuerpo);

    const envoltorio = crear("div", "sol-tabla-envoltorio");
    envoltorio.appendChild(tabla);
    caja.appendChild(envoltorio);
    return true;
}


function celdaProbabilidad(valor) {
    const n = numero(valor);
    const celda = crear("td", "sol-probabilidad", n === null ? "—" : `${n} %`);
    if (n !== null && n >= 30) celda.classList.add("alta");
    else if (n !== null && n >= 10) celda.classList.add("media");
    return celda;
}


/* Fin de fichero: js/sol/prevision-noaa.js */
