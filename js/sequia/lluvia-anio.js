/*
 * MeteoArchidona · Agua y sequía · Lluvia del año hidrológico
 *
 *     <div data-componente="sequia-lluvia-anio" data-punto="ARCHIDONA"></div>
 *
 * Lluvia acumulada desde el 1 de octubre frente a la normal 1991-2020 del
 * pueblo (repartida día a día). El pueblo sale de Climatología (ERA5-Land
 * corregido, con unos 5 días de retraso); en Archidona, también las
 * series de El Silo y Los Llanos, con los días que les faltan.
 *
 * Opciones: data-punto, data-selector="no".
 *
 * API: GET /agua/sequia/lluvia-anio (docs/agua-sequia.md).
 */

import {
    aviso, cabecera, crear, entero, escala, fecha, leerPunto, leyenda, milimetros, pedir, pie,
    prepararRaiz, svg, texto, textoError, trazo
} from "./comun.js?v=20261114-sequia2";


// Se ajustan al ancho del hueco al dibujar (en el móvil, letra legible).
let ANCHO = 640;
let ALTO = 260;

function medir(caja) {
    ANCHO = Math.max(320, Math.min(760, Math.round((caja && caja.clientWidth) || 640)));
    ALTO = Math.round(Math.max(210, Math.min(260, ANCHO * 0.5)));
}
const MARGEN = { arriba: 14, derecha: 14, abajo: 26, izquierda: 44 };
const CLASES_SERIE = ["linea-actual", "linea-anterior", "seq-linea-estacion"];


function diasDesde(inicio, texto) {
    return Math.round((Date.parse(`${texto}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) / 86400000);
}


function dibujar(datos, series) {
    const largo = Math.max(30, ...series.map(s => s.serie.length));
    const normal = series[0].serie.length ? series[0].serie : series.find(s => s.serie.length).serie;
    const maximo = Math.max(10, ...series.flatMap(s => s.serie.map(d => Math.max(d.acumulado, d.normal || 0))));
    const techo = Math.ceil(maximo * 1.1 / 20) * 20;
    const x = escala(0, largo, MARGEN.izquierda, ANCHO - MARGEN.derecha);
    const y = escala(0, techo, ALTO - MARGEN.abajo, MARGEN.arriba);

    const lienzo = svg("svg", {
        viewBox: `0 0 ${ANCHO} ${ALTO}`,
        role: "img",
        "aria-label": `Lluvia acumulada del año hidrológico ${datos.anio_hidrologico} frente a lo normal`
    });
    const paso = techo > 200 ? 50 : 20;
    for (let v = 0; v <= techo; v += paso) {
        lienzo.appendChild(svg("line", { x1: MARGEN.izquierda, x2: ANCHO - MARGEN.derecha, y1: y(v), y2: y(v) }, "rejilla"));
        texto(lienzo, MARGEN.izquierda - 6, y(v) + 4, entero(v), "eje", "end");
    }
    const cada = Math.max(1, Math.round(largo / (ANCHO < 480 ? 3 : 5)));
    for (let i = 0; i <= largo; i += cada) {
        const dia = new Date(Date.parse(`${datos.desde}T00:00:00Z`) + i * 86400000).toISOString().slice(0, 10);
        texto(lienzo, x(i), ALTO - 8, fecha(dia), "eje", "middle");
    }

    lienzo.appendChild(svg("path", { d: trazo(normal.map(d => [diasDesde(datos.desde, d.fecha), d.normal]), x, y) }, "linea-media10"));
    series.forEach((serie, indice) => {
        const puntos = serie.serie.map(d => [diasDesde(datos.desde, d.fecha), d.acumulado]);
        lienzo.appendChild(svg("path", { d: trazo(puntos, x, y) }, CLASES_SERIE[indice] || "linea-anterior"));
    });

    const caja = crear("div", "emb-grafica");
    caja.appendChild(lienzo);
    return caja;
}


function fila(serie) {
    const tr = crear("tr");
    tr.appendChild(crear("th", null, serie.nombre));
    tr.appendChild(crear("td", null, milimetros(serie.acumulado)));
    tr.appendChild(crear("td", null, milimetros(serie.normal_hasta_fecha)));
    const celda = crear("td");
    if (serie.porcentaje !== null && serie.porcentaje !== undefined) {
        const clase = serie.porcentaje < 60 ? "MUY_SECO" : serie.porcentaje < 80 ? "SECO"
            : serie.porcentaje <= 120 ? "NORMAL" : serie.porcentaje <= 140 ? "HUMEDO" : "MUY_HUMEDO";
        celda.appendChild(crear("span", `seq-clase clase-${clase}`, `${serie.porcentaje} %`));
    } else {
        celda.textContent = "—";
    }
    tr.appendChild(celda);
    const notas = [];
    if (serie.hasta) notas.push(`hasta el ${fecha(serie.hasta)}`);
    if (serie.dias_sin_dato) notas.push(`${serie.dias_sin_dato} días sin dato`);
    tr.appendChild(crear("td", "seq-nota", notas.join(" · ")));
    return tr;
}


export async function montarLluviaAnioSequia(raiz) {
    prepararRaiz(raiz, "seq-lluvia");
    await cabecera(raiz, "Sequía · lluvia del año", "Lluvia del año hidrológico frente a lo normal", montarLluviaAnioSequia);

    const cuerpo = crear("div", "seq-cuerpo");
    raiz.appendChild(cuerpo);
    aviso(cuerpo, "Cargando la lluvia del año…");

    let datos;
    try {
        datos = await pedir(`/agua/sequia/lluvia-anio?punto=${encodeURIComponent(leerPunto(raiz))}`);
    } catch (error) {
        aviso(cuerpo, textoError(error), true);
        return;
    }
    cuerpo.textContent = "";

    const series = datos.series.filter(s => s.serie && s.serie.length);
    if (!series.length) {
        aviso(cuerpo, "Todavía no hay lluvia de este año hidrológico para este pueblo.");
        return;
    }

    const principal = datos.series[0];
    if (principal.porcentaje !== null && principal.porcentaje !== undefined) {
        cuerpo.appendChild(crear("p", "seq-resumen",
            `Año hidrológico ${datos.anio_hidrologico}: en ${datos.punto.nombre} ha llovido el ${principal.porcentaje} % ` +
            `de lo normal hasta el ${fecha(principal.hasta)}.`));
    }

    medir(cuerpo);
    cuerpo.appendChild(dibujar(datos, series));
    const elementos = series.map((s, i) => [["", "anterior", "seq-estacion"][i] || "anterior", s.nombre]);
    elementos.push(["media10", "Normal 1991-2020"]);
    cuerpo.appendChild(leyenda(elementos));

    const tabla = crear("table", "seq-tabla");
    const cabeza = crear("tr");
    for (const titulo of ["", "Acumulado", "Normal a la fecha", "Frente a lo normal", ""]) {
        cabeza.appendChild(crear("th", null, titulo));
    }
    tabla.appendChild(crear("thead")).appendChild(cabeza);
    const cuerpoTabla = crear("tbody");
    for (const serie of datos.series) cuerpoTabla.appendChild(fila(serie));
    tabla.appendChild(cuerpoTabla);
    const envoltura = crear("div", "seq-tabla-caja");
    envoltura.appendChild(tabla);
    cuerpo.appendChild(envoltura);

    if (datos.normal_anual) {
        cuerpo.appendChild(crear("p", "emb-aviso", `Lo normal en todo un año hidrológico: ${milimetros(datos.normal_anual)}.`));
    }
    pie(cuerpo, datos.cita);
}


/* Fin de fichero: js/sequia/lluvia-anio.js */
