/*
 * MeteoArchidona · Componente «Lluvias de estrellas»
 *
 * Las grandes lluvias de estrellas del año vistas desde Archidona: la
 * noche del máximo, la mejor hora (radiante alto y cielo oscuro), cuántas
 * estrellas fugaces por hora se pueden esperar aquí y si la Luna molesta.
 *
 *     <div data-componente="luna-lluvias"></div>
 *
 * Opciones:
 *     data-anio          un año concreto (por defecto, el actual).
 *     data-proximas="si" solo las que aún no han terminado (si ya han
 *                        pasado todas, las del año siguiente).
 */

import {
    aviso, cadaRato, crear, entero, fechaLarga, gradosAngulo, hora, hoyMadrid, pedir, prepararRaiz, pie, textoError, vaciar
} from "./comun.js?v=20261111-luna4";


const CADA_MS = 6 * 60 * 60 * 1000;


function tarjeta(lluvia, siguiente) {
    const efecto = (lluvia.efecto_luna || "").toLowerCase();
    const caja = crear("article", `lun-lluvia${siguiente ? " lun-lluvia-siguiente" : ""}${lluvia.terminada ? " lun-tenue" : ""}`);

    const cabeza = crear("div", "lun-lluvia-cabeza");
    cabeza.appendChild(crear("strong", null, lluvia.nombre));
    if (siguiente) cabeza.appendChild(crear("span", "lun-lluvia-marca", "La próxima"));
    caja.appendChild(cabeza);

    const noche = lluvia.noche ? `Noche del ${fechaLarga(lluvia.noche)}` : `Máximo el ${fechaLarga(lluvia.maximo.slice(0, 10))}`;
    caja.appendChild(crear("p", "lun-lluvia-noche", noche));

    const cifras = crear("div", "lun-lluvia-cifras");
    const esperadas = crear("div", "lun-lluvia-cifra");
    esperadas.appendChild(crear("strong", "lun-cifra", lluvia.esperadas !== null && lluvia.esperadas !== undefined ? `~${entero(lluvia.esperadas)}` : "—"));
    esperadas.appendChild(crear("span", null, "por hora aquí"));
    const thz = crear("div", "lun-lluvia-cifra");
    thz.appendChild(crear("strong", "lun-cifra", entero(lluvia.thz)));
    thz.appendChild(crear("span", null, "THZ (ideal)"));
    cifras.append(esperadas, thz);
    caja.appendChild(cifras);

    if (lluvia.nombre_efecto_luna) {
        const luna = crear("p", `lun-lluvia-luna lun-luna-${efecto}`, lluvia.nombre_efecto_luna);
        if (lluvia.iluminacion_luna !== null && lluvia.iluminacion_luna !== undefined) {
            luna.textContent += ` (${entero(lluvia.iluminacion_luna)} % iluminada)`;
        }
        caja.appendChild(luna);
    }

    const lineas = [];
    if (lluvia.mejor_hora) {
        lineas.push(`Mejor hora: hacia las ${hora(lluvia.mejor_hora)}${lluvia.altura_radiante !== null && lluvia.altura_radiante !== undefined ? `, con el radiante a ${gradosAngulo(lluvia.altura_radiante)}` : ""}.`);
    }
    if (lluvia.inicio && lluvia.fin) {
        lineas.push(`Activa del ${fechaLarga(lluvia.inicio.slice(0, 10))} al ${fechaLarga(lluvia.fin.slice(0, 10))}.`);
    }
    if (lluvia.velocidad) lineas.push(`Entran a ${entero(lluvia.velocidad)} km/s.`);
    if (lluvia.progenitor) lineas.push(`Restos de: ${lluvia.progenitor}.`);
    if (lluvia.visible === false) lineas.push("Desde aquí el radiante apenas sube: se verán pocas.");
    for (const linea of lineas) caja.appendChild(crear("p", null, linea));
    return caja;
}


function pintar(raiz, datos, soloProximas) {
    vaciar(raiz);
    const ahora = Date.now();
    let lluvias = datos.lluvias.map(l => ({ ...l, terminada: Date.parse(l.fin || l.maximo) < ahora }));
    if (soloProximas) lluvias = lluvias.filter(l => !l.terminada);

    if (!lluvias.length) {
        raiz.appendChild(crear("p", "lun-aviso", "Todavía no están calculadas las lluvias de este año."));
    } else {
        const siguiente = lluvias.find(l => !l.terminada);
        raiz.appendChild(crear("p", "lun-subtitulo", `Año ${datos.anio}`));
        const rejilla = crear("div", "lun-lluvias");
        lluvias.forEach(l => rejilla.appendChild(tarjeta(l, l === siguiente)));
        raiz.appendChild(rejilla);
    }
    pie(raiz, "Fechas del máximo según la Organización Internacional de Meteoros (IMO), calculadas cada año. «Por hora aquí» tiene en cuenta la altura del radiante y la Luna, con cielo despejado y oscuro: en el pueblo, con farolas, se verán bastantes menos. Horas de Madrid.");
}


export function montarLluvias(raiz) {
    prepararRaiz(raiz, "luna-lluvias");
    const anioFijo = parseInt(raiz.dataset.anio || "", 10);
    const soloProximas = raiz.dataset.proximas === "si";
    aviso(raiz, "Cargando…");

    cadaRato(raiz, async () => {
        try {
            const anio = anioFijo || Number(hoyMadrid().slice(0, 4));
            let datos = await pedir(`/luna/lluvias?anio=${anio}`, CADA_MS - 1000);
            const quedan = datos.lluvias.some(l => Date.parse(l.fin || l.maximo) >= Date.now());
            if (soloProximas && !anioFijo && !quedan) {
                datos = await pedir(`/luna/lluvias?anio=${anio + 1}`, CADA_MS - 1000);
            }
            pintar(raiz, datos, soloProximas);
        } catch (error) {
            aviso(raiz, textoError(error), true);
        }
    }, CADA_MS);
}


/* Fin de fichero: js/luna/lluvias.js */
