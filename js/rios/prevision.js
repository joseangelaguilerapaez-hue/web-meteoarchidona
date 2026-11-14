/*
 * MeteoArchidona · Agua y sequía · Ríos: previsión del caudal (GloFAS)
 *
 *     <div data-componente="rios-prevision" data-estacion="2"></div>
 *
 * Penacho de GloFAS (Copernicus, por Open-Meteo) para los próximos 30
 * días, con los 7 anteriores simulados: franja de todos los miembros del
 * conjunto (del mínimo al máximo), franja central (del 25 al 75 %),
 * mediana y la pasada de control, sobre lo normal para cada fecha (del 25
 * al 75 % y mediana de 1991-2020). Es un modelo: en ríos pequeños y
 * regulados puede diferir mucho del caudal real.
 *
 * Opciones: data-estacion (id) y data-selector="no".
 *
 * API: GET /agua/rios y GET /agua/rios/{id}/prevision.
 */

import {
    aviso, caudal, crear, diaCorto, escala, fecha, leerRios, leyenda, marcaEstado, pedir, pie, prepararRaiz,
    selectorEstacion, seguirEstacion, svg, texto, todasLasEstaciones, trazo
} from "./comun.js?v=20261114-rios1";


let ANCHO = 640;
let ALTO = 270;
const MARGEN = { arriba: 14, derecha: 14, abajo: 26, izquierda: 52 };

function medir(caja) {
    ANCHO = Math.max(320, Math.min(760, Math.round((caja && caja.clientWidth) || 640)));
    ALTO = Math.round(Math.max(210, Math.min(270, ANCHO * 0.5)));
}

function pasoRejilla(maximo) {
    const bruto = maximo / 4;
    const potencia = 10 ** Math.floor(Math.log10(bruto || 1));
    return [1, 2, 2.5, 5, 10].map(m => m * potencia).find(p => p >= bruto) || potencia * 10;
}

function hoyMadrid() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
}

function franja(lienzo, filas, x, y, tope, abajo, arriba, clase) {
    const validos = filas.map((d, i) => [i, abajo(d), arriba(d)]).filter(([, a, b]) => a !== null && a !== undefined && b !== null && b !== undefined);
    if (validos.length < 2) return;
    const alto = validos.map(([i, , b]) => `${x(i).toFixed(1)},${y(Math.min(b, tope)).toFixed(1)}`);
    const bajo = validos.slice().reverse().map(([i, a]) => `${x(i).toFixed(1)},${y(Math.min(a, tope)).toFixed(1)}`);
    lienzo.appendChild(svg("polygon", { points: [...alto, ...bajo].join(" ") }, clase));
}

function dibujar(datos, nombre) {
    const filas = datos.dias;
    const referencia = filas.flatMap(d => [d.p75, d.control, d.mediana, d.normal && d.normal.p90]).filter(v => v !== null && v !== undefined);
    const tope = Math.max(0.5, ...referencia) * 1.25;
    const recortado = filas.some(d => d.maximo !== null && d.maximo > tope);
    const x = escala(0, Math.max(1, filas.length - 1), MARGEN.izquierda, ANCHO - MARGEN.derecha);
    const y = escala(0, tope, ALTO - MARGEN.abajo, MARGEN.arriba);
    const lienzo = svg("svg", { viewBox: `0 0 ${ANCHO} ${ALTO}`, role: "img", "aria-label": `Previsión del caudal en ${nombre}` });

    const paso = pasoRejilla(tope);
    for (let v = 0; v <= tope + 1e-9; v += paso) {
        lienzo.appendChild(svg("line", { x1: MARGEN.izquierda, x2: ANCHO - MARGEN.derecha, y1: y(v), y2: y(v) }, "rejilla"));
        texto(lienzo, MARGEN.izquierda - 6, y(v) + 4, caudal(v).replace(" m³/s", ""), "eje", "end");
    }
    texto(lienzo, MARGEN.izquierda - 6, MARGEN.arriba - 2, "m³/s", "eje", "end");
    const cada = Math.max(1, Math.round(filas.length / (ANCHO < 480 ? 3 : 6)));
    filas.forEach((d, i) => {
        if (i % cada === 0) texto(lienzo, x(i), ALTO - 8, diaCorto(d.fecha), "eje", "middle");
    });

    franja(lienzo, filas, x, y, tope, d => d.normal && d.normal.p25, d => d.normal && d.normal.p75, "rio-normal");
    lienzo.appendChild(svg("path", { d: trazo(filas.map((d, i) => [i, d.normal && d.normal.mediana]), x, y) }, "linea-media10"));
    franja(lienzo, filas, x, y, tope, d => d.minimo, d => d.maximo, "rio-penacho-ancho");
    franja(lienzo, filas, x, y, tope, d => d.p25, d => d.p75, "rio-penacho");
    lienzo.appendChild(svg("path", { d: trazo(filas.map((d, i) => [i, d.control === null ? null : Math.min(d.control, tope)]), x, y) }, "rio-control"));
    lienzo.appendChild(svg("path", { d: trazo(filas.map((d, i) => [i, d.mediana === null ? null : Math.min(d.mediana, tope)]), x, y) }, "linea-actual"));

    const hoy = filas.findIndex(d => d.fecha === hoyMadrid());
    if (hoy >= 0) {
        lienzo.appendChild(svg("line", { x1: x(hoy), x2: x(hoy), y1: MARGEN.arriba, y2: ALTO - MARGEN.abajo }, "rio-hoy"));
        texto(lienzo, x(hoy) + 4, MARGEN.arriba + 10, "hoy", "eje", "start");
    }
    const caja = crear("div", "emb-grafica");
    caja.appendChild(lienzo);
    return { caja, recortado };
}


export async function montarPrevisionRios(raiz) {
    prepararRaiz(raiz, "rios-prevision");
    const cabeza = crear("div", "seq-cabeza");
    const textos = crear("div");
    textos.appendChild(crear("div", "emb-etiqueta", "Ríos · previsión del modelo"));
    if (raiz.dataset.titulo !== "no") textos.appendChild(crear("h3", "emb-titulo", "¿Cómo irá el río este mes?"));
    cabeza.appendChild(textos);
    raiz.appendChild(cabeza);
    const cuerpo = crear("div", "seq-cuerpo");
    raiz.appendChild(cuerpo);
    aviso(cuerpo, "Cargando la previsión…");

    let rios;
    try {
        rios = await leerRios();
    } catch {
        aviso(cuerpo, "No se han podido leer los ríos. Prueba dentro de un rato.", true);
        return;
    }
    const estaciones = todasLasEstaciones(rios);
    let elegida = Number(raiz.dataset.estacion) || (estaciones[0] || {}).id;

    const pintar = async () => {
        cuerpo.textContent = "";
        if (raiz.dataset.selector !== "no") {
            cuerpo.appendChild(selectorEstacion(rios, elegida, id => {
                elegida = id;
                raiz.dataset.estacion = String(id);
                pintar();
            }));
        }
        const hueco = crear("div");
        cuerpo.appendChild(hueco);
        aviso(hueco, "Cargando…");
        let datos;
        try {
            datos = await pedir(`/agua/rios/${elegida}/prevision`);
        } catch {
            aviso(hueco, "No se ha podido leer la previsión de esta estación.", true);
            return;
        }
        hueco.textContent = "";
        const estacion = estaciones.find(e => e.id === elegida) || {};
        if (!datos.dias.length) {
            aviso(hueco, "Todavía no hay previsión de esta estación: GloFAS se carga cada día a media mañana.");
            return;
        }
        const resumen = crear("p", "seq-resumen", `${estacion.rio || ""} en ${datos.estacion.nombre}, hoy según el modelo: ${caudal(datos.estacion.modelo_hoy)} `);
        resumen.appendChild(marcaEstado(datos.estacion.estado, datos.estacion.nombre_estado));
        hueco.appendChild(resumen);
        medir(cuerpo);
        const { caja, recortado } = dibujar(datos, datos.estacion.nombre);
        hueco.appendChild(caja);
        hueco.appendChild(leyenda([
            ["", "Mediana del conjunto"], ["rio-control-l", "Pasada de control"], ["rio-penacho-l", "Del 25 al 75 % de los miembros"],
            ["rio-penacho-ancho-l", "Todos los miembros"], ["rio-normal-l", "Lo normal para la fecha (25-75 %)"], ["media10", "Mediana normal"]
        ]));
        if (recortado) hueco.appendChild(crear("p", "seq-nota", "Algún miembro del conjunto sube más de lo que cabe en la gráfica: la franja clara está recortada."));
        hueco.appendChild(crear("p", "emb-aviso", datos.aviso));
        pie(hueco, `Emisión del ${fecha(datos.emision, true)}. ${datos.atribucion}`);
    };
    seguirEstacion(raiz, id => {
        elegida = id;
        pintar();
    });
    pintar();
}


/* Fin de fichero: js/rios/prevision.js */
