/*
 * MeteoArchidona · Componente «Vistazo general»
 *
 * Las estaciones de un vistazo en dos vistas (José, 18-11-2026):
 *
 * - Tabla: la tabla resumen de siempre (componentes/tabla-estaciones.html,
 *   en su iframe, sin tocar);
 * - Gráfico: la «Comparación visual» (js/componentes/comparacion-visual.js),
 *   los instrumentos del directo por estación, con su pantalla completa.
 *
 * Parámetro data-vista:
 *
 *     TABLA   solo la tabla, sin selector;
 *     GRAFICO solo el gráfico, sin selector;
 *     AMBAS   (por defecto) selector «Tabla | Gráfico» arriba; arranca en
 *             Gráfico.
 *
 *     <div data-componente="vistazo-general" data-vista="AMBAS"></div>
 *
 *     import {montarVistazoGeneral} from "/js/componentes/vistazo-general.js?v=…";
 *     montarVistazoGeneral(hueco);
 *
 * Cada vista se monta la primera vez que se enseña: si nadie pide la
 * tabla, su iframe no se carga. Sin id: se puede repetir en una página.
 */

import {asegurarHoja} from "./comun.js?v=20261104-componentes1";
import {montarComparacionVisual} from "./comparacion-visual.js?v=20261118-comparacion2";


const HOJA = "/css/vistazo-general.css?v=20261118-vistazo1";

const TABLA = "/componentes/tabla-estaciones.html?v=20261118-alto1";

const VISTAS = ["TABLA", "GRAFICO"];

const NOMBRES = {TABLA: "Tabla", GRAFICO: "Gráfico"};


function crear(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
}


/* TABLA, GRAFICO o AMBAS; cualquier otra cosa cuenta como AMBAS. */
export function vistaDelHueco(raiz) {
    const valor = String(raiz.dataset.vista || "").trim().toUpperCase();
    return VISTAS.includes(valor) ? valor : "AMBAS";
}


export function montarVistazoGeneral(raiz) {

    asegurarHoja(HOJA);

    const modo = vistaDelHueco(raiz);

    raiz.classList.add("vg-componente");
    raiz.textContent = "";
    raiz.setAttribute("role", "region");
    raiz.setAttribute("aria-label", "Vistazo general de las estaciones");

    const cabecera = crear("div", "vg-cabecera");
    cabecera.append(crear("h2", "vg-titulo", "Vistazo general"));

    const paneles = {
        TABLA: crear("div", "vg-panel vg-panel-tabla"),
        GRAFICO: crear("div", "vg-panel vg-panel-grafico")
    };
    const montadas = new Set();
    const botones = {};

    const montarVista = vista => {
        if (montadas.has(vista)) {
            return;
        }
        montadas.add(vista);
        if (vista === "TABLA") {
            const marco = crear("iframe", "vg-tabla");
            marco.src = TABLA;
            marco.title = "Vistazo general de las estaciones meteorológicas de MeteoArchidona";
            marco.loading = "eager";
            marco.dataset.auditoriaVisualizacion = "TABLA_ESTACIONES";
            paneles.TABLA.appendChild(marco);
        } else {
            const hueco = crear("div");
            hueco.dataset.componente = "comparacion-visual";
            hueco.dataset.incrustado = "si";
            paneles.GRAFICO.appendChild(hueco);
            montarComparacionVisual(hueco);
        }
    };

    const ensenar = vista => {
        montarVista(vista);
        for (const nombre of VISTAS) {
            paneles[nombre].hidden = nombre !== vista;
            if (botones[nombre]) {
                botones[nombre].setAttribute("aria-checked", nombre === vista ? "true" : "false");
                botones[nombre].tabIndex = nombre === vista ? 0 : -1;
            }
        }
        raiz.dataset.vistaActual = vista;
    };

    if (modo === "AMBAS") {
        const selector = crear("div", "vg-selector");
        selector.setAttribute("role", "radiogroup");
        selector.setAttribute("aria-label", "Vista");
        for (const vista of VISTAS) {
            const boton = crear("button", "vg-opcion", NOMBRES[vista]);
            boton.type = "button";
            boton.setAttribute("role", "radio");
            boton.addEventListener("click", () => ensenar(vista));
            boton.addEventListener("keydown", evento => {
                if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(evento.key)) {
                    evento.preventDefault();
                    const otra = vista === "TABLA" ? "GRAFICO" : "TABLA";
                    ensenar(otra);
                    botones[otra].focus();
                }
            });
            botones[vista] = boton;
            selector.appendChild(boton);
        }
        cabecera.appendChild(selector);
    }

    raiz.append(cabecera, paneles.TABLA, paneles.GRAFICO);

    // Con AMBAS arranca en Gráfico (José, 18-11-2026).
    ensenar(modo === "TABLA" ? "TABLA" : "GRAFICO");
}


/* Fin de fichero: js/componentes/vistazo-general.js */
