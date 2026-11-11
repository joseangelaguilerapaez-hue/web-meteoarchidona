/*
 * MeteoArchidona · Componente «¿Se puede observar esta noche?»
 *
 * Un índice de 0 a 100 para cada hora de noche cerrada (Sol por debajo de
 * −18°), que junta las nubes (las bajas y medias pesan más que los
 * cirros), la Luna (lo iluminada y lo alta que esté), la humedad, el
 * seeing y la transparencia (7Timer) y el viento. Para cada noche, el
 * mejor índice, su nivel y la mejor racha de horas seguidas, y una barra
 * con cada hora. La hora en curso usa la humedad medida en El Silo.
 *
 *     <div data-componente="luna-observacion"></div>
 *
 * Opciones:
 *     data-noches   cuántas noches (4 por defecto, de 1 a 4).
 */

import {
    aviso, cadaRato, crear, entero, hora, pedir, prepararRaiz, pie, textoError, vaciar
} from "./comun.js?v=20261111-luna5";


const CADA_MS = 30 * 60 * 1000;

const SEEING = ["", "excelente", "muy bueno", "bueno", "aceptable", "regular", "malo", "muy malo", "pésimo"];


function detalle(h) {
    const partes = [`${hora(h.momento)}`];
    if (h.indice !== null) partes.push(`índice ${h.indice} (${h.nombre_nivel})`);
    if (h.nubes_total !== null) partes.push(`nubes ${entero(h.nubes_total)} %`);
    if (h.humedad !== null) partes.push(`humedad ${entero(h.humedad)} %${h.medido ? " (medida en El Silo)" : ""}`);
    if (h.seeing) partes.push(`seeing ${SEEING[h.seeing]}`);
    if (h.transparencia) partes.push(`transparencia ${SEEING[h.transparencia]}`);
    if (h.altura_luna !== null && h.altura_luna > 0) partes.push(`Luna a ${entero(h.altura_luna)}°, ${entero(h.iluminacion_luna)} % iluminada`);
    return partes.join(" · ");
}


function noche(datos) {
    const caja = crear("article", `lun-noche nivel-${datos.nivel || "NINGUNO"}`);

    const cabeza = crear("div", "lun-noche-cabeza");
    cabeza.appendChild(crear("strong", null, datos.nombre));
    const sello = crear("span", "lun-nivel");
    sello.appendChild(crear("span", "lun-nivel-indice lun-cifra", datos.indice === null ? "—" : String(datos.indice)));
    sello.appendChild(crear("span", null, datos.nombre_nivel || "Sin datos"));
    cabeza.appendChild(sello);
    caja.appendChild(cabeza);

    if (datos.ventana) {
        caja.appendChild(crear(
            "p", "lun-nota",
            `Mejor rato: de ${hora(datos.ventana.inicio)} a ${hora(datos.ventana.fin)} (índice ${datos.indice_ventana}).` +
            (datos.iluminacion_luna !== null ? ` Luna al ${entero(datos.iluminacion_luna)} %.` : "")
        ));
    }

    const barra = crear("div", "lun-horas-noche");
    for (const h of datos.horas) {
        const celda = crear("span", `lun-hora-noche nivel-${h.nivel || "CREPUSCULO"}`);
        celda.title = detalle(h);
        celda.appendChild(crear("span", "lun-hora-numero", hora(h.momento).slice(0, 2)));
        barra.appendChild(celda);
    }
    caja.appendChild(barra);
    return caja;
}


function pintar(raiz, datos) {
    vaciar(raiz);
    if (!datos.noches.length) {
        aviso(raiz, "Todavía no hay previsión del cielo. Se calcula cada 3 horas.");
        return;
    }

    const lista = crear("div", "lun-noches");
    datos.noches.forEach(n => lista.appendChild(noche(n)));
    raiz.appendChild(lista);

    const leyenda = crear("ul", "lun-leyenda");
    for (const [clase, nombre] of [["EXCELENTE", "Excelente"], ["BUENA", "Buena"], ["REGULAR", "Regular"], ["MALA", "Mala"], ["IMPOSIBLE", "Imposible"], ["CREPUSCULO", "Aún hay luz"]]) {
        leyenda.appendChild(crear("li", `lun-leyenda-nivel nivel-${clase}`, nombre));
    }
    raiz.appendChild(leyenda);

    const actualizado = datos.actualizado ? ` Calculado a las ${hora(datos.actualizado)}.` : "";
    pie(raiz, `Nubes, humedad y viento de Open-Meteo; seeing y transparencia de 7Timer; Luna y Sol, cálculo de MeteoArchidona.${actualizado}`);
}


export function montarObservacion(raiz) {
    prepararRaiz(raiz, "luna-observacion");
    const noches = Math.min(4, Math.max(1, parseInt(raiz.dataset.noches || "4", 10) || 4));
    aviso(raiz, "Cargando…");

    cadaRato(raiz, async () => {
        try {
            pintar(raiz, await pedir(`/luna/observacion?noches=${noches}`, CADA_MS - 1000));
        } catch (error) {
            aviso(raiz, textoError(error), true);
        }
    }, CADA_MS);
}


/* Fin de fichero: js/luna/observacion.js */
