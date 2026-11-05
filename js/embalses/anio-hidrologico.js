/*
 * MeteoArchidona · Componente «Año hidrológico de los embalses»
 *
 * Gráfica del porcentaje de agua embalsada semana a semana del año
 * hidrológico (de octubre a septiembre): el año en curso, el anterior,
 * las medias de 5 y 10 años y, de fondo, la franja entre el mínimo y el
 * máximo de esos 10 años. Lo mismo que se veía en la antigua web, con
 * datos propios.
 *
 *     <div data-componente="embalses-anio-hidrologico"></div>                 (Andalucía)
 *     <div data-componente="embalses-anio-hidrologico" data-ambito="CUENCA" data-codigo="GUADALQUIVIR"></div>
 *     <div data-componente="embalses-anio-hidrologico" data-ambito="EMBALSE"
 *          data-codigo="GUADALQUIVIR-IZNAJAR" data-anio="2025"></div>
 *
 *     import {montarAnioHidrologico} from "/js/embalses/anio-hidrologico.js?v=…";
 *     montarAnioHidrologico(hueco);
 *
 * data-anio: año en que empieza el año hidrológico (2026 = 2026/2027); por
 * defecto, el actual. data-titulo="no" quita el título.
 *
 * Se dibuja en SVG al ancho real del hueco y se vuelve a dibujar si
 * cambia, para que los textos salgan a su tamaño en el móvil y en
 * cualquier casilla de un dashboard. Puede haber varias en una página.
 *
 * API: GET /embalses/anio-hidrologico?ambito&codigo&anio.
 */

import {
    leerAmbito, consulta, pedir,
    crear, vaciar, aviso, prepararRaiz, pieBoletin,
    porcentaje, MESES_HIDROLOGICOS
} from "./comun.js?v=20261105-embalses1";


const NS = "http://www.w3.org/2000/svg";

/* Día del año hidrológico en que empieza cada mes (octubre = 0). */
const INICIO_MES = [0, 31, 61, 92, 123, 154, 182, 213, 243, 274, 304, 335];

let contador = 0;


function svg(etiqueta, atributos = {}, clase) {
    const nodo = document.createElementNS(NS, etiqueta);
    for (const [clave, valor] of Object.entries(atributos)) nodo.setAttribute(clave, valor);
    if (clase) nodo.setAttribute("class", clase);
    return nodo;
}

/* Trazo de una serie con huecos: un tramo nuevo tras cada semana sin dato. */
function trazo(semanas, campo, x, y) {
    let d = "";
    let dentro = false;
    for (const semana of semanas) {
        const valor = semana[campo];
        if (valor === null || valor === undefined) {
            dentro = false;
            continue;
        }
        d += `${dentro ? "L" : "M"}${x(semana.semana).toFixed(1)},${y(valor).toFixed(1)}`;
        dentro = true;
    }
    return d;
}

export function dibujarAnio(datos, ancho, idRelleno) {
    const alto = Math.round(Math.max(220, Math.min(340, ancho * 0.48)));
    const margen = { arriba: 14, derecha: 14, abajo: 26, izquierda: 38 };
    const anchoUtil = ancho - margen.izquierda - margen.derecha;
    const altoUtil = alto - margen.arriba - margen.abajo;

    const x = semana => margen.izquierda + (semana / 52) * anchoUtil;
    const y = valor => margen.arriba + (1 - Math.max(0, Math.min(100, valor)) / 100) * altoUtil;

    const lienzo = svg("svg", {
        viewBox: `0 0 ${ancho} ${alto}`,
        role: "img",
        "aria-label": `Porcentaje de agua embalsada en el año hidrológico ${datos.etiqueta}`
    });

    const defs = svg("defs");
    const degradado = svg("linearGradient", { id: idRelleno, x1: 0, y1: 0, x2: 0, y2: 1 });
    degradado.appendChild(svg("stop", { offset: "0%", "stop-color": "#3fa4dc", "stop-opacity": "0.45" }));
    degradado.appendChild(svg("stop", { offset: "100%", "stop-color": "#3fa4dc", "stop-opacity": "0.04" }));
    defs.appendChild(degradado);
    lienzo.appendChild(defs);

    // Rejilla y eje de porcentajes.
    for (const valor of [0, 25, 50, 75, 100]) {
        lienzo.appendChild(svg("line", { x1: margen.izquierda, x2: ancho - margen.derecha, y1: y(valor), y2: y(valor) }, "rejilla"));
        const texto = svg("text", { x: margen.izquierda - 6, y: y(valor) + 4, "text-anchor": "end" }, "eje");
        texto.textContent = `${valor}%`;
        lienzo.appendChild(texto);
    }

    // Meses: en pantallas estrechas, uno de cada dos.
    const paso = anchoUtil < 360 ? 2 : 1;
    MESES_HIDROLOGICOS.forEach((mes, indice) => {
        if (indice % paso) return;
        const semana = INICIO_MES[indice] / 7;
        const texto = svg("text", { x: x(semana) + 2, y: alto - 8 }, "eje");
        texto.textContent = mes;
        lienzo.appendChild(texto);
    });

    const semanas = datos.semanas;

    // Franja entre el mínimo y el máximo de los 10 años anteriores.
    const conBanda = semanas.filter(s => s.minimo !== null && s.maximo !== null);
    if (conBanda.length > 1) {
        const arriba = conBanda.map(s => `${x(s.semana).toFixed(1)},${y(s.maximo).toFixed(1)}`);
        const abajo = conBanda.slice().reverse().map(s => `${x(s.semana).toFixed(1)},${y(s.minimo).toFixed(1)}`);
        lienzo.appendChild(svg("polygon", { points: [...arriba, ...abajo].join(" ") }, "banda"));
    }

    const lineas = [
        ["media_diez_anios", "linea-media10"],
        ["media_cinco_anios", "linea-media5"],
        ["anterior", "linea-anterior"]
    ];
    for (const [campo, clase] of lineas) {
        const d = trazo(semanas, campo, x, y);
        if (d) lienzo.appendChild(svg("path", { d }, clase));
    }

    // Año en curso: área y línea, y su último valor.
    const actuales = semanas.filter(s => s.actual !== null && s.actual !== undefined);
    if (actuales.length) {
        const primera = actuales[0];
        const ultima = actuales[actuales.length - 1];
        const linea = trazo(semanas, "actual", x, y);
        const area = `${linea}L${x(ultima.semana).toFixed(1)},${y(0).toFixed(1)}L${x(primera.semana).toFixed(1)},${y(0).toFixed(1)}Z`;
        lienzo.appendChild(svg("path", { d: area, fill: `url(#${idRelleno})` }));
        lienzo.appendChild(svg("path", { d: linea }, "linea-actual"));

        const cx = x(ultima.semana);
        const cy = y(ultima.actual);
        lienzo.appendChild(svg("circle", { cx, cy, r: 5 }, "punto-actual"));
        const derecha = cx > margen.izquierda + anchoUtil * 0.75;
        const cifra = svg("text", {
            x: derecha ? cx - 9 : cx + 9,
            y: cy > margen.arriba + 18 ? cy - 9 : cy + 20,
            "text-anchor": derecha ? "end" : "start"
        }, "cifra-actual");
        cifra.textContent = porcentaje(ultima.actual);
        lienzo.appendChild(cifra);
    }

    return lienzo;
}

export function leyenda(etiqueta) {
    const lista = crear("ul", "emb-leyenda");
    const elementos = [
        ["actual", etiqueta],
        ["anterior", "Año anterior"],
        ["media5", "Media 5 años"],
        ["media10", "Media 10 años"],
        ["banda", "Mín.–máx. 10 años"]
    ];
    for (const [clase, texto] of elementos) {
        const elemento = crear("li");
        elemento.appendChild(crear("i", clase));
        elemento.appendChild(document.createTextNode(texto));
        lista.appendChild(elemento);
    }
    return lista;
}

/* Monta la gráfica en una caja y la redibuja al cambiar de ancho. */
export function grafica(caja, datos) {
    const idRelleno = `embRelleno${++contador}`;
    let anchoDibujado = 0;

    function dibujar() {
        const ancho = Math.max(280, Math.round(caja.clientWidth || 640));
        if (ancho === anchoDibujado && caja.querySelector("svg")) return;
        anchoDibujado = ancho;
        vaciar(caja);
        caja.appendChild(dibujarAnio(datos, ancho, idRelleno));
    }

    dibujar();

    if ("ResizeObserver" in window) {
        let espera = null;
        new ResizeObserver(() => {
            clearTimeout(espera);
            espera = setTimeout(dibujar, 120);
        }).observe(caja);
    }
}


export async function montarAnioHidrologico(raiz) {
    prepararRaiz(raiz, "embalses-anio-hidrologico");
    aviso(raiz, "Cargando el año hidrológico…");

    const ambito = leerAmbito(raiz);
    const anio = parseInt(raiz.dataset.anio, 10) || "";

    let datos;
    try {
        datos = await pedir(`/embalses/anio-hidrologico?${consulta(ambito, { anio })}`);
    } catch (error) {
        aviso(raiz, error.estado === 404
            ? "No hay embalses en ese ámbito."
            : "No se ha podido leer el año hidrológico. Se puede volver a intentar más tarde.", true);
        return;
    }

    raiz.textContent = "";

    if (raiz.dataset.titulo !== "no") {
        const cabeza = crear("div");
        cabeza.appendChild(crear("div", "emb-etiqueta", `Año hidrológico ${datos.etiqueta}`));
        cabeza.appendChild(crear("h3", "emb-titulo", datos.ambito.nombre));
        raiz.appendChild(cabeza);
    }

    if (!datos.semanas.some(s => s.actual !== null || s.anterior !== null)) {
        aviso(raiz, "Todavía no hay datos de este año hidrológico.");
        return;
    }

    const caja = crear("div", "emb-grafica");
    raiz.appendChild(caja);
    raiz.appendChild(leyenda(datos.etiqueta));
    grafica(caja, datos);

    const ultima = datos.semanas.filter(s => s.fecha).pop();
    if (ultima) pieBoletin(raiz, ultima.fecha);
}


/* Fin de fichero: js/embalses/anio-hidrologico.js */
