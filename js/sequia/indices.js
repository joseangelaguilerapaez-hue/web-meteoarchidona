/*
 * MeteoArchidona · Agua y sequía · Índices de sequía SPI y SPEI
 *
 *     <div data-componente="sequia-indices" data-punto="ARCHIDONA"></div>
 *
 * SPI (solo lluvia) y SPEI (lluvia menos evaporación) de un pueblo a 1, 3,
 * 6 y 12 meses, calculados por MeteoArchidona con los datos de
 * Climatología (referencia 1991-2020). Una tarjeta por escala con el último
 * mes terminado y una gráfica de barras de la escala elegida.
 *
 * Opciones: data-punto, data-selector="no", data-meses (36 por defecto),
 * data-escala (6 por defecto) y data-indice (SPEI por defecto).
 *
 * API: GET /agua/sequia/indices (docs/agua-sequia.md).
 */

import {
    aviso, cabecera, claseIndice, crear, escala, indice, leerPunto, marcaClase, mes,
    NOMBRES_CLASE_INDICE, pedir, pie, prepararRaiz, svg, texto, textoError
} from "./comun.js?v=20261114-sequia2";


// Se ajustan al ancho del hueco al dibujar (en el móvil, letra legible).
let ANCHO = 640;
let ALTO = 240;

function medir(caja) {
    ANCHO = Math.max(320, Math.min(760, Math.round((caja && caja.clientWidth) || 640)));
    ALTO = Math.round(Math.max(210, Math.min(240, ANCHO * 0.5)));
}
const MARGEN = { arriba: 12, derecha: 12, abajo: 26, izquierda: 34 };
const NOMBRES_ESCALA = { 1: "1 mes", 3: "3 meses", 6: "6 meses", 12: "12 meses" };
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];


function dibujar(serie, campo) {
    const x = escala(0, Math.max(1, serie.length), MARGEN.izquierda, ANCHO - MARGEN.derecha);
    const y = escala(-3, 3, ALTO - MARGEN.abajo, MARGEN.arriba);
    const ancho = Math.max(2, (ANCHO - MARGEN.izquierda - MARGEN.derecha) / Math.max(1, serie.length) - 2);

    const lienzo = svg("svg", {
        viewBox: `0 0 ${ANCHO} ${ALTO}`,
        role: "img",
        "aria-label": `${campo.toUpperCase()} mes a mes`
    });
    for (const v of [-3, -2, -1, 0, 1, 2, 3]) {
        lienzo.appendChild(svg("line", { x1: MARGEN.izquierda, x2: ANCHO - MARGEN.derecha, y1: y(v), y2: y(v) }, v === 0 ? "seq-cero" : "rejilla"));
        texto(lienzo, MARGEN.izquierda - 6, y(v) + 4, v > 0 ? `+${v}` : `${v}`.replace("-", "−"), "eje", "end");
    }
    serie.forEach((punto, i) => {
        const [anio, numeroMes] = punto.mes.split("-").map(Number);
        if (numeroMes === 1 || (i === 0 && numeroMes <= 9)) {
            texto(lienzo, x(i) + ancho / 2, ALTO - 8, numeroMes === 1 ? String(anio) : `${MESES_CORTOS[numeroMes - 1]} ${anio}`, "eje", "start");
        }
        const valor = punto[campo];
        if (valor === null || valor === undefined) return;
        const arriba = Math.min(y(valor), y(0));
        const barra = svg("rect", {
            x: x(i) + 1, y: arriba, width: ancho, height: Math.max(1, Math.abs(y(valor) - y(0))), rx: 1.5
        }, `seq-barra clase-${claseIndice(valor)}${punto.provisional ? " provisional" : ""}`);
        const titulo = svg("title");
        titulo.textContent = `${mes(punto.mes)}: ${indice(valor)}${punto.provisional ? " (provisional)" : ""}`;
        barra.appendChild(titulo);
        lienzo.appendChild(barra);
    });
    const caja = crear("div", "emb-grafica");
    caja.appendChild(lienzo);
    return caja;
}


export async function montarIndicesSequia(raiz) {
    prepararRaiz(raiz, "seq-indices");
    await cabecera(raiz, "Sequía · SPI y SPEI", "Índices de sequía", montarIndicesSequia);

    const cuerpo = crear("div", "seq-cuerpo");
    raiz.appendChild(cuerpo);
    aviso(cuerpo, "Cargando los índices…");

    const meses = Number(raiz.dataset.meses) || 36;
    let datos;
    try {
        datos = await pedir(`/agua/sequia/indices?punto=${encodeURIComponent(leerPunto(raiz))}&meses=${meses}`);
    } catch (error) {
        aviso(cuerpo, textoError(error), true);
        return;
    }
    if (!datos.escalas.some(e => e.serie.length)) {
        aviso(cuerpo, "Los índices se calculan cuando Climatología tiene completo el periodo 1991-2020 de este pueblo.");
        return;
    }
    const nombres = { ...NOMBRES_CLASE_INDICE, ...(datos.nombres_clase || {}) };

    let escalaElegida = Number(raiz.dataset.escala) || 6;
    let campo = raiz.dataset.indice === "spi" ? "spi" : "spei";

    const pintar = () => {
        cuerpo.textContent = "";
        const tarjetas = crear("div", "seq-escalas");
        for (const e of datos.escalas) {
            const boton = crear("button", `seq-escala${e.escala === escalaElegida ? " activa" : ""}`);
            boton.type = "button";
            boton.setAttribute("aria-pressed", String(e.escala === escalaElegida));
            boton.appendChild(crear("span", "seq-capa-nombre", NOMBRES_ESCALA[e.escala]));
            const u = e.ultimo;
            const cifras = crear("span", "seq-cifras");
            cifras.appendChild(crear("span", null, `SPI ${indice(u && u.spi)}`));
            cifras.appendChild(crear("span", null, `SPEI ${indice(u && u.spei)}`));
            boton.appendChild(cifras);
            boton.appendChild(marcaClase(u && (campo === "spi" ? u.clase_spi : u.clase_spei), nombres));
            boton.addEventListener("click", () => {
                escalaElegida = e.escala;
                raiz.dataset.escala = String(e.escala);
                pintar();
            });
            tarjetas.appendChild(boton);
        }
        const elegida = datos.escalas.find(e => e.escala === escalaElegida) || datos.escalas[0];
        if (elegida.ultimo) {
            cuerpo.appendChild(crear("p", "seq-resumen",
                `${datos.punto.nombre}, ${mes(elegida.ultimo.mes)}${elegida.ultimo.provisional ? " (provisional)" : ""}: ` +
                `${campo.toUpperCase()} a ${NOMBRES_ESCALA[elegida.escala]} ${indice(elegida.ultimo[campo])}, ` +
                `${(nombres[campo === "spi" ? elegida.ultimo.clase_spi : elegida.ultimo.clase_spei] || "sin dato").toLowerCase()}.`));
        }
        cuerpo.appendChild(tarjetas);

        const interruptor = crear("div", "seq-interruptor");
        for (const [valor, etiqueta] of [["spei", "SPEI (lluvia − evaporación)"], ["spi", "SPI (solo lluvia)"]]) {
            const boton = crear("button", valor === campo ? "activa" : "", etiqueta);
            boton.type = "button";
            boton.setAttribute("aria-pressed", String(valor === campo));
            boton.addEventListener("click", () => {
                campo = valor;
                raiz.dataset.indice = valor;
                pintar();
            });
            interruptor.appendChild(boton);
        }
        cuerpo.appendChild(interruptor);
        medir(cuerpo);
        cuerpo.appendChild(dibujar(elegida.serie, campo));
        cuerpo.appendChild(crear("p", "emb-aviso", datos.metodo));
        pie(cuerpo, datos.cita);
    };
    pintar();
}


/* Fin de fichero: js/sequia/indices.js */
