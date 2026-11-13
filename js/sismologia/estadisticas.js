/*
 * MeteoArchidona · Componente «Estadísticas sísmicas»
 *
 * Dos gráficas del año cerca de Archidona: terremotos por mes (con los
 * sentidos destacados) y cuántos hay de cada tramo de magnitud, con los
 * colores de magnitud de la sección. Solo cuenta lo del IGN.
 *
 *     <div data-componente="sismologia-estadisticas"></div>
 *     <div data-componente="sismologia-estadisticas" data-radio="100" data-anio="2026"></div>
 *
 * data-radio: km (150). data-anio: por defecto, el actual.
 *
 * Más adelante irá también al generador de Informes y estadísticas como
 * fuente nueva (docs/sismologia.md); de momento usa su propio resumen.
 *
 * API: GET /sismologia/resumen?anio&radio_km
 */

import {
    pedir, crear, aviso, prepararRaiz, esVigente, titulo, pie, magnitud, TRAMOS, NOMBRES_TRAMO, MESES
} from "./comun.js?v=20261109-heli1";
import { rutaResumen } from "./resumen.js?v=20261109-heli1";


function graficaMeses(datos) {
    const caja = crear("figure", "sis-meses");
    const maximo = Math.max(1, ...datos.por_mes.map(mes => mes.total));

    const columnas = crear("div", "sis-meses-columnas");

    for (const mes of datos.por_mes) {
        const columna = crear("div", "sis-mes");
        columna.title = `${MESES[mes.mes - 1]}: ${mes.total} terremotos, ${mes.sentidos} sentidos`
            + (mes.magnitud_maxima !== null && mes.magnitud_maxima !== undefined ? `, el mayor de ${magnitud(mes.magnitud_maxima)}` : "");

        columna.appendChild(crear("span", "sis-mes-cifra", mes.total ? String(mes.total) : ""));

        const barra = crear("div", "sis-mes-barra");
        barra.style.height = `${(mes.total / maximo) * 100}%`;

        if (mes.sentidos) {
            const sentidos = crear("div", "sis-mes-sentidos");
            sentidos.style.height = `${(mes.sentidos / mes.total) * 100}%`;
            barra.appendChild(sentidos);
        }

        const hueco = crear("div", "sis-mes-hueco");
        hueco.appendChild(barra);
        columna.appendChild(hueco);
        columna.appendChild(crear("span", "sis-mes-nombre", MESES[mes.mes - 1]));
        columnas.appendChild(columna);
    }

    caja.appendChild(columnas);
    caja.appendChild(crear("figcaption", null, "Terremotos por mes; en magma, los que se sintieron."));
    return caja;
}


function graficaTramos(datos) {
    const caja = crear("figure", "sis-tramos");
    const totales = Object.fromEntries(datos.por_tramo.map(tramo => [tramo.tramo, tramo.total]));
    const maximo = Math.max(1, ...Object.values(totales));

    for (const tramo of TRAMOS) {
        const fila = crear("div", "sis-tramo");
        fila.appendChild(crear("span", "sis-tramo-nombre", NOMBRES_TRAMO[tramo]));

        const pista = crear("div", "sis-tramo-pista");
        const barra = crear("div", `sis-tramo-barra tramo-${tramo}`);
        barra.style.width = `${((totales[tramo] || 0) / maximo) * 100}%`;
        pista.appendChild(barra);
        fila.appendChild(pista);

        fila.appendChild(crear("span", "sis-tramo-cifra", String(totales[tramo] || 0)));
        caja.appendChild(fila);
    }

    caja.appendChild(crear("figcaption", null, "Terremotos por magnitud."));
    return caja;
}


export async function montarEstadisticasSismicas(raiz) {
    const turno = prepararRaiz(raiz, "sismologia-estadisticas");
    const { radio, anio, ruta } = rutaResumen(raiz);

    aviso(raiz, "Preparando las gráficas…");

    let datos;

    try {
        datos = await pedir(ruta);
    } catch (error) {
        if (!esVigente(raiz, turno)) return;
        aviso(raiz, "No se han podido leer las estadísticas.", true);
        return;
    }

    if (!esVigente(raiz, turno)) return;
    raiz.textContent = "";
    titulo(raiz, `Estadísticas ${anio}`, `Terremotos a menos de ${radio} km`);

    if (!datos.total) {
        raiz.appendChild(crear("p", "sis-aviso-texto", `Todavía no hay terremotos de ${anio} en la base.`));
    } else {
        const rejilla = crear("div", "sis-graficas");
        rejilla.appendChild(graficaMeses(datos));
        rejilla.appendChild(graficaTramos(datos));
        raiz.appendChild(rejilla);
    }

    pie(raiz, "Instituto Geográfico Nacional · gráficas de MeteoArchidona");
}


/* Fin de fichero: js/sismologia/estadisticas.js */
