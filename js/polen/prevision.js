/*
 * MeteoArchidona · Componente «Polen próximos días»
 *
 * Tabla de los próximos días (hoy y tres más) del modelo CAMS para
 * Archidona: una fila por tipo y una con el peor nivel de cada día. Cada
 * casilla lleva el color de su nivel y la media del día.
 *
 *     <div data-componente="polen-prevision"></div>
 *     <div data-componente="polen-prevision" data-localidad="29017" data-titulo="no"></div>
 *
 * API: GET /polen/prevision?localidad&dias=4.
 */

import {
    pedir, crear, aviso, prepararRaiz, titulo, pie,
    granos, diaCorto, horaActualizacion, NOMBRES_NIVEL, FUENTE_MODELO
} from "./comun.js?v=20261106-polen1";
import {rutaPrevision} from "./hoy.js?v=20261106-polen1";


function casilla(nivel, media) {
    const celda = crear("td", `nivel-${nivel || "NINGUNO"}`, NOMBRES_NIVEL[nivel] || "—");

    if (media !== undefined) {
        celda.appendChild(crear("small", "pol-cifra", granos(media, false)));
    }

    return celda;
}


export async function montarPolenPrevision(raiz) {
    prepararRaiz(raiz, "polen-prevision");
    aviso(raiz, "Leyendo la previsión del polen…");

    let datos;

    try {
        datos = await pedir(rutaPrevision(raiz));
    } catch (error) {
        aviso(raiz, error.estado === 404
            ? "No hay previsión de polen para esa localidad."
            : "No se ha podido leer la previsión del polen. Se puede volver a intentar más tarde.", true);
        return;
    }

    raiz.textContent = "";
    titulo(raiz, "Polen próximos días", datos.nombre_localidad);

    if (!datos.dias.length) {
        raiz.appendChild(crear("p", "pol-aviso", "Ahora no hay previsión del modelo: fuera de la temporada del olivo (enero a junio) y de las gramíneas (febrero a agosto) no calcula nada."));
        pie(raiz, FUENTE_MODELO);
        return;
    }

    const tabla = crear("table", "pol-prevision");
    const cabeza = crear("thead");
    const filaCabeza = crear("tr");
    filaCabeza.appendChild(crear("th", null, ""));

    for (const [indice, dia] of datos.dias.entries()) {
        const th = crear("th", null, indice === 0 ? "Hoy" : diaCorto(dia.fecha));
        if (indice === 0) th.appendChild(crear("small", null, diaCorto(dia.fecha)));
        filaCabeza.appendChild(th);
    }

    cabeza.appendChild(filaCabeza);
    tabla.appendChild(cabeza);

    const cuerpo = crear("tbody");
    const tipos = [];

    for (const dia of datos.dias) {
        for (const tipo of dia.tipos) {
            if (!tipos.some(guardado => guardado.codigo === tipo.codigo)) {
                tipos.push({ codigo: tipo.codigo, nombre: tipo.nombre });
            }
        }
    }

    for (const tipo of tipos) {
        const fila = crear("tr");
        fila.appendChild(crear("th", null, tipo.nombre));

        for (const dia of datos.dias) {
            const dato = dia.tipos.find(otro => otro.codigo === tipo.codigo);
            fila.appendChild(dato ? casilla(dato.nivel, dato.media) : casilla(null));
        }

        cuerpo.appendChild(fila);
    }

    const general = crear("tr", "pol-fila-general");
    general.appendChild(crear("th", null, "En general"));

    for (const dia of datos.dias) {
        general.appendChild(casilla(dia.nivel));
    }

    cuerpo.appendChild(general);
    tabla.appendChild(cuerpo);
    raiz.appendChild(tabla);

    const actualizada = horaActualizacion(datos.actualizada);
    pie(raiz, `Media de cada día en g/m³ · ${FUENTE_MODELO}${actualizada ? ` · ${actualizada}` : ""}`);
}


/* Fin de fichero: js/polen/prevision.js */
