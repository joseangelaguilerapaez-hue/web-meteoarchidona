/*
 * MeteoArchidona · Agua y sequía · Ríos: caudal de una estación
 *
 *     <div data-componente="rios-caudal" data-estacion="2"></div>
 *
 * Caudal medido por el SAIH (provisional): las últimas 72 horas, lectura a
 * lectura, o los últimos 30 días, con la media de cada día y la franja
 * entre el mínimo y el máximo del día. Las estaciones del Guadiana no
 * tienen medición (solo el modelo GloFAS).
 *
 * Opciones: data-estacion (id; la primera con medición por defecto),
 * data-selector="no" para fijarla en un dashboard y data-dias (30).
 *
 * API: GET /agua/rios y GET /agua/rios/{id}/caudal.
 */

import {
    aviso, caudal, crear, diaCorto, escala, fecha, hora, leerRios, leyenda, pedir, pie, prepararRaiz,
    selectorEstacion, seguirEstacion, svg, texto, todasLasEstaciones, trazo
} from "./comun.js?v=20261114-rios1";


let ANCHO = 640;
let ALTO = 250;
const MARGEN = { arriba: 14, derecha: 14, abajo: 26, izquierda: 52 };

function medir(caja) {
    ANCHO = Math.max(320, Math.min(760, Math.round((caja && caja.clientWidth) || 640)));
    ALTO = Math.round(Math.max(200, Math.min(250, ANCHO * 0.48)));
}

function pasoRejilla(maximo) {
    const bruto = maximo / 4;
    const potencia = 10 ** Math.floor(Math.log10(bruto || 1));
    return [1, 2, 2.5, 5, 10].map(m => m * potencia).find(p => p >= bruto) || potencia * 10;
}

function ejes(lienzo, maximo, y) {
    const paso = pasoRejilla(maximo);
    for (let v = 0; v <= maximo + 1e-9; v += paso) {
        lienzo.appendChild(svg("line", { x1: MARGEN.izquierda, x2: ANCHO - MARGEN.derecha, y1: y(v), y2: y(v) }, "rejilla"));
        texto(lienzo, MARGEN.izquierda - 6, y(v) + 4, caudal(v).replace(" m³/s", ""), "eje", "end");
    }
    texto(lienzo, MARGEN.izquierda - 6, MARGEN.arriba - 2, "m³/s", "eje", "end");
}

function grafica(puntos, { banda = null, etiquetas, descripcion }) {
    const valores = [...puntos.map(p => p[1]), ...(banda || []).flatMap(b => [b[1], b[2]])].filter(v => v !== null && v !== undefined);
    const maximo = Math.max(0.5, ...valores) * 1.1;
    const x = escala(0, Math.max(1, puntos.length - 1), MARGEN.izquierda, ANCHO - MARGEN.derecha);
    const y = escala(0, maximo, ALTO - MARGEN.abajo, MARGEN.arriba);
    const lienzo = svg("svg", { viewBox: `0 0 ${ANCHO} ${ALTO}`, role: "img", "aria-label": descripcion });
    ejes(lienzo, maximo, y);
    const cada = Math.max(1, Math.round(puntos.length / (ANCHO < 480 ? 3 : 5)));
    puntos.forEach((_, i) => {
        if (i % cada === 0) texto(lienzo, x(i), ALTO - 8, etiquetas(i), "eje", "middle");
    });
    if (banda) {
        const validos = banda.filter(b => b[1] !== null && b[2] !== null);
        if (validos.length > 1) {
            const arriba = validos.map(b => `${x(b[0]).toFixed(1)},${y(b[2]).toFixed(1)}`);
            const abajo = validos.slice().reverse().map(b => `${x(b[0]).toFixed(1)},${y(b[1]).toFixed(1)}`);
            lienzo.appendChild(svg("polygon", { points: [...arriba, ...abajo].join(" ") }, "banda"));
        }
    }
    lienzo.appendChild(svg("path", { d: trazo(puntos, x, y) }, "linea-actual"));
    const ultimo = puntos.slice().reverse().find(p => p[1] !== null && p[1] !== undefined);
    if (ultimo) lienzo.appendChild(svg("circle", { cx: x(ultimo[0]), cy: y(ultimo[1]), r: 4.5 }, "punto-actual"));
    const caja = crear("div", "emb-grafica");
    caja.appendChild(lienzo);
    return caja;
}


export async function montarCaudalRios(raiz) {
    prepararRaiz(raiz, "rios-caudal");
    const cabeza = crear("div", "seq-cabeza");
    const textos = crear("div");
    textos.appendChild(crear("div", "emb-etiqueta", "Ríos · caudal medido"));
    if (raiz.dataset.titulo !== "no") textos.appendChild(crear("h3", "emb-titulo", "Caudal de la estación"));
    cabeza.appendChild(textos);
    raiz.appendChild(cabeza);
    const cuerpo = crear("div", "seq-cuerpo");
    raiz.appendChild(cuerpo);
    aviso(cuerpo, "Cargando el caudal…");

    let rios;
    try {
        rios = await leerRios();
    } catch {
        aviso(cuerpo, "No se han podido leer los ríos. Prueba dentro de un rato.", true);
        return;
    }
    const estaciones = todasLasEstaciones(rios);
    const medibles = estaciones.filter(e => e.sistema !== "GLOFAS");
    let elegida = Number(raiz.dataset.estacion) || (medibles[0] || estaciones[0] || {}).id;
    let modo = "HORAS";
    const dias = Number(raiz.dataset.dias) || 30;

    const pintar = async () => {
        const estacion = estaciones.find(e => e.id === elegida);
        cuerpo.textContent = "";
        if (raiz.dataset.selector !== "no") {
            cuerpo.appendChild(selectorEstacion(rios, elegida, id => {
                elegida = id;
                raiz.dataset.estacion = String(id);
                pintar();
            }));
        }
        if (!estacion) {
            aviso(cuerpo, "No hay esa estación.");
            return;
        }
        if (estacion.sistema === "GLOFAS") {
            aviso(cuerpo, `${estacion.nombre} no tiene caudal medido en abierto: mira la previsión del modelo más abajo.`);
            return;
        }
        const interruptor = crear("div", "seq-interruptor");
        for (const [codigo, nombre] of [["HORAS", "Últimas 72 horas"], ["DIAS", `Últimos ${dias} días`]]) {
            const boton = crear("button", codigo === modo ? "activa" : "", nombre);
            boton.type = "button";
            boton.setAttribute("aria-pressed", String(codigo === modo));
            boton.addEventListener("click", () => {
                modo = codigo;
                pintar();
            });
            interruptor.appendChild(boton);
        }
        cuerpo.appendChild(interruptor);
        const hueco = crear("div");
        cuerpo.appendChild(hueco);
        aviso(hueco, "Cargando…");
        let datos;
        try {
            datos = await pedir(`/agua/rios/${elegida}/caudal?dias=${dias}&horas=72`);
        } catch {
            aviso(hueco, "No se ha podido leer el caudal de esta estación.", true);
            return;
        }
        hueco.textContent = "";
        const ultima = datos.estacion.ultima;
        if (ultima) {
            hueco.appendChild(crear("p", "seq-resumen",
                `${estacion.rio} en ${estacion.nombre}: ${ultima.caudal === null ? "sin dato" : caudal(ultima.caudal)} (${hora(ultima.hora)})` +
                `${datos.estacion.caudal_dia !== null ? `; media de hoy, ${caudal(datos.estacion.caudal_dia)}` : ""}.`));
        }
        medir(cuerpo);
        if (modo === "HORAS") {
            const puntos = datos.lecturas.map((l, i) => [i, l.caudal]);
            if (puntos.filter(p => p[1] !== null).length < 2) {
                aviso(hueco, "Todavía hay pocas lecturas: se guarda una cada hora desde que empezamos a leer el SAIH.");
            } else {
                hueco.appendChild(grafica(puntos, {
                    etiquetas: i => hora(datos.lecturas[i].hora),
                    descripcion: `Caudal de las últimas 72 horas en ${estacion.nombre}`
                }));
                hueco.appendChild(leyenda([["", "Caudal medido (cada hora)"]]));
            }
        } else {
            const puntos = datos.dias.map((d, i) => [i, d.medio]);
            if (puntos.filter(p => p[1] !== null).length < 2) {
                aviso(hueco, "Todavía hay pocos días guardados: el histórico propio empieza el 14 de noviembre de 2026.");
            } else {
                hueco.appendChild(grafica(puntos, {
                    banda: datos.dias.map((d, i) => [i, d.minimo, d.maximo]),
                    etiquetas: i => diaCorto(datos.dias[i].fecha),
                    descripcion: `Caudal medio de cada día en ${estacion.nombre}`
                }));
                hueco.appendChild(leyenda([["", "Media del día"], ["banda", "Del mínimo al máximo del día"]]));
            }
        }
        hueco.appendChild(crear("p", "emb-aviso", datos.aviso));
        pie(hueco, `Fuente: ${datos.estacion.fuente}.`);
    };
    seguirEstacion(raiz, id => {
        elegida = id;
        pintar();
    });
    pintar();
}


/* Fin de fichero: js/rios/caudal.js */
