/*
 * MeteoArchidona · Componente «Texto del presentador»
 *
 * El tiempo del día contado como en la tele. Lo redacta la IA en la API
 * solo a partir de la predicción de AEMET y de nuestra estación. Si no
 * hay texto del día, el componente no ocupa sitio.
 *
 *     <div data-componente="prediccion-presentador"></div>
 *
 *     import {montarPresentador} from "/js/prediccion/presentador.js?v=20261104-componentes1";
 *     montarPresentador(hueco);
 *
 * Lee GET /prediccion/{municipio}/texto (hoy solo existe el de Archidona).
 */

import {
    PREDICCION_CADA_MS,
    crear, prepararRaiz, municipioDe, pedir, horaDe, cadaRato
} from "./comun.js?v=20261104-componentes1";


export function montarPresentador(raiz) {
    const municipio = municipioDe(raiz);

    prepararRaiz(raiz, "pred-tarjeta", "pred-presentador");
    raiz.setAttribute("aria-label", "El tiempo hoy, contado por MeteoArchidona");
    raiz.hidden = true;

    cadaRato(async () => {
        try {
            pintar(raiz, await pedir(`/prediccion/${encodeURIComponent(municipio)}/texto`));
        } catch (error) {
            // Sin texto (o sin API) el bloque simplemente no aparece.
            pintar(raiz, null);
        }
    }, PREDICCION_CADA_MS);
}


function pintar(raiz, datos) {
    raiz.textContent = "";

    if (!datos || typeof datos.texto !== "string" || !datos.texto.trim()) {
        raiz.hidden = true;
        return;
    }

    raiz.append(crear("h2", "pred-hoy-titulo", "El tiempo hoy, contado por MeteoArchidona"));

    for (const parrafo of datos.texto.split(/\n\s*\n/)) {
        if (parrafo.trim()) {
            raiz.append(crear("p", "pred-presentador-texto", parrafo.trim()));
        }
    }

    const hora = horaDe(datos.generado);
    const estacion = datos.estacion ? ` y de nuestra estación ${datos.estacion}` : "";

    raiz.append(crear("p", "pred-presentador-nota",
        "Texto redactado automáticamente" + (hora ? ` a las ${hora}` : "") +
        ` a partir de la predicción de AEMET${estacion}.`));

    raiz.hidden = false;
}


/* Fin de fichero: js/prediccion/presentador.js */
