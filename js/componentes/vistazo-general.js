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
 *
 * Pantalla completa (José, 18-11-2026): un solo botón en la cabecera,
 * para la vista que esté a la vista (dentro se puede seguir cambiando).
 * En Android gira a horizontal. Maximizada, la tabla se agranda hasta
 * llenar la pantalla (zoom del documento del iframe, del mismo dominio)
 * y el gráfico pone los instrumentos en una fila y las humedades en otra
 * (css/comparacion-visual.css).
 */

import {asegurarHoja} from "./comun.js?v=20261104-componentes1";
import {montarComparacionVisual} from "./comparacion-visual.js?v=20261118-pantalla1";
import {prepararPantallaCompleta} from "./pantalla-completa.js?v=20261118-pantalla1";


const HOJA = "/css/vistazo-general.css?v=20261118-pantalla1";

const ZOOM_MAXIMO_TABLA = 3.5;

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


/*
 * Tabla maximizada: zoom del documento del iframe para que la tabla
 * llene el alto disponible sin salirse de ancho. Fuera de pantalla
 * completa, sin zoom (la tabla de siempre).
 */
function ajustarZoomTabla(marco, ampliada) {
    let documento = null;
    try {
        documento = marco.contentDocument;
    } catch (error) {
        return;
    }
    const raizDoc = documento?.documentElement;
    const panel = documento?.querySelector(".tabla-estaciones-panel");
    if (!raizDoc || !panel) {
        return;
    }
    raizDoc.style.zoom = "";
    if (!ampliada) {
        return;
    }
    const altoTabla = panel.getBoundingClientRect().height;
    const altoHueco = marco.clientHeight;
    if (!altoTabla || !altoHueco) {
        return;
    }
    // Celdas cuyo texto no cabe (se pisan o salen con «…»): con zoom no
    // puede haber más que sin él.
    const celdas = [...documento.querySelectorAll(".tabla-estaciones th, .tabla-estaciones td")];
    const desbordadas = () =>
        celdas.filter(celda => celda.scrollWidth > celda.clientWidth + 1).length
        + (raizDoc.scrollWidth > raizDoc.clientWidth + 1 ? 1000 : 0);
    const permitidas = desbordadas();

    let zoom = Math.min(ZOOM_MAXIMO_TABLA, Math.max(1, (altoHueco * 0.96) / altoTabla));
    raizDoc.style.zoom = String(zoom);
    // Que no se salga de ancho: se rebaja hasta que quepa.
    while (zoom > 1 && desbordadas() > permitidas) {
        zoom = Math.max(1, zoom - 0.05);
        raizDoc.style.zoom = String(zoom);
    }
}


export function montarVistazoGeneral(raiz) {

    asegurarHoja(HOJA);

    const modo = vistaDelHueco(raiz);

    raiz.classList.add("vg-componente");
    raiz.textContent = "";
    raiz.setAttribute("role", "region");
    raiz.setAttribute("aria-label", "Vistazo general de las estaciones");

    const cabecera = crear("div", "vg-cabecera");
    const controles = crear("div", "vg-controles");
    cabecera.append(crear("h2", "vg-titulo", "Vistazo general"), controles);

    const paneles = {
        TABLA: crear("div", "vg-panel vg-panel-tabla"),
        GRAFICO: crear("div", "vg-panel vg-panel-grafico")
    };
    const montadas = new Set();
    const botones = {};
    let tabla = null;
    let ampliado = false;

    const ajustarTabla = () => {
        if (tabla && !paneles.TABLA.hidden) {
            ajustarZoomTabla(tabla, ampliado);
        }
    };

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
            marco.addEventListener("load", () => setTimeout(ajustarTabla, 300));
            paneles.TABLA.appendChild(marco);
            tabla = marco;
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
        requestAnimationFrame(ajustarTabla);
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
        controles.appendChild(selector);
    }

    const boton = crear("button", "vg-boton-maximizar");
    boton.type = "button";
    controles.appendChild(boton);

    raiz.append(cabecera, paneles.TABLA, paneles.GRAFICO);

    prepararPantallaCompleta(raiz, boton, {
        ampliado: "vg-ampliado",
        maximizado: "vg-maximizado",
        alCambiar: dentro => {
            ampliado = dentro;
            // Tras el cambio de tamaño (y del giro, en el móvil).
            setTimeout(ajustarTabla, 150);
            setTimeout(ajustarTabla, 600);
        }
    });

    window.addEventListener("resize", () => {
        if (ampliado) {
            requestAnimationFrame(ajustarTabla);
        }
    });

    // Con AMBAS arranca en Gráfico (José, 18-11-2026).
    ensenar(modo === "TABLA" ? "TABLA" : "GRAFICO");
}


/* Fin de fichero: js/componentes/vistazo-general.js */
