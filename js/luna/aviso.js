/*
 * MeteoArchidona · Componente «Aviso del cielo»
 *
 * Una franja con lo más destacado de las próximas horas en el cielo de
 * Archidona: el próximo paso visible de la Estación Espacial (con enlace a
 * su directo), de la estación china o de un tren de Starlink, si la noche
 * es buena para observar, y la luna llena o nueva, las superlunas y los
 * equinoccios o solsticios. Pensado para los dashboards.
 *
 *     <div data-componente="luna-aviso"></div>
 *
 * Opciones:
 *     data-horas          cuántas horas hacia delante (18 por defecto, hasta 48).
 *     data-solo-aviso="si"   no ocupa sitio si no hay nada que avisar.
 */

import {
    aviso, cadaRato, crear, pedir, prepararRaiz, textoError, vaciar
} from "./comun.js?v=20261111-luna2";


const CADA_MS = 15 * 60 * 1000;

const ICONOS = {
    PASO_ISS: "🛰️",
    PASO_TIANGONG: "🛰️",
    PASO_STARLINK: "✨",
    OBSERVACION: "🔭",
    EVENTO: "🌕"
};


function pintar(raiz, datos, soloAviso) {
    vaciar(raiz);
    raiz.hidden = false;

    if (!datos.avisos.length) {
        if (soloAviso) {
            raiz.hidden = true;
            return;
        }
        raiz.appendChild(crear("p", "lun-aviso", "Nada destacado en el cielo en las próximas horas."));
        return;
    }

    const lista = crear("ul", "lun-avisos");
    for (const a of datos.avisos) {
        const elemento = crear("li", `lun-aviso-cielo lun-aviso-${a.tipo.toLowerCase()}`);
        elemento.appendChild(crear("span", "lun-aviso-icono", ICONOS[a.tipo] || "★"));
        const texto = crear("div");
        texto.appendChild(crear("strong", null, a.titulo));
        texto.appendChild(crear("span", null, ` ${a.texto}`));
        if (a.enlace) {
            const enlace = crear("a", "lun-enlace", " Verla en directo");
            enlace.href = a.enlace;
            enlace.target = "_blank";
            enlace.rel = "noopener noreferrer";
            texto.appendChild(enlace);
        }
        elemento.appendChild(texto);
        lista.appendChild(elemento);
    }
    raiz.appendChild(lista);
}


export function montarAvisoCielo(raiz) {
    prepararRaiz(raiz, "luna-aviso");
    raiz.setAttribute("role", "note");
    const horas = Math.min(48, Math.max(1, parseInt(raiz.dataset.horas || "18", 10) || 18));
    const soloAviso = raiz.dataset.soloAviso === "si";
    if (soloAviso) raiz.hidden = true; else aviso(raiz, "Cargando…");

    cadaRato(raiz, async () => {
        try {
            pintar(raiz, await pedir(`/luna/aviso?horas=${horas}`, CADA_MS - 1000), soloAviso);
        } catch (error) {
            if (soloAviso) {
                raiz.hidden = true;
            } else {
                aviso(raiz, textoError(error), true);
            }
        }
    }, CADA_MS);
}


/* Fin de fichero: js/luna/aviso.js */
