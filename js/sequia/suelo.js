/*
 * MeteoArchidona · Agua y sequía · Humedad del suelo
 *
 *     <div data-componente="sequia-suelo" data-punto="ARCHIDONA"></div>
 *
 * Humedad del suelo de un pueblo de la comarca en cuatro capas (0-7,
 * 7-28, 28-100 y 100-255 cm) frente a lo normal 1991-2020: tarjeta por
 * capa con la clase del último día y gráfica de la capa elegida (franja
 * entre los percentiles 10 y 90, mediana y lo medido). Los últimos días,
 * hasta que llega ERA5-Land, son de un modelo y van en trazo discontinuo.
 *
 * Opciones: data-punto, data-selector="no", data-dias (90 por defecto),
 * data-capa (2 por defecto: 7-28 cm, la de las raíces de los cultivos).
 *
 * API: GET /agua/sequia/suelo (docs/agua-sequia.md).
 */

import {
    aviso, cabecera, crear, escala, fecha, leerPunto, leyenda, marcaClase, NOMBRES_CLASE_SUELO,
    pedir, pie, prepararRaiz, svg, texto, textoError, trazo, volumen
} from "./comun.js?v=20261114-sequia2";


// Se ajustan al ancho del hueco al dibujar (en el móvil, letra legible).
let ANCHO = 640;
let ALTO = 260;

function medir(caja) {
    ANCHO = Math.max(320, Math.min(760, Math.round((caja && caja.clientWidth) || 640)));
    ALTO = Math.round(Math.max(210, Math.min(260, ANCHO * 0.5)));
}
const MARGEN = { arriba: 14, derecha: 14, abajo: 26, izquierda: 44 };


function dibujar(capa) {
    const serie = capa.serie;
    const valores = serie.flatMap(d => [d.valor, d.p10, d.p90]).filter(v => v !== null && v !== undefined);
    const minimo = Math.max(0, Math.floor((Math.min(...valores) - 0.02) * 50) / 50);
    const maximo = Math.ceil((Math.max(...valores) + 0.02) * 50) / 50;
    const x = escala(0, Math.max(1, serie.length - 1), MARGEN.izquierda, ANCHO - MARGEN.derecha);
    const y = escala(minimo, maximo, ALTO - MARGEN.abajo, MARGEN.arriba);

    const lienzo = svg("svg", {
        viewBox: `0 0 ${ANCHO} ${ALTO}`,
        role: "img",
        "aria-label": `Humedad del suelo de ${capa.profundidad} frente a lo normal`
    });

    const pasoRejilla = (maximo - minimo) > 0.2 ? 0.05 : 0.02;
    for (let v = Math.ceil(minimo / pasoRejilla) * pasoRejilla; v <= maximo + 1e-9; v += pasoRejilla) {
        lienzo.appendChild(svg("line", { x1: MARGEN.izquierda, x2: ANCHO - MARGEN.derecha, y1: y(v), y2: y(v) }, "rejilla"));
        texto(lienzo, MARGEN.izquierda - 6, y(v) + 4, `${Math.round(v * 100)} %`, "eje", "end");
    }

    // Fechas: unas cinco marcas.
    const cada = Math.max(1, Math.round(serie.length / (ANCHO < 480 ? 3 : 5)));
    serie.forEach((dia, i) => {
        if (i % cada) return;
        texto(lienzo, x(i), ALTO - 8, fecha(dia.fecha), "eje", "middle");
    });

    // Franja normal (percentiles 10 a 90) y mediana.
    const conNormal = serie.map((d, i) => [i, d]).filter(([, d]) => d.p10 !== null && d.p90 !== null);
    if (conNormal.length > 1) {
        const arriba = conNormal.map(([i, d]) => `${x(i).toFixed(1)},${y(d.p90).toFixed(1)}`);
        const abajo = conNormal.slice().reverse().map(([i, d]) => `${x(i).toFixed(1)},${y(d.p10).toFixed(1)}`);
        lienzo.appendChild(svg("polygon", { points: [...arriba, ...abajo].join(" ") }, "banda"));
        lienzo.appendChild(svg("path", { d: trazo(serie.map((d, i) => [i, d.mediana]), x, y) }, "linea-media10"));
    }

    // Lo medido (ERA5-Land) y lo del modelo, aparte.
    const era5 = serie.map((d, i) => [i, d.fuente === "ERA5_LAND" ? d.valor : null]);
    const primeraModelo = serie.findIndex(d => d.fuente === "MODELO");
    const modelo = serie.map((d, i) => [i, primeraModelo >= 0 && i >= primeraModelo - 1 ? d.valor : null]);
    lienzo.appendChild(svg("path", { d: trazo(era5, x, y) }, "linea-actual"));
    if (primeraModelo >= 0) {
        lienzo.appendChild(svg("path", { d: trazo(modelo, x, y) }, "seq-linea-modelo"));
    }

    const ultimo = serie.map((d, i) => [i, d]).reverse().find(([, d]) => d.valor !== null);
    if (ultimo) {
        lienzo.appendChild(svg("circle", { cx: x(ultimo[0]), cy: y(ultimo[1].valor), r: 4.5 }, "punto-actual"));
    }

    const caja = crear("div", "emb-grafica");
    caja.appendChild(lienzo);
    return caja;
}


function tarjeta(capa, elegida, alElegir) {
    const boton = crear("button", `seq-capa${elegida ? " activa" : ""}`);
    boton.type = "button";
    boton.setAttribute("aria-pressed", String(elegida));
    boton.appendChild(crear("span", "seq-capa-nombre", capa.profundidad));
    boton.appendChild(crear("strong", "seq-capa-valor", volumen(capa.ultimo && capa.ultimo.valor)));
    boton.appendChild(marcaClase(capa.clase, NOMBRES_CLASE_SUELO));
    if (capa.percentil !== null && capa.percentil !== undefined) {
        boton.appendChild(crear("span", "seq-capa-detalle", `percentil ${capa.percentil}`));
    }
    boton.addEventListener("click", alElegir);
    return boton;
}


export async function montarSueloSequia(raiz) {
    prepararRaiz(raiz, "seq-suelo");
    await cabecera(raiz, "Sequía · humedad del suelo", "¿Está el campo seco o empapado?", montarSueloSequia);

    const cuerpo = crear("div", "seq-cuerpo");
    raiz.appendChild(cuerpo);
    aviso(cuerpo, "Cargando la humedad del suelo…");

    const dias = Number(raiz.dataset.dias) || 90;
    let datos;
    try {
        datos = await pedir(`/agua/sequia/suelo?punto=${encodeURIComponent(leerPunto(raiz))}&dias=${dias}`);
    } catch (error) {
        aviso(cuerpo, textoError(error), true);
        return;
    }

    const conDatos = datos.capas.filter(c => c.serie.some(d => d.valor !== null));
    if (!conDatos.length) {
        aviso(cuerpo, "Todavía no hay datos de humedad del suelo de este pueblo: la carga está en marcha.");
        return;
    }

    let elegida = Number(raiz.dataset.capa) || 2;
    if (!conDatos.some(c => c.capa === elegida)) elegida = conDatos[0].capa;

    const pintar = () => {
        cuerpo.textContent = "";
        const capa = datos.capas.find(c => c.capa === elegida);
        const ultimo = capa.ultimo;
        if (ultimo) {
            cuerpo.appendChild(crear("p", "seq-resumen",
                `${datos.punto.nombre}, ${fecha(ultimo.fecha, true)}: suelo de ${capa.profundidad} ` +
                `${capa.nombre_clase ? capa.nombre_clase.toLowerCase() : "sin comparar todavía"}` +
                `${ultimo.fuente === "MODELO" ? " (según el modelo)" : ""}.`));
        }

        const tarjetas = crear("div", "seq-capas");
        for (const c of datos.capas) {
            tarjetas.appendChild(tarjeta(c, c.capa === elegida, () => {
                elegida = c.capa;
                raiz.dataset.capa = String(c.capa);
                pintar();
            }));
        }
        cuerpo.appendChild(tarjetas);
        medir(cuerpo);
        cuerpo.appendChild(dibujar(capa));
        const elementos = [["", "Medido (ERA5-Land)"], ["media10", "Normal (mediana 1991-2020)"], ["banda", "Lo habitual (del 10 al 90 %)"]];
        if (capa.serie.some(d => d.fuente === "MODELO")) elementos.splice(1, 0, ["seq-modelo", "Modelo (últimos días)"]);
        cuerpo.appendChild(leyenda(elementos));
        if (datos.sin_normales) {
            cuerpo.appendChild(crear("p", "emb-aviso", "Las normales se calculan cuando termina la carga desde 1991; hasta entonces no se compara."));
        }
        pie(cuerpo, `${datos.cita} ${datos.aviso_modelo}`);
    };
    pintar();
}


/* Fin de fichero: js/sequia/suelo.js */
