/*
 * MeteoArchidona · Componente «Estado de la mar en Andalucía»
 *
 * Las cinco provincias costeras de un vistazo, de oeste a este: la ola
 * que miden ahora las boyas (o, si no hay ninguna midiendo, la mayor
 * prevista hoy en sus playas), el estado de la mar y la temperatura del
 * agua (de las boyas o, si no, del modelo, y lo dice).
 *
 *     <div data-componente="costas-resumen"></div>
 *     <div data-componente="costas-resumen" data-titulo="no"></div>
 *
 * API: GET /costas/resumen
 */

import {
    pedir, crear, aviso, prepararRaiz, titulo, pie, metros, grados, colorOla, CITA
} from "./comun.js?v=20261118-costas1";


export async function montarResumenCostas(raiz) {
    prepararRaiz(raiz, "costas-resumen");
    aviso(raiz, "Mirando el estado de la mar…");

    let datos;

    try {
        datos = await pedir("/costas/resumen");
    } catch (error) {
        aviso(raiz, "No se ha podido leer el estado de la mar. Se puede volver a intentar más tarde.", true);
        return;
    }

    raiz.textContent = "";
    titulo(raiz, "Costas de Andalucía", "Estado de la mar ahora");

    const lista = crear("ul", "cos-provincias");

    for (const provincia of datos.provincias) {
        const ola = provincia.ola_medida ?? provincia.ola_prevista_hoy;
        const tarjeta = crear("li", "cos-provincia");
        tarjeta.style.setProperty("--cos-ola", colorOla(ola));

        tarjeta.appendChild(crear("span", "cos-provincia-nombre", provincia.provincia));
        tarjeta.appendChild(crear("strong", "cos-provincia-estado", provincia.estado_mar || "Sin datos"));

        const cifras = crear("div", "cos-provincia-cifras");
        const olaTexto = crear("span", "cos-cifra");
        olaTexto.appendChild(crear("b", null, metros(ola)));
        olaTexto.appendChild(crear("small", null, provincia.ola_medida !== null && provincia.ola_medida !== undefined
            ? "ola medida"
            : "ola prevista hoy"));
        cifras.appendChild(olaTexto);

        const agua = crear("span", "cos-cifra");
        agua.appendChild(crear("b", null, grados(provincia.temperatura_agua)));
        agua.appendChild(crear("small", null, provincia.origen_temperatura === "BOYA" ? "agua (boya)" : "agua (modelo)"));
        cifras.appendChild(agua);
        tarjeta.appendChild(cifras);

        if (provincia.estacion_ola) {
            tarjeta.title = `Ola medida por la ${provincia.estacion_ola.replace(/^Boya/i, "boya")}`;
        }

        lista.appendChild(tarjeta);
    }

    raiz.appendChild(lista);

    pie(raiz, `Altura significativa de la ola · ${CITA}`);
}


/* Fin de fichero: js/costas/resumen.js */
