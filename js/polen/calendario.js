/*
 * MeteoArchidona · Componente «Calendario polínico»
 *
 * Qué polen suele haber en el aire cada semana del año, según lo medido
 * por la Universidad de Granada en otros años: una fila por tipo y una
 * casilla por semana, con el color del nivel de la media de esa semana.
 * La semana en curso va marcada. Solo salen los tipos que llegan a tener
 * algo de polen en algún momento del año.
 *
 *     <div data-componente="polen-calendario"></div>               (Granada)
 *     <div data-componente="polen-calendario" data-estacion="JAEN" data-titulo="no"></div>
 *
 * API: GET /polen/tipos, /polen/estaciones y una
 * /polen/recuentos/serie?estacion&tipo&anio por tipo (13, con caché).
 */

import {
    pedir, crear, aviso, prepararRaiz, titulo, pie,
    leerEstacion, granos, nivelDe, MESES, NOMBRES_NIVEL, FUENTE_UGR
} from "./comun.js?v=20261106-polen1";


function semanaActual() {
    const hoy = new Date();
    const inicio = Date.UTC(hoy.getUTCFullYear(), 0, 1);
    return Math.min(53, Math.floor((Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()) - inicio) / (7 * 86400000)) + 1);
}


export async function montarPolenCalendario(raiz) {
    prepararRaiz(raiz, "polen-calendario");
    aviso(raiz, "Preparando el calendario polínico…");

    const estacion = leerEstacion(raiz);
    let tipos;
    let estaciones;

    try {
        [tipos, estaciones] = await Promise.all([pedir("/polen/tipos"), pedir("/polen/estaciones")]);
    } catch (error) {
        aviso(raiz, "No se ha podido leer el calendario polínico. Se puede volver a intentar más tarde.", true);
        return;
    }

    const datosEstacion = estaciones.find(otra => otra.codigo === estacion);
    const anio = (datosEstacion && datosEstacion.ultimo_anio) || new Date().getFullYear();
    const nombreEstacion = datosEstacion ? datosEstacion.nombre : estacion;

    const series = await Promise.all(tipos.map(tipo =>
        pedir(`/polen/recuentos/serie?estacion=${encodeURIComponent(estacion)}&tipo=${tipo.codigo}&anio=${anio}`)
            .catch(() => null)));

    raiz.textContent = "";
    titulo(raiz, "Calendario polínico", nombreEstacion);

    const filas = series.filter(serie => serie && serie.semanas.some(semana => (semana.media_historica || 0) >= 1));

    if (!filas.length) {
        raiz.appendChild(crear("p", "pol-aviso", `Todavía no hay años anteriores medidos en ${nombreEstacion}.`));
        pie(raiz, FUENTE_UGR);
        return;
    }

    const actual = semanaActual();
    const rejilla = crear("div", "pol-calendario");

    rejilla.appendChild(crear("span"));
    const meses = crear("div", "pol-calendario-meses");
    for (const mes of MESES) meses.appendChild(crear("span", null, mes));
    rejilla.appendChild(meses);

    for (const serie of filas) {
        const porSemana = new Map(serie.semanas.map(semana => [semana.semana, semana]));
        rejilla.appendChild(crear("span", "pol-calendario-nombre", serie.tipo.nombre));

        const fila = crear("div", "pol-calendario-fila");
        fila.setAttribute("role", "img");
        fila.setAttribute("aria-label", `${serie.tipo.nombre}: cuándo suele haber polen`);

        for (let numero = 1; numero <= 52; numero++) {
            const semana = porSemana.get(numero);
            const valor = semana ? semana.media_historica : null;
            const nivel = nivelDe(valor, serie.tipo.umbrales);
            const casilla = crear("span", nivel && nivel !== "NULO" ? `nivel-${nivel}` : "vacia");
            if (numero === actual) casilla.classList.add("actual");
            casilla.title = `${serie.tipo.nombre}, semana ${numero}: lo normal ${granos(valor)}${nivel ? ` (${NOMBRES_NIVEL[nivel].toLowerCase()})` : ""}`;
            fila.appendChild(casilla);
        }

        rejilla.appendChild(fila);
    }

    raiz.appendChild(rejilla);

    const leyenda = crear("p", "pol-leyenda");
    for (const nivel of ["BAJO", "MEDIO", "ALTO", "EXTREMO"]) {
        leyenda.appendChild(crear("span", `nivel-${nivel}`, NOMBRES_NIVEL[nivel]));
    }
    raiz.appendChild(leyenda);

    pie(raiz, `Media de cada semana en los años anteriores · captador de ${nombreEstacion} · ${FUENTE_UGR}`);
}


/* Fin de fichero: js/polen/calendario.js */
