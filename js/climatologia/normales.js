/*
 * MeteoArchidona · Componente «Normales climáticas»
 *
 * Tabla de las normales 1991-2020 de un pueblo: por mes y del año, la
 * media de las máximas, la media, la media de las mínimas, la lluvia y
 * los días de lluvia (1 mm o más) y de helada (mínima bajo 0 °C). La
 * lluvia lleva entre paréntesis el rango normal (de un año seco, el
 * percentil 10, a uno lluvioso, el 90).
 *
 *     <div data-componente="clima-normales"></div>
 *     <div data-componente="clima-normales" data-punto="VILLANUEVA_TRABUCO" data-selector="no"></div>
 *
 * API: GET /climatologia/normales?punto=
 */

import {
    pedir, crear, aviso, prepararRaiz, titulo, pie, selectorPunto, leerPunto,
    decimal, entero, textoError, MESES_LARGOS
} from "./comun.js?v=20261113-clima1";


const COLUMNAS = [
    ["Máx.", m => decimal(m.temperatura_maxima), "cli-calido"],
    ["Media", m => decimal(m.temperatura_media), null],
    ["Mín.", m => decimal(m.temperatura_minima), "cli-frio"],
    ["Lluvia", m => entero(m.lluvia), "cli-agua"],
    ["Días lluvia", m => decimal(m.dias_lluvia), null],
    ["Días helada", m => decimal(m.dias_helada), null]
];


function rango(mes) {
    if (mes.lluvia_p10 === null || mes.lluvia_p10 === undefined) return null;
    return `de ${entero(mes.lluvia_p10)} a ${entero(mes.lluvia_p90)} mm`;
}


function fila(nombre, mes, clase) {
    const tr = crear("tr", clase);
    tr.appendChild(crear("th", null, nombre));
    for (const [, valor, claseCelda] of COLUMNAS) {
        tr.appendChild(crear("td", claseCelda, valor(mes)));
    }
    const ayuda = rango(mes);
    if (ayuda) tr.title = `Lluvia normal ${ayuda}`;
    return tr;
}


export async function montarNormalesClima(raiz) {
    prepararRaiz(raiz, "clima-normales");
    titulo(raiz, "CLIMATOLOGÍA · NORMALES 1991-2020", "Normales climáticas");
    await selectorPunto(raiz, montarNormalesClima);

    let datos;
    try {
        datos = await pedir(`/climatologia/normales?punto=${encodeURIComponent(leerPunto(raiz))}`);
    } catch (error) {
        aviso(raiz, textoError(error), true);
        return;
    }

    if (!datos.meses || !datos.meses.length) {
        aviso(raiz, `Todavía no están las normales de ${datos.punto.nombre}: la serie histórica se está cargando.`);
        pie(raiz);
        return;
    }

    const contenedor = crear("div", "cli-tabla-desliza");
    const tabla = crear("table", "cli-tabla");
    const cabeza = crear("thead");
    const filaCabeza = crear("tr");
    filaCabeza.appendChild(crear("th", null, ""));
    for (const [nombre] of COLUMNAS) {
        filaCabeza.appendChild(crear("th", null, nombre));
    }
    cabeza.appendChild(filaCabeza);
    tabla.appendChild(cabeza);

    const cuerpo = crear("tbody");
    for (const mes of datos.meses) {
        cuerpo.appendChild(fila(MESES_LARGOS[mes.mes - 1], mes));
    }
    if (datos.anio) {
        cuerpo.appendChild(fila("Año", datos.anio, "cli-fila-anio"));
    }
    tabla.appendChild(cuerpo);
    contenedor.appendChild(tabla);
    raiz.appendChild(contenedor);

    raiz.appendChild(crear("p", "cli-nota",
        `${datos.punto.nombre}. Temperaturas en °C y lluvia en mm, medias de ${datos.periodo}. ` +
        "Pasa el dedo o el ratón por un mes para ver el rango normal de lluvia."));
    pie(raiz);
}


/* Fin de fichero: js/climatologia/normales.js */
