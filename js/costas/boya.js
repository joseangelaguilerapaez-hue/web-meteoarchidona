/*
 * MeteoArchidona · Componente «Boya o mareógrafo»
 *
 * Gráfica de las últimas horas de una estación de Puertos del Estado y su
 * último dato:
 *
 *   - boya: altura significativa de la ola (línea) y altura máxima
 *     (puntos), con la temperatura del agua aparte;
 *   - mareógrafo: nivel del mar sobre el cero del puerto.
 *
 *     <div data-componente="costas-boya"></div>
 *     <div data-componente="costas-boya" data-estacion="2342" data-horas="72" data-selector="no"></div>
 *
 * data-estacion: id de Portus (la boya de Málaga si no se dice).
 * data-horas: horas hacia atrás (48; de 1 a 168). data-selector="no"
 * quita el desplegable de estaciones.
 *
 * API: GET /costas/mapa (lista de estaciones) y
 * GET /costas/estaciones/{id}/serie?horas.
 */

import {
    pedir, crear, aviso, vaciar, prepararRaiz, titulo, conSelector, metros, segundos, grados, hora,
    pastillaEstado, colorOla, CITA, ESTACION_DEFECTO
} from "./comun.js?v=20261118-costas1";


const SVG = "http://www.w3.org/2000/svg";

const ANCHO = 640;
const ALTO = 200;
const MARGEN = { izquierda: 44, derecha: 14, arriba: 14, abajo: 28 };


function leerHoras(raiz) {
    const valor = parseInt(raiz.dataset.horas, 10);
    return Number.isFinite(valor) ? Math.min(Math.max(valor, 1), 168) : 48;
}


function nodoSvg(etiqueta, atributos = {}, texto) {
    const nodo = document.createElementNS(SVG, etiqueta);
    for (const [clave, valor] of Object.entries(atributos)) nodo.setAttribute(clave, valor);
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
}


function grafica(lecturas, campo, extra, horas) {
    const puntos = lecturas
        .filter(l => l[campo] !== null && l[campo] !== undefined)
        .map(l => ({ t: Date.parse(l.fecha), v: l[campo], e: extra ? l[extra] : null }));
    if (puntos.length < 2) return null;

    const fin = Date.now();
    const inicio = fin - horas * 3600 * 1000;
    const valores = puntos.map(p => p.v).concat(puntos.map(p => p.e).filter(v => v !== null && v !== undefined));
    let minimo = Math.min(...valores);
    let maximo = Math.max(...valores);
    if (campo === "altura_significativa") minimo = 0;
    if (maximo - minimo < 0.2) maximo = minimo + 0.2;

    const x = t => MARGEN.izquierda + (t - inicio) / (fin - inicio) * (ANCHO - MARGEN.izquierda - MARGEN.derecha);
    const y = v => MARGEN.arriba + (maximo - v) / (maximo - minimo) * (ALTO - MARGEN.arriba - MARGEN.abajo);

    const svg = nodoSvg("svg", { viewBox: `0 0 ${ANCHO} ${ALTO}`, class: "cos-boya-grafica", role: "img",
        "aria-label": `Últimas ${horas} horas` });

    const paso = horas <= 48 ? 6 : horas <= 96 ? 12 : 24;
    for (let t = Math.ceil(inicio / (paso * 3600000)) * paso * 3600000; t <= fin; t += paso * 3600000) {
        svg.appendChild(nodoSvg("line", { x1: x(t), x2: x(t), y1: MARGEN.arriba, y2: ALTO - MARGEN.abajo, class: "cos-rejilla" }));
        svg.appendChild(nodoSvg("text", { x: x(t), y: ALTO - 9, class: "cos-eje", "text-anchor": "middle" }, hora(new Date(t).toISOString())));
    }
    for (const v of [minimo, (minimo + maximo) / 2, maximo]) {
        svg.appendChild(nodoSvg("line", { x1: MARGEN.izquierda, x2: ANCHO - MARGEN.derecha, y1: y(v), y2: y(v), class: "cos-rejilla" }));
        svg.appendChild(nodoSvg("text", { x: MARGEN.izquierda - 6, y: y(v) + 4, class: "cos-eje", "text-anchor": "end" },
            v.toFixed(campo === "nivel_mar" ? 2 : 1).replace(".", ",")));
    }

    const visibles = puntos.filter(p => p.t >= inicio);
    const linea = visibles.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
    const base = ALTO - MARGEN.abajo;
    if (visibles.length) {
        svg.appendChild(nodoSvg("path", {
            d: `${linea} L${x(visibles[visibles.length - 1].t)},${base} L${x(visibles[0].t)},${base} Z`, class: "cos-boya-agua"
        }));
        svg.appendChild(nodoSvg("path", { d: linea, class: "cos-boya-linea" }));
    }
    for (const p of visibles) {
        if (p.e !== null && p.e !== undefined) {
            svg.appendChild(nodoSvg("circle", { cx: x(p.t), cy: y(p.e), r: 2.2, class: "cos-boya-maxima" }));
        }
    }
    return svg;
}


function pintar(contenedor, serie, horas) {
    vaciar(contenedor);
    const estacion = serie.estacion;
    const boya = estacion.tipo === "BOYA";

    const cabeza = crear("div", "cos-ficha-estacion-cabeza");
    cabeza.appendChild(crear("strong", null, estacion.nombre));
    cabeza.appendChild(pastillaEstado(estacion.estado));
    contenedor.appendChild(cabeza);

    const ultima = serie.lecturas[serie.lecturas.length - 1] || estacion.ultima;
    if (ultima) {
        const cifras = crear("div", "cos-boya-cifras");
        function cifra(texto, valor, color) {
            const caja = crear("span", "cos-cifra");
            const grande = crear("b", null, valor);
            if (color) grande.style.color = color;
            caja.appendChild(grande);
            caja.appendChild(crear("small", null, texto));
            cifras.appendChild(caja);
        }
        if (boya) {
            cifra(ultima.estado_mar || "ola", metros(ultima.altura_significativa, 2), colorOla(ultima.altura_significativa));
            cifra("ola máxima", metros(ultima.altura_maxima, 2));
            cifra(ultima.rumbo ? `periodo · del ${ultima.rumbo}` : "periodo", segundos(ultima.periodo_pico));
            if (ultima.temperatura_agua !== null && ultima.temperatura_agua !== undefined) cifra("agua", grados(ultima.temperatura_agua));
        } else {
            cifra("nivel del mar", metros(ultima.nivel_mar, 2));
        }
        contenedor.appendChild(cifras);
        contenedor.appendChild(crear("small", "cos-nota", `Último dato: ${hora(ultima.fecha)}`));
    }

    const svg = boya
        ? grafica(serie.lecturas, "altura_significativa", "altura_maxima", horas)
        : grafica(serie.lecturas, "nivel_mar", null, horas);
    if (svg) {
        contenedor.appendChild(svg);
        contenedor.appendChild(crear("p", "cos-nota", boya
            ? `Altura significativa de la ola (línea) y ola máxima (puntos), en metros, de las últimas ${horas} horas.`
            : `Nivel del mar en metros sobre el cero del puerto, de las últimas ${horas} horas.`));
    } else {
        contenedor.appendChild(crear("p", "cos-nota",
            "Aún hay pocos datos guardados para dibujar la gráfica: se van guardando desde que empezó a funcionar la sección."));
    }
    contenedor.appendChild(crear("p", "cos-pie", CITA));
}


export async function montarBoyaCostas(raiz) {
    prepararRaiz(raiz, "costas-boya");
    titulo(raiz, "Costas de Andalucía", "Lo que mide una boya");

    const horas = leerHoras(raiz);
    const contenedor = crear("div", "cos-boya");
    let actual = (raiz.dataset.estacion || ESTACION_DEFECTO).trim();

    async function cargar(id) {
        actual = String(id);
        raiz.dataset.estacion = actual;
        aviso(contenedor, "Leyendo la estación…");
        try {
            pintar(contenedor, await pedir(`/costas/estaciones/${encodeURIComponent(id)}/serie?horas=${horas}`), horas);
        } catch (error) {
            aviso(contenedor, error.estado === 404
                ? "No encontramos esa estación."
                : "No se han podido leer los datos de la estación. Se puede volver a intentar más tarde.", true);
        }
    }

    if (conSelector(raiz)) {
        try {
            const mapa = await pedir("/costas/mapa");
            const etiqueta = crear("label", "cos-desplegable");
            etiqueta.appendChild(crear("span", null, "Estación"));
            const lista = crear("select");
            for (const [tipo, nombre] of [["BOYA", "Boyas"], ["MAREOGRAFO", "Mareógrafos"]]) {
                const grupo = crear("optgroup");
                grupo.label = nombre;
                for (const estacion of mapa.estaciones.filter(e => e.tipo === tipo)) {
                    const opcion = crear("option", null, `${estacion.nombre}${estacion.estado === "ACTIVA" ? "" : " (sin datos recientes)"}`);
                    opcion.value = String(estacion.id);
                    opcion.selected = String(estacion.id) === actual;
                    grupo.appendChild(opcion);
                }
                if (grupo.children.length) lista.appendChild(grupo);
            }
            lista.addEventListener("change", () => cargar(lista.value));
            etiqueta.appendChild(lista);
            raiz.appendChild(etiqueta);
        } catch (error) {
            // Sin lista: se enseña la estación pedida igualmente.
        }
    }

    raiz.appendChild(contenedor);
    await cargar(actual);
}


/* Fin de fichero: js/costas/boya.js */
