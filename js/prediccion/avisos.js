/*
 * MeteoArchidona · Componente «Avisos de AEMET»
 *
 * Los avisos meteorológicos en vigor para el municipio, con su nivel
 * (amarillo, naranja o rojo). Si no hay ninguno, el componente no ocupa
 * sitio.
 *
 *     <div data-componente="prediccion-avisos"></div>
 *
 *     import {montarAvisos} from "/js/prediccion/avisos.js?v=20261104-componentes1";
 *     montarAvisos(hueco);
 *
 * Lee GET /prediccion/{municipio} (data-municipio; Archidona por defecto).
 */

import {
    PREDICCION_CADA_MS,
    crear, prepararRaiz, municipioDe, pedirPrediccion, cuando, cadaRato
} from "./comun.js?v=20261104-componentes1";


export function montarAvisos(raiz) {
    const municipio = municipioDe(raiz);

    prepararRaiz(raiz, "pred-avisos");
    raiz.setAttribute("aria-label", "Avisos meteorológicos");
    raiz.hidden = true;

    cadaRato(async () => {
        try {
            pintar(raiz, (await pedirPrediccion(municipio)).avisos);
        } catch (error) {
            // Sin predicción no se sabe si hay avisos: se deja lo último.
        }
    }, PREDICCION_CADA_MS);
}


function pintar(raiz, avisos) {
    raiz.textContent = "";
    raiz.hidden = !avisos || avisos.length === 0;

    (avisos || []).forEach(aviso => {
        const nivel = ["amarillo", "naranja", "rojo"].includes(aviso.nivel) ? aviso.nivel : "amarillo";
        const caja = crear("article", `pred-aviso pred-aviso-${nivel}`);
        caja.append(crear("strong", "pred-aviso-titulo",
            `Aviso ${nivel} por ${aviso.fenomeno || "fenómenos adversos"}`));

        const inicio = aviso.inicio ? new Date(aviso.inicio) : null;
        const fin = aviso.fin ? new Date(aviso.fin) : null;

        if (inicio && fin) {
            caja.append(crear("span", "pred-aviso-periodo",
                `${cuando(inicio)} – ${cuando(fin)}`.replace(/^./, c => c.toUpperCase())));
        }

        if (aviso.descripcion) {
            caja.append(crear("p", "pred-aviso-texto", aviso.descripcion));
        }

        caja.append(crear("span", "pred-aviso-fuente",
            `${aviso.fuente || "AEMET"}${aviso.zona ? " · " + aviso.zona : ""}`));
        raiz.append(caja);
    });
}


/* Fin de fichero: js/prediccion/avisos.js */
