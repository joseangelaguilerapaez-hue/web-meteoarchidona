/*
 * MeteoArchidona · Componente «Riesgo de incendio en la comarca»
 *
 * Tabla de los ocho pueblos de la comarca por días, cada casilla con el
 * color de su nivel. Manda AEMET (8 días); debajo de cada casilla, la
 * clase de EFFIS de los tres primeros días para comparar (José,
 * 15-11-2026).
 *
 *     <div data-componente="incendios-comarca"></div>                    (AEMET y EFFIS)
 *     <div data-componente="incendios-comarca" data-fuente="aemet"></div> (solo AEMET)
 *
 * API: GET /incendios/riesgo
 */

import {
    pedirRiesgo, crear, aviso, prepararRaiz, titulo, pie, casilla, leyenda, diaCorto, diaLargo, textoError
} from "./comun.js?v=20261115-incendios1";


function porFecha(lista) {
    return new Map(lista.map(n => [n.fecha, n]));
}


export async function montarComarcaIncendios(raiz) {
    prepararRaiz(raiz, "inc-comarca");
    titulo(raiz, "Peligro de incendio · próximos días", "La comarca, pueblo a pueblo");

    let datos;
    try {
        datos = await pedirRiesgo();
    } catch (error) {
        aviso(raiz, textoError(error), true);
        return;
    }

    const fuente = (raiz.dataset.fuente || "ambas").toLowerCase();
    const conEffis = fuente !== "aemet";
    const dias = datos.dias;

    if (!dias.length || !datos.pueblos.length) {
        aviso(raiz, "Todavía no hay datos de riesgo. Se cargan cada mañana.");
        return;
    }

    const marco = crear("div", "inc-tabla-marco");
    const tabla = crear("table", "inc-tabla");
    const cabeza = crear("thead");
    const filaCabeza = crear("tr");
    filaCabeza.appendChild(crear("th", "inc-tabla-pueblo", "Pueblo"));
    for (const dia of dias) {
        const celda = crear("th", dia === datos.hoy ? "hoy" : null, dia === datos.hoy ? "Hoy" : diaCorto(dia));
        celda.title = diaLargo(dia);
        filaCabeza.appendChild(celda);
    }
    cabeza.appendChild(filaCabeza);
    tabla.appendChild(cabeza);

    const cuerpo = crear("tbody");
    for (const pueblo of datos.pueblos) {
        const fila = crear("tr");
        fila.appendChild(crear("th", "inc-tabla-pueblo", pueblo.nombre));
        const aemet = porFecha(pueblo.aemet);
        const effis = porFecha(pueblo.effis);
        for (const dia of dias) {
            const celda = crear("td", dia === datos.hoy ? "hoy" : null);
            if (fuente !== "effis") {
                celda.appendChild(casilla(aemet.get(dia)));
            }
            if (conEffis && effis.has(dia)) {
                const otra = casilla(effis.get(dia), { clase: fuente === "effis" ? "inc-casilla" : "inc-casilla secundaria" });
                otra.title = `EFFIS: ${otra.title}`;
                celda.appendChild(otra);
            }
            fila.appendChild(celda);
        }
        cuerpo.appendChild(fila);
    }
    tabla.appendChild(cuerpo);
    marco.appendChild(tabla);
    raiz.appendChild(marco);

    if (conEffis && fuente !== "effis") {
        raiz.appendChild(crear("p", "inc-nota",
            "Casilla grande: AEMET, que es la que manda. Debajo, en pequeño, la clase de EFFIS (Copernicus) de los " +
            "tres primeros días. EFFIS junta «muy bajo» y «bajo» en una sola clase."));
    }
    raiz.appendChild(leyenda(datos.niveles, { hasta: conEffis ? 7 : 6 }));
    pie(raiz, { effis: conEffis });
}


/* Fin de fichero: js/incendios/comarca.js */
