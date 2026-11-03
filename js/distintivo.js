/*
 * MeteoArchidona · Distintivo en la cabecera
 *
 * Pinta bajo el logotipo el distintivo que los administradores encienden en
 * Administración → Configuración (lazo de un color o monigote), leído de
 * GET /configuracion/publica de la API. Decisión de José del 3-11-2026:
 *
 * - En el ordenador (menú siempre a la vista, más de 1050 px), el lazo y,
 *   debajo, el texto del día en letra pequeña.
 * - En el móvil y la tableta no cabe el texto (se montaría sobre la fecha y
 *   la hora): solo el lazo, y al tocarlo sale el texto en un globo, en letra
 *   grande para que se lea bien aunque tape otras cosas.
 * - Apagado o sin respuesta de la API, no se pinta nada.
 *
 * Lo carga js/cabecera.js cuando la cabecera ya está montada.
 */

(function () {

"use strict";


const MINUTOS_REFRESCO = 10;

const ANCHO_ESCRITORIO = 1051;

const NS = "http://www.w3.org/2000/svg";


/* Lazo: lazada arriba y dos cintas cruzadas. */
const TRAZO_LAZO =
    "M12 2C7 2 6 8 9 13L3 29.5 7.2 31 12 18.5 16.8 31 21 29.5 15 13"
    + "C18 8 17 2 12 2ZM12 5.2C9.8 5.2 9.4 8.6 10.9 11.6L12 13.8 13.1 11.6"
    + "C14.6 8.6 14.2 5.2 12 5.2Z";

/* Monigote de papel del Día de los Inocentes: blanco, sin color. */
const TRAZO_MONIGOTE =
    "M12 1.5a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 1 0 0-7.2Z"
    + "M8.2 10h7.6l5.4 4.6-1.6 1.9-4.1-3.1v5.6l2.6 10.6-2.6.9L12 20.4"
    + "l-3.5 9.7-2.6-.9 2.6-10.6v-5.6l-4.1 3.1-1.6-1.9Z";


let elemento = null;
let globo = null;


function urlApi() {

    return `${window.API_BASE || "/api"}/configuracion/publica`;

}


function esEscritorio() {

    return window.innerWidth >= ANCHO_ESCRITORIO;

}


function crearIcono(distintivo) {

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 32");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("distintivo-icono");

    const trazo = document.createElementNS(NS, "path");
    trazo.setAttribute("fill-rule", "evenodd");
    trazo.setAttribute("stroke-linejoin", "round");

    if (distintivo.icono === "MONIGOTE") {

        trazo.setAttribute("d", TRAZO_MONIGOTE);
        trazo.setAttribute("fill", "#FFFFFF");
        trazo.setAttribute("stroke", "rgba(0, 0, 0, 0.35)");

    } else {

        const color = distintivo.color_hex || "#000000";
        const claro = color.toUpperCase() === "#FFFFFF";

        trazo.setAttribute("d", TRAZO_LAZO);
        trazo.setAttribute("fill", color);
        // Borde fino para que el negro se vea sobre el fondo oscuro.
        trazo.setAttribute(
            "stroke",
            claro ? "rgba(0, 0, 0, 0.35)" : "rgba(255, 255, 255, 0.85)"
        );
    }

    trazo.setAttribute("stroke-width", "1.4");
    svg.append(trazo);

    return svg;

}


/* Coloca el distintivo justo bajo el logotipo, esté donde esté. */
function colocar() {

    if (!elemento) {
        return;
    }

    const cabecera = document.querySelector(".cabecera");
    const logotipo = document.querySelector(".marca-logo");

    if (!cabecera || !logotipo) {
        return;
    }

    const marco = cabecera.getBoundingClientRect();
    const caja = logotipo.getBoundingClientRect();

    elemento.style.setProperty("--distintivo-izquierda", `${caja.left - marco.left}px`);
    elemento.style.setProperty("--distintivo-arriba", `${caja.bottom - marco.top + 3}px`);
    elemento.style.setProperty("--distintivo-centro", `${caja.width / 2}px`);

    elemento.classList.toggle("distintivo-con-texto", esEscritorio());

    if (esEscritorio()) {
        cerrarGlobo();
    }

}


function cerrarGlobo() {

    if (globo) {
        globo.hidden = true;
    }

    if (elemento) {
        elemento.setAttribute("aria-expanded", "false");
    }

}


function alternarGlobo(evento) {

    evento.stopPropagation();

    if (!globo || esEscritorio()) {
        return;
    }

    const abrir = globo.hidden;
    globo.hidden = !abrir;
    elemento.setAttribute("aria-expanded", String(abrir));

}


function quitar() {

    if (elemento) {
        elemento.remove();
    }

    elemento = null;
    globo = null;

}


function pintar(distintivo) {

    quitar();

    if (!distintivo || !distintivo.activo || !distintivo.icono) {
        return;
    }

    const cabecera = document.querySelector(".cabecera");

    if (!cabecera) {
        return;
    }

    const texto = (distintivo.texto_dia || "").trim();

    elemento = document.createElement(texto ? "button" : "span");
    elemento.className = "distintivo-cabecera";

    if (texto) {

        elemento.type = "button";
        elemento.setAttribute("aria-label", texto);
        elemento.setAttribute("aria-expanded", "false");
        elemento.title = texto;
        elemento.addEventListener("click", alternarGlobo);

    } else {

        elemento.setAttribute("aria-hidden", "true");

    }

    elemento.append(crearIcono(distintivo));

    if (texto) {

        const pequeno = document.createElement("span");
        pequeno.className = "distintivo-texto";
        pequeno.textContent = texto;

        globo = document.createElement("span");
        globo.className = "distintivo-globo";
        globo.textContent = texto;
        globo.hidden = true;

        elemento.append(pequeno, globo);

    }

    cabecera.append(elemento);
    colocar();

}


async function cargar() {

    try {

        const respuesta = await fetch(urlApi(), { cache: "no-store" });

        if (!respuesta.ok) {
            throw new Error(`La API respondió ${respuesta.status}`);
        }

        const datos = await respuesta.json();
        pintar(datos.distintivo);

    } catch (error) {

        // Sin distintivo no pasa nada: la cabecera se queda como siempre.
        quitar();
        console.warn("No se ha podido leer el distintivo:", error);

    }

}


document.addEventListener("click", cerrarGlobo);

document.addEventListener("keydown", evento => {
    if (evento.key === "Escape") {
        cerrarGlobo();
    }
});

window.addEventListener("resize", colocar);

window.setInterval(cargar, MINUTOS_REFRESCO * 60 * 1000);

cargar();

})();


// Fin de fichero: js/distintivo.js
