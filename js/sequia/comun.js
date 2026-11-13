/*
 * MeteoArchidona · Agua y sequía · Sequía · piezas comunes
 *
 * Lo que comparten los componentes de la pestaña Sequía (js/sequia/*.js):
 * el pueblo de cada hueco y su selector, cifras y fechas, las clases de
 * sequía con sus colores y la gráfica SVG. Reutiliza la petición con caché,
 * el DOM y la hoja de estilos de los embalses (js/embalses/comun.js): la
 * pestaña Sequía va con la misma paleta de agua (José, 5 y 14-11-2026).
 *
 * Pueblo: data-punto="ARCHIDONA" (por defecto), uno de los de
 * Climatología (/climatologia/puntos). Con data-selector="no", sin
 * selector (para fijarlo en un dashboard).
 *
 * Datos: /agua/sequia/... de la API (docs/agua-sequia.md). La humedad del
 * suelo y los índices se calculan cada noche; la caché es de 10 minutos.
 */

import { pedir, crear, vaciar, aviso, prepararRaiz as prepararRaizEmbalses } from "../embalses/comun.js?v=20261105-embalses1";

export { pedir, crear, vaciar, aviso };

const HOJA_SEQUIA = "/css/sequia-componentes.css?v=20261114-sequia1";

/* Raíz de un componente de Sequía: la de los embalses (paleta de agua)
 * más la hoja propia de Sequía. */
export function prepararRaiz(raiz, clase) {
    prepararRaizEmbalses(raiz, clase);
    if (!document.querySelector('link[href*="css/sequia-componentes.css"]')) {
        const enlace = document.createElement("link");
        enlace.rel = "stylesheet";
        enlace.href = HOJA_SEQUIA;
        document.head.appendChild(enlace);
    }
}

export const PUNTO_POR_DEFECTO = "ARCHIDONA";

export const PAGINA_SEQUIA = "/embalses#sequia";


/* ------------------------------------------------------------
   Pueblo
   ------------------------------------------------------------ */

export function leerPunto(raiz) {
    return (raiz.dataset.punto || PUNTO_POR_DEFECTO).trim().toUpperCase();
}

/* Cabecera del componente: etiqueta, título y, si toca, el selector de
 * pueblo. Al cambiar de pueblo se guarda en data-punto y se vuelve a montar. */
export async function cabecera(raiz, etiqueta, titulo, montar) {
    const cabeza = crear("div", "seq-cabeza");
    const textos = crear("div");
    textos.appendChild(crear("div", "emb-etiqueta", etiqueta));
    if (raiz.dataset.titulo !== "no") {
        textos.appendChild(crear("h3", "emb-titulo", titulo));
    }
    cabeza.appendChild(textos);
    raiz.appendChild(cabeza);

    if (raiz.dataset.selector === "no") return;
    let puntos = [];
    try {
        puntos = await pedir("/climatologia/puntos");
    } catch {
        return;
    }
    if (!puntos.length) return;
    const etiquetaSelector = crear("label", "seq-selector", "Pueblo ");
    const selector = crear("select");
    for (const punto of puntos) {
        selector.appendChild(new Option(punto.nombre, punto.codigo));
    }
    selector.value = leerPunto(raiz);
    selector.addEventListener("change", () => {
        raiz.dataset.punto = selector.value;
        montar(raiz);
    });
    etiquetaSelector.appendChild(selector);
    cabeza.appendChild(etiquetaSelector);
}


/* ------------------------------------------------------------
   Cifras y fechas
   ------------------------------------------------------------ */

const formatoEntero = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });
const formatoDecimal = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formatoDos = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatoFecha = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", day: "numeric", month: "long" });
const formatoFechaAnio = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
const formatoMes = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", month: "long", year: "numeric" });

function utc(texto) {
    const [anio, mes, dia] = texto.split("-").map(Number);
    return new Date(Date.UTC(anio, mes - 1, dia || 1));
}

export function fecha(texto, conAnio = false) {
    if (!texto) return "—";
    return (conAnio ? formatoFechaAnio : formatoFecha).format(utc(texto));
}

export function mes(texto) {
    return texto ? formatoMes.format(utc(texto)) : "—";
}

export function milimetros(valor) {
    return valor === null || valor === undefined ? "—" : `${formatoDecimal.format(valor)} l/m²`;
}

export function entero(valor) {
    return valor === null || valor === undefined ? "—" : formatoEntero.format(valor);
}

/* Humedad del suelo: m³/m³ → «% en volumen». */
export function volumen(valor) {
    return valor === null || valor === undefined ? "—" : `${formatoDecimal.format(valor * 100)} %`;
}

/* Índice con signo: «−1,23», «+0,40». */
export function indice(valor) {
    if (valor === null || valor === undefined) return "—";
    const signo = valor > 0 ? "+" : valor < 0 ? "−" : "";
    return `${signo}${formatoDos.format(Math.abs(valor))}`;
}


/* ------------------------------------------------------------
   Clases de sequía
   ------------------------------------------------------------ */

/* Humedad del suelo y año: las cinco de Climatología. */
export const NOMBRES_CLASE_SUELO = {
    MUY_SECO: "Muy seco",
    SECO: "Seco",
    NORMAL: "Normal",
    HUMEDO: "Húmedo",
    MUY_HUMEDO: "Muy húmedo"
};

/* SPI y SPEI: las siete habituales (la API también las da). */
export const NOMBRES_CLASE_INDICE = {
    EXTREMADAMENTE_SECO: "Extremadamente seco",
    MUY_SECO: "Muy seco",
    MODERADAMENTE_SECO: "Moderadamente seco",
    NORMAL: "Normal",
    MODERADAMENTE_HUMEDO: "Moderadamente húmedo",
    MUY_HUMEDO: "Muy húmedo",
    EXTREMADAMENTE_HUMEDO: "Extremadamente húmedo"
};

export function marcaClase(codigo, nombres) {
    return crear("span", `seq-clase clase-${codigo || "NINGUNA"}`, (codigo && nombres[codigo]) || "Sin datos");
}

/* Clase de un valor de SPI o SPEI (para pintar las barras). */
export function claseIndice(valor) {
    if (valor === null || valor === undefined) return "NINGUNA";
    if (valor <= -2) return "EXTREMADAMENTE_SECO";
    if (valor <= -1.5) return "MUY_SECO";
    if (valor <= -1) return "MODERADAMENTE_SECO";
    if (valor < 1) return "NORMAL";
    if (valor < 1.5) return "MODERADAMENTE_HUMEDO";
    if (valor < 2) return "MUY_HUMEDO";
    return "EXTREMADAMENTE_HUMEDO";
}


/* ------------------------------------------------------------
   Gráficas
   ------------------------------------------------------------ */

export const NS = "http://www.w3.org/2000/svg";

export function svg(etiqueta, atributos = {}, clase) {
    const nodo = document.createElementNS(NS, etiqueta);
    for (const [nombre, valor] of Object.entries(atributos)) {
        nodo.setAttribute(nombre, valor);
    }
    if (clase) nodo.setAttribute("class", clase);
    return nodo;
}

export function texto(lienzo, x, y, contenido, clase = "eje", ancla = "start") {
    const nodo = svg("text", { x, y, "text-anchor": ancla }, clase);
    nodo.textContent = contenido;
    lienzo.appendChild(nodo);
    return nodo;
}

export function escala(minimo, maximo, desde, hasta) {
    return valor => desde + (valor - minimo) * (hasta - desde) / ((maximo - minimo) || 1);
}

/* Trazo de una serie con huecos: corta donde falta el valor. */
export function trazo(puntos, x, y) {
    let d = "";
    let dentro = false;
    for (const [px, py] of puntos) {
        if (py === null || py === undefined) {
            dentro = false;
            continue;
        }
        d += `${dentro ? "L" : "M"}${x(px).toFixed(1)},${y(py).toFixed(1)}`;
        dentro = true;
    }
    return d;
}

export function leyenda(elementos) {
    const lista = crear("ul", "emb-leyenda");
    for (const [clase, textoLeyenda] of elementos) {
        const elemento = crear("li");
        elemento.appendChild(crear("i", clase));
        elemento.appendChild(document.createTextNode(textoLeyenda));
        lista.appendChild(elemento);
    }
    return lista;
}

export function pie(raiz, contenido) {
    raiz.appendChild(crear("p", "emb-pie", contenido));
}

export function textoError(error) {
    if (error && error.estado === 404) return "No hay datos de ese pueblo.";
    return "No se han podido leer los datos de sequía. Prueba dentro de un rato.";
}


/* Fin de fichero: js/sequia/comun.js */
