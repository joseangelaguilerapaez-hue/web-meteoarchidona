/*
 * MeteoArchidona · Componente «Mes a mes» (predicción estacional)
 *
 * Los tres meses siguientes a la salida de Copernicus, uno por tarjeta:
 * escenario de temperatura y de lluvia con su barra, cuántos modelos
 * coinciden y la referencia de Archidona. Lleva siempre la cita.
 *
 *     <div data-componente="estacional-meses"></div>
 *     data-titulo="no"     sin título
 *     data-salida="2026-11" una salida concreta (por defecto, la última)
 *
 * API: GET /estacional/ultima
 */

import {
    pedirUltima, crear, aviso, prepararRaiz, titulo, pie, pintarVariable, capital, textoError
} from "./comun.js?v=20261115-estacional1";


export async function montarEstacionalMeses(raiz) {
    prepararRaiz(raiz, "est-meses");
    aviso(raiz, "Cargando la predicción estacional…");

    let datos;
    try {
        datos = await pedirUltima(raiz);
    } catch (error) {
        prepararRaiz(raiz, "est-meses");
        aviso(raiz, textoError(error), true);
        return;
    }

    prepararRaiz(raiz, "est-meses");
    titulo(raiz, "PREDICCIÓN ESTACIONAL · COPERNICUS", "Mes a mes");

    const rejilla = crear("div", "est-rejilla-meses");
    for (const periodo of datos.periodos.filter(p => p.tipo === "MES")) {
        const tarjeta = crear("section", "est-mes");
        tarjeta.appendChild(crear("h4", "est-mes-nombre", capital(periodo.nombre)));
        pintarVariable(tarjeta, periodo, "TEMPERATURA", { compacto: true });
        pintarVariable(tarjeta, periodo, "LLUVIA", { compacto: true });
        rejilla.appendChild(tarjeta);
    }
    raiz.appendChild(rejilla);

    pie(raiz, datos);
}


/* Fin de fichero: js/estacional/meses.js */
