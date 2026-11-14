/*
 * MeteoArchidona · Agua y sequía · Ríos: piezas comunes
 *
 * Reutiliza las de la pestaña Sequía (js/sequia/comun.js: peticiones,
 * SVG, leyendas) y añade la hoja de los ríos, el formato del caudal y de
 * la hora (Madrid), las marcas de estado y el selector de estación.
 *
 * Decisiones de José del 14-11-2026 (docs/agua-sequia.md de la API):
 * caudal medido del SAIH Guadalquivir y de Hidrosur (provisional, una
 * lectura cada hora) y GloFAS (modelo) para la previsión y lo normal.
 */

import { crear, pedir, prepararRaiz as prepararRaizSequia } from "../sequia/comun.js?v=20261114-sequia2";

export {
    aviso, crear, escala, fecha, leyenda, pedir, pie, svg, texto, trazo, vaciar
} from "../sequia/comun.js?v=20261114-sequia2";

const HOJA_RIOS = "/css/rios-componentes.css?v=20261114-rios1";

// Evento con el que las tarjetas del resumen eligen la estación de las gráficas.
export const EVENTO_ESTACION = "rios:estacion";

export function prepararRaiz(raiz, clase) {
    prepararRaizSequia(raiz, clase);
    if (!document.querySelector('link[href*="css/rios-componentes.css"]')) {
        const enlace = document.createElement("link");
        enlace.rel = "stylesheet";
        enlace.href = HOJA_RIOS;
        document.head.appendChild(enlace);
    }
}

const decimales = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const unDecimal = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const entero = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

export function caudal(valor) {
    if (valor === null || valor === undefined) return "—";
    const formato = valor < 10 ? decimales : valor < 100 ? unDecimal : entero;
    return `${formato.format(valor)} m³/s`;
}

export function nivel(valor) {
    return valor === null || valor === undefined ? "—" : `${decimales.format(valor)} m`;
}

const FORMATO_HORA = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
});

const FORMATO_DIA = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", day: "numeric", month: "short" });

/* «2026-11-07» → «7 nov» (para los ejes). */
export function diaCorto(texto) {
    return texto ? FORMATO_DIA.format(new Date(`${texto}T00:00:00Z`)).replace(".", "") : "";
}

export function hora(texto) {
    return texto ? FORMATO_HORA.format(new Date(texto)) : "";
}

export const FLECHAS = { SUBE: "↑ sube", BAJA: "↓ baja", ESTABLE: "→ estable" };

export function marcaEstado(codigo, nombre) {
    return crear("span", `rio-estado rio-${(codigo || "SIN").toLowerCase()}`, nombre || "Sin comparar");
}

let promesaRios = null;

export function leerRios() {
    if (!promesaRios) {
        promesaRios = pedir("/agua/rios").catch(error => {
            promesaRios = null;
            throw error;
        });
    }
    return promesaRios;
}

export function todasLasEstaciones(datos) {
    return datos.rios.flatMap(rio => rio.estaciones.map(e => ({ ...e, rio: rio.nombre })));
}

/* Selector de estación agrupado por río; llama a alCambiar con el id. */
export function selectorEstacion(datos, elegida, alCambiar, filtro = () => true) {
    const etiqueta = crear("label", "seq-selector", "Estación ");
    const selector = crear("select");
    for (const rio of datos.rios) {
        const grupo = document.createElement("optgroup");
        grupo.label = rio.nombre;
        for (const estacion of rio.estaciones.filter(filtro)) {
            grupo.appendChild(new Option(estacion.nombre, String(estacion.id)));
        }
        if (grupo.children.length) selector.appendChild(grupo);
    }
    selector.value = String(elegida);
    selector.addEventListener("change", () => alCambiar(Number(selector.value)));
    etiqueta.appendChild(selector);
    return etiqueta;
}

/* Las gráficas siguen a las tarjetas del resumen si no están fijadas. */
export function seguirEstacion(raiz, alCambiar) {
    if (raiz.dataset.selector === "no" || raiz.dataset.seguir === "no") return;
    document.addEventListener(EVENTO_ESTACION, evento => alCambiar(evento.detail));
}


/* Fin de fichero: js/rios/comun.js */
