/*
 * MeteoArchidona · Componente «Resumen sísmico del año»
 *
 * Las cifras del año cerca de Archidona: cuántos terremotos, cuántos se
 * sintieron, el mayor y el más cercano. Solo cuenta lo del IGN.
 *
 *     <div data-componente="sismologia-resumen"></div>
 *     <div data-componente="sismologia-resumen" data-radio="100" data-anio="2026"></div>
 *
 * data-radio: km (150). data-anio: por defecto, el actual.
 *
 * API: GET /sismologia/resumen?anio&radio_km (la misma petición que el
 * componente de estadísticas, que se comparte).
 */

import {
    pedir, crear, aviso, prepararRaiz, titulo, pie, leerRadio, leerNumero,
    magnitud, kilometros, fechaHora, lugar
} from "./comun.js?v=20261108-sismo2";


export function rutaResumen(raiz) {
    const radio = leerRadio(raiz, 150);
    const anio = Math.round(leerNumero(raiz, "anio", new Date().getFullYear(), 1370, 2100));
    return { radio, anio, ruta: `/sismologia/resumen?anio=${anio}&radio_km=${radio}` };
}


function cifra(etiqueta, valor, detalle, clase = "") {
    const caja = crear("div", `sis-cifra ${clase}`.trim());
    caja.appendChild(crear("small", null, etiqueta));
    caja.appendChild(crear("strong", null, valor));
    if (detalle) caja.appendChild(crear("span", null, detalle));
    return caja;
}


export async function montarResumenSismico(raiz) {
    prepararRaiz(raiz, "sismologia-resumen");
    const { radio, anio, ruta } = rutaResumen(raiz);

    aviso(raiz, "Contando los terremotos del año…");

    let datos;

    try {
        datos = await pedir(ruta);
    } catch (error) {
        aviso(raiz, "No se ha podido leer el resumen del año.", true);
        return;
    }

    raiz.textContent = "";
    titulo(raiz, `Año ${anio}`, `Terremotos a menos de ${radio} km`);

    const rejilla = crear("div", "sis-cifras");
    rejilla.appendChild(cifra("Terremotos", String(datos.total), "registrados por el IGN"));
    rejilla.appendChild(cifra("Sentidos", String(datos.sentidos), "con intensidad informada", "sentidos"));

    if (datos.mayor) {
        rejilla.appendChild(cifra("El mayor", `M ${magnitud(datos.mayor.magnitud)}`,
            `${lugar(datos.mayor)} · ${fechaHora(datos.mayor)}`, `tramo-${datos.mayor.tramo_magnitud}`));
    }

    if (datos.mas_cercano) {
        rejilla.appendChild(cifra("El más cercano", kilometros(datos.mas_cercano.distancia_km),
            `M ${magnitud(datos.mas_cercano.magnitud)} · ${lugar(datos.mas_cercano)} · ${fechaHora(datos.mas_cercano)}`));
    }

    raiz.appendChild(rejilla);
    pie(raiz, "Instituto Geográfico Nacional · sin los provisionales del EMSC");
}


/* Fin de fichero: js/sismologia/resumen.js */
