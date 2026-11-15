/*
 * MeteoArchidona · Componente «Lo que dicen los modelos» (predicción estacional)
 *
 * El texto de la predicción estacional, redactado por IA (Claude) una vez
 * al mes a partir de las cifras del conjunto de Copernicus, hablando de
 * escenarios y no de porcentajes. Si aún no hay texto, no enseña nada.
 *
 *     <div data-componente="estacional-texto"></div>
 *     data-titulo="no"     sin título
 *     data-salida="2026-11" una salida concreta (por defecto, la última)
 *
 * API: GET /estacional/ultima
 */

import {
    pedirUltima, crear, aviso, prepararRaiz, titulo, pie, textoError
} from "./comun.js?v=20261115-estacional1";


export async function montarEstacionalTexto(raiz) {
    prepararRaiz(raiz, "est-texto");

    let datos;
    try {
        datos = await pedirUltima(raiz);
    } catch (error) {
        aviso(raiz, textoError(error), true);
        return;
    }

    if (!datos.texto) {
        raiz.hidden = true;
        return;
    }

    titulo(raiz, "PREDICCIÓN ESTACIONAL · COPERNICUS", `Los próximos meses en Archidona`);
    for (const parrafo of datos.texto.split(/\n\s*\n/)) {
        if (parrafo.trim()) {
            raiz.appendChild(crear("p", "est-parrafo", parrafo.trim()));
        }
    }
    raiz.appendChild(crear("p", "est-nota-ia",
        `Texto redactado automáticamente a partir de la salida de ${datos.nombre_salida} ` +
        `de las predicciones estacionales de Copernicus.`));
    pie(raiz, null);
    raiz.hidden = false;
}


/* Fin de fichero: js/estacional/texto.js */
