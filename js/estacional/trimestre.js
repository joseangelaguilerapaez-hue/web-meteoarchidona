/*
 * MeteoArchidona · Componente «Próximo trimestre» (predicción estacional)
 *
 * El trimestre de los tres meses siguientes a la salida de Copernicus
 * (con la de noviembre, de diciembre a febrero): escenario más probable de
 * temperatura y de lluvia, barra de colores y referencia de Archidona.
 * Lleva siempre la cita a Copernicus.
 *
 *     <div data-componente="estacional-trimestre"></div>
 *     data-titulo="no"     sin título
 *     data-salida="2026-11" una salida concreta (por defecto, la última)
 *
 * API: GET /estacional/ultima
 */

import {
    pedirUltima, crear, aviso, prepararRaiz, titulo, pie, pintarVariable, capital, textoError, AVISO_CORTO
} from "./comun.js?v=20261115-estacional1";


export async function montarEstacionalTrimestre(raiz) {
    prepararRaiz(raiz, "est-trimestre");
    aviso(raiz, "Cargando la predicción estacional…");

    let datos;
    try {
        datos = await pedirUltima(raiz);
    } catch (error) {
        prepararRaiz(raiz, "est-trimestre");
        aviso(raiz, textoError(error), true);
        return;
    }

    prepararRaiz(raiz, "est-trimestre");
    const periodo = datos.periodos.find(p => p.tipo === "TRIMESTRE");
    if (!periodo) {
        aviso(raiz, "Esta salida no trae el trimestre.", true);
        return;
    }

    titulo(raiz, "PREDICCIÓN ESTACIONAL · COPERNICUS", capital(periodo.nombre));
    raiz.appendChild(crear("p", "est-subtitulo", AVISO_CORTO));

    const cuerpo = crear("div", "est-dos");
    pintarVariable(cuerpo, periodo, "TEMPERATURA");
    pintarVariable(cuerpo, periodo, "LLUVIA");
    raiz.appendChild(cuerpo);

    pie(raiz, datos);
}


/* Fin de fichero: js/estacional/trimestre.js */
