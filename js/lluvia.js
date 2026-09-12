/*
 * MeteoArchidona
 * Lluvia de prueba en toda la pantalla
 *
 * El logotipo de Y&Z de la cabecera es el mando de una lluvia de
 * prueba: dos toques seguidos suben el nivel (Débil, Moderada, Fuerte,
 * Muy fuerte y vuelta a empezar) y una pulsación larga la apaga. Con
 * teclado, Intro sube y Escape apaga.
 *
 * Este fichero se carga en todas las páginas y trabaja de dos formas:
 *
 * - En Actualidad solo RECUERDA. Allí manda su propio motor
 *   (js/actualidad.js), que además responde a la lluvia real y al
 *   viento de cada estación. Aquí solo se restaura el nivel guardado
 *   usando su mando, y se guarda cada cambio mirando el cartel
 *   "Prueba ..." del logotipo. Su código no se toca.
 *
 * - En el resto de páginas, que no tienen datos, hace la lluvia
 *   entera: las mismas gotas, niveles y gestos que Actualidad, cayendo
 *   recta. Los estilos están en css/lluvia.css.
 *
 * El nivel se guarda en sessionStorage para que la lluvia siga al
 * cambiar de página. Se borra solo al cerrar la pestaña, y no es un
 * dato personal: es una preferencia que pide el propio usuario al tocar
 * el logotipo. Si el navegador no deja guardar (modo privado de algunos
 * navegadores), la lluvia funciona igual, solo que sin recordar.
 */

(function () {

"use strict";


const CLAVE_NIVEL = "meteoarchidona:lluvia-prueba";

const NOMBRES_NIVEL = {
    1: "Débil",
    2: "Moderada",
    3: "Fuerte",
    4: "Muy fuerte"
};


/* ==========================================================
   RECUERDO DEL NIVEL
   ========================================================== */


function leerNivelGuardado() {

    try {

        const valor = Number(window.sessionStorage.getItem(CLAVE_NIVEL));

        return Number.isInteger(valor) && valor >= 0 && valor <= 4 ? valor : 0;

    } catch (error) {

        return 0;

    }

}


function guardarNivel(nivel) {

    try {

        if (nivel > 0) {

            window.sessionStorage.setItem(CLAVE_NIVEL, String(nivel));

        } else {

            window.sessionStorage.removeItem(CLAVE_NIVEL);

        }

    } catch (error) {

        // Sin almacenamiento disponible: se sigue sin recordar.

    }

}


/*
 * Espera a que la cabecera esté montada, que es cuando existen el
 * logotipo y su cartel. Si ya lo está, sigue directamente.
 */
function cuandoHayaCabecera(accion) {

    if (document.querySelector('[data-lluvia-control="GLOBAL"]')) {

        accion();

    } else {

        document.addEventListener("cabecera:montada", accion, { once: true });

    }

}


/* ==========================================================
   ACTUALIDAD: SOLO RECORDAR
   ========================================================== */


if (typeof window.avanzarSimulacion === "function") {

    cuandoHayaCabecera(() => {

        /*
         * Restaurar con su propio mando: avanzarSimulacion sube un nivel
         * cada vez, empezando en 1. Si las gotas aún no existen, su motor
         * las crea al cargar el catálogo y respeta el nivel ya puesto.
         */
        const guardado = leerNivelGuardado();

        for (let i = 0; i < guardado; i += 1) {

            window.avanzarSimulacion("GLOBAL");

        }


        // Y guardar lo que diga el cartel cada vez que cambie.
        const cartel = document.getElementById("simulacion-GLOBAL");

        if (!cartel) {

            return;

        }

        const nivelDelCartel = () => {

            const texto = cartel.textContent.replace(/^Prueba\s+/, "").trim();

            const encontrado = Object.keys(NOMBRES_NIVEL).find((n) => NOMBRES_NIVEL[n] === texto);

            return encontrado ? Number(encontrado) : 0;

        };

        new MutationObserver(() => guardarNivel(nivelDelCartel()))
            .observe(cartel, { childList: true, characterData: true, subtree: true });

    });

    return;

}


/* ==========================================================
   RESTO DE PÁGINAS: LLUVIA COMPLETA
   ========================================================== */


const TOTAL_GOTAS = 160;

const INTERVALO_CRISTAL_MS = 420;

const PULSACION_LARGA_MS = 700;

const DOBLE_TOQUE_MS = 450;

const TOLERANCIA_MOVIMIENTO_PX = 12;

// Máximo de gotas simultáneas en el cristal y probabilidad de que
// aparezca una en cada vuelta del temporizador, por nivel. Los mismos
// valores que usa Actualidad para su capa global.
const MAXIMO_CRISTAL = { 1: 4, 2: 7, 3: 11, 4: 16 };

const PROBABILIDAD_CRISTAL = { 1: 0.16, 2: 0.34, 3: 0.62, 4: 0.88 };


let nivel = 0;

let capaLluvia = null;

let capaCristal = null;

let temporizadorCristal = null;


function crearCapas() {

    capaLluvia = document.createElement("div");
    capaLluvia.className = "capa-lluvia";
    capaLluvia.id = "capa-lluvia";
    capaLluvia.setAttribute("aria-hidden", "true");

    capaCristal = document.createElement("div");
    capaCristal.className = "capa-gotas-cristal";
    capaCristal.id = "capa-gotas-cristal";
    capaCristal.setAttribute("aria-hidden", "true");

    for (let i = 0; i < TOTAL_GOTAS; i += 1) {

        const gota = document.createElement("span");

        gota.className = "gota-lluvia";
        gota.style.setProperty("--x", `${Math.random() * 116 - 8}%`);
        gota.style.setProperty("--longitud", `${13 + Math.random() * 27}px`);
        gota.style.setProperty("--duracion", `${0.58 + Math.random() * 0.42}s`);
        gota.style.setProperty("--retraso", `${-Math.random() * 2.4}s`);
        gota.style.setProperty("--opacidad", (0.38 + Math.random() * 0.57).toFixed(2));

        capaLluvia.appendChild(gota);

    }

    document.body.append(capaLluvia, capaCristal);

    ajustarRecorrido();

    window.addEventListener("resize", ajustarRecorrido);

}


/*
 * Sin datos de viento la lluvia cae recta: el mismo caso que
 * calcularMovimientoViento() de Actualidad cuando no hay dirección.
 */
function ajustarRecorrido() {

    const alto = window.innerHeight || 700;

    capaLluvia.style.setProperty("--inicio-x", "0px");
    capaLluvia.style.setProperty("--final-x", "0px");
    capaLluvia.style.setProperty("--recorrido-y", `${Math.max(alto * 1.45, 500).toFixed(1)}px`);
    capaLluvia.style.setProperty("--angulo-gota", "0deg");

}


function crearGotaCristal() {

    if (capaCristal.querySelectorAll(".gota-cristal").length >= MAXIMO_CRISTAL[nivel]) {

        return;

    }

    const base = { 1: 5, 2: 6, 3: 7, 4: 8 }[nivel];

    const rango = { 1: 4, 2: 6, 3: 8, 4: 10 }[nivel];

    const tamano = base + Math.random() * rango;

    const vida = 2600 + Math.random() * 3400;

    const opacidad = 0.15 + Math.random() * (0.06 + nivel * 0.025);

    const deslizar = 8 + nivel * 5 + Math.random() * 14;

    const gota = document.createElement("span");

    gota.className = "gota-cristal";
    gota.style.setProperty("--x", `${4 + Math.random() * 92}%`);
    gota.style.setProperty("--y", `${4 + Math.random() * 76}%`);
    gota.style.setProperty("--tamano", `${tamano.toFixed(1)}px`);
    gota.style.setProperty("--vida", `${Math.round(vida)}ms`);
    gota.style.setProperty("--opacidad-cristal", opacidad.toFixed(2));
    gota.style.setProperty("--deslizar", `${deslizar.toFixed(1)}px`);
    // Lluvia recta: sin viento no hay deriva lateral.
    gota.style.setProperty("--desvio-x", "0px");

    capaCristal.appendChild(gota);

    window.setTimeout(() => gota.remove(), vida + 150);

}


function turnoCristal() {

    if (
        nivel <= 0
        || window.matchMedia("(prefers-reduced-motion: reduce)").matches
        || Math.random() > PROBABILIDAD_CRISTAL[nivel]
    ) {

        return;

    }

    const cantidad = nivel >= 4 && Math.random() > 0.48 ? 2 : 1;

    for (let i = 0; i < cantidad; i += 1) {

        crearGotaCristal();

    }

}


function aplicarNivel() {

    guardarNivel(nivel);

    if (!capaLluvia) {

        if (nivel === 0) {

            return;

        }

        crearCapas();

    }

    capaLluvia.classList.remove("activa", "nivel-1", "nivel-2", "nivel-3", "nivel-4");

    capaCristal.classList.toggle("activa", nivel > 0);

    if (nivel > 0) {

        capaLluvia.classList.add("activa", `nivel-${nivel}`);

    }


    // El temporizador de las gotas del cristal solo corre mientras
    // llueve: sin lluvia no hay nada que gastar.
    if (nivel > 0 && temporizadorCristal === null) {

        temporizadorCristal = window.setInterval(turnoCristal, INTERVALO_CRISTAL_MS);

    } else if (nivel === 0 && temporizadorCristal !== null) {

        window.clearInterval(temporizadorCristal);

        temporizadorCristal = null;

        capaCristal.replaceChildren();

    }


    const indicador = document.getElementById("simulacion-GLOBAL");

    if (indicador) {

        indicador.textContent = nivel > 0 ? `Prueba ${NOMBRES_NIVEL[nivel]}` : "";

        indicador.classList.toggle("visible", nivel > 0);

    }

}


function subirNivel() {

    nivel = nivel <= 0 || nivel >= 4 ? 1 : nivel + 1;

    aplicarNivel();

}


function apagar() {

    nivel = 0;

    aplicarNivel();

}


/*
 * Mismos gestos que configurarControlLluvia() de Actualidad: dos
 * toques en menos de 450 ms suben, una pulsación de 700 ms apaga, y
 * moverse más de 12 px cancela la pulsación para no confundirla con
 * un desplazamiento de la página.
 */
function conectarMando() {

    const mando = document.querySelector('[data-lluvia-control="GLOBAL"]');

    if (!mando || mando.dataset.controlLluviaConfigurado === "1") {

        return;

    }

    mando.dataset.controlLluviaConfigurado = "1";


    let temporizadorLargo = null;

    let pulsacionLarga = false;

    let ultimoToque = 0;

    let inicioX = 0;

    let inicioY = 0;


    function cancelar() {

        if (temporizadorLargo !== null) {

            clearTimeout(temporizadorLargo);

            temporizadorLargo = null;

        }

    }


    mando.addEventListener("pointerdown", (evento) => {

        pulsacionLarga = false;

        inicioX = evento.clientX;

        inicioY = evento.clientY;

        cancelar();

        temporizadorLargo = setTimeout(() => {

            pulsacionLarga = true;

            ultimoToque = 0;

            apagar();

        }, PULSACION_LARGA_MS);

    });


    mando.addEventListener("pointermove", (evento) => {

        if (
            Math.abs(evento.clientX - inicioX) > TOLERANCIA_MOVIMIENTO_PX
            || Math.abs(evento.clientY - inicioY) > TOLERANCIA_MOVIMIENTO_PX
        ) {

            cancelar();

        }

    });


    mando.addEventListener("pointercancel", () => {

        cancelar();

        pulsacionLarga = false;

    });


    mando.addEventListener("pointerup", (evento) => {

        cancelar();

        if (pulsacionLarga) {

            pulsacionLarga = false;

            return;

        }

        const ahora = Date.now();

        if (ultimoToque > 0 && ahora - ultimoToque < DOBLE_TOQUE_MS) {

            ultimoToque = 0;

            subirNivel();

            evento.preventDefault();

            return;

        }

        ultimoToque = ahora;

    });


    mando.addEventListener("contextmenu", (evento) => evento.preventDefault());


    mando.addEventListener("keydown", (evento) => {

        if (evento.key === "Enter") {

            evento.preventDefault();

            subirNivel();

        }

        if (evento.key === "Escape") {

            evento.preventDefault();

            apagar();

        }

    });


    // Si se venía de otra página con lluvia, seguir con ella.
    const guardado = leerNivelGuardado();

    if (guardado > 0) {

        nivel = guardado;

        aplicarNivel();

    }

}


cuandoHayaCabecera(conectarMando);

})();


// Fin de fichero: js/lluvia.js
