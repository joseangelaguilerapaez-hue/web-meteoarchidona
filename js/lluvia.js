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
 * LLUVIA REAL EN TODAS LAS PÁGINAS (José, 17-11-2026)
 *
 * Cuando llueve de verdad, la lluvia sale en todas las secciones, no
 * solo en Actualidad. Fuera de Actualidad este fichero consulta cada
 * minuto las condiciones de las estaciones (/estaciones y
 * /condiciones-actuales/{codigo}) y basta con que llueva en una para
 * que llueva en la página, con el nivel de la que más llueva. En
 * Actualidad no consulta nada: su motor avisa del nivel real con el
 * evento "meteoarchidona:lluvia-real" (js/actualidad/principal.js).
 *
 * Mientras llueve de verdad aparece en la cabecera, junto a los
 * botones de la cuenta, el botón «Detener lluvia». Al pulsarlo se
 * quita toda la lluvia (también la de las fichas de Actualidad) y pasa
 * a «Activar lluvia». La decisión se recuerda en sessionStorage hasta
 * cerrar la pestaña, en todas las páginas. Sin lluvia real el botón no
 * se ve y la lluvia de prueba del logotipo funciona como siempre.
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
   LLUVIA REAL Y BOTÓN «DETENER LLUVIA»
   ========================================================== */


const CLAVE_DETENIDA = "meteoarchidona:lluvia-detenida";

const ES_ACTUALIDAD = document.body?.dataset.seccion === "actualidad";

const INTERVALO_CONDICIONES_MS = 60_000;

const INTERVALO_CATALOGO_MS = 10 * 60_000;

// Nivel real más alto de las estaciones: 0 sin lluvia, 1 a 4.
let nivelReal = 0;

// Lo que haya que repintar cuando cambie la lluvia real o el botón
// (en las páginas sin motor propio, la capa de lluvia).
let alCambiarLluvia = () => {};


function leerDetenida() {

    try {

        return window.sessionStorage.getItem(CLAVE_DETENIDA) === "1";

    } catch (error) {

        return detenidaEnMemoria;

    }

}

let detenidaEnMemoria = false;


function guardarDetenida(valor) {

    detenidaEnMemoria = valor;

    try {

        if (valor) {

            window.sessionStorage.setItem(CLAVE_DETENIDA, "1");

        } else {

            window.sessionStorage.removeItem(CLAVE_DETENIDA);

        }

    } catch (error) {

        // Sin almacenamiento: vale para esta página.

    }

}


/*
 * La lluvia está quitada si el usuario la ha detenido y además llueve
 * de verdad. Sin lluvia real no se quita nada, para que la de prueba
 * del logotipo siga funcionando y nadie se quede sin botón para
 * volver a ponerla.
 */
function lluviaQuitada() {

    return nivelReal > 0 && leerDetenida();

}


/*
 * Tasa de lluvia (mm/h) a nivel: los mismos tramos que
 * nivelLluviaDesdeTasa() de js/actualidad/lluvia.js.
 */
function nivelDesdeTasa(tasa) {

    const valor = Number(tasa);

    if (tasa === null || tasa === undefined || Number.isNaN(valor) || valor <= 0) {

        return 0;

    }

    if (valor < 0.5) {

        return 1;

    }

    if (valor < 2) {

        return 2;

    }

    if (valor < 10) {

        return 3;

    }

    return 4;

}


function pintarBoton() {

    const zona = document.getElementById("cuenta-zona");

    let boton = document.getElementById("boton-lluvia");

    if (nivelReal <= 0) {

        boton?.remove();

        return;

    }

    if (!zona) {

        return;

    }

    if (!boton) {

        boton = document.createElement("button");
        boton.type = "button";
        boton.id = "boton-lluvia";
        boton.className = "cuenta-boton boton-lluvia";

        boton.addEventListener("click", () => {

            guardarDetenida(!leerDetenida());

            actualizarLluviaReal();

        });

    }

    // Primero de la fila, al lado de los botones de la cuenta. Hay que
    // volver a ponerlo cada vez que js/cuenta.js repinta la fila.
    if (zona.firstElementChild !== boton) {

        zona.prepend(boton);

    }

    const detenida = leerDetenida();

    boton.textContent = detenida ? "Activar lluvia" : "Detener lluvia";
    boton.setAttribute("aria-pressed", detenida ? "true" : "false");
    boton.title = detenida
        ? "Volver a mostrar la lluvia en la web"
        : "Quitar la lluvia de la web hasta que cierres la pestaña";

}


function actualizarLluviaReal() {

    document.documentElement.classList.toggle("lluvia-detenida", lluviaQuitada());

    pintarBoton();

    alCambiarLluvia();

}


function fijarNivelReal(valor) {

    nivelReal = Number.isInteger(valor) && valor > 0 && valor <= 4 ? valor : 0;

    actualizarLluviaReal();

}


// js/cuenta.js repinta la fila de la cuenta al arrancar, al entrar y al
// salir, y borra lo que hubiera: se vuelve a poner el botón.
document.addEventListener("meteoarchidona:cuenta", pintarBoton);

document.addEventListener("cabecera:montada", pintarBoton);


// Otra pestaña no comparte sessionStorage; esto solo cubre el caso de
// cambiarlo desde la consola o desde otro marco de la misma pestaña.
window.addEventListener("storage", (evento) => {

    if (evento.key === CLAVE_DETENIDA) {

        actualizarLluviaReal();

    }

});


/* ---------- Origen del nivel real ---------- */


let codigosEstaciones = [];

let ultimoCatalogo = 0;


function baseApi() {

    return String(window.API_BASE || "/api").replace(/\/+$/, "");

}


async function pedirJson(ruta) {

    const respuesta = await fetch(`${baseApi()}${ruta}`, { cache: "no-store" });

    if (!respuesta.ok) {

        throw new Error(`HTTP ${respuesta.status}`);

    }

    return respuesta.json();

}


async function consultarLluviaReal() {

    if (document.hidden) {

        return;

    }

    try {

        if (codigosEstaciones.length === 0 || Date.now() - ultimoCatalogo > INTERVALO_CATALOGO_MS) {

            const catalogo = await pedirJson("/estaciones");

            if (Array.isArray(catalogo?.estaciones)) {

                codigosEstaciones = [...new Set(
                    catalogo.estaciones
                        .map((estacion) => String(estacion?.codigo || "").trim())
                        .filter(Boolean)
                )];

                ultimoCatalogo = Date.now();

            }

        }

        const resultados = await Promise.allSettled(
            codigosEstaciones.map((codigo) =>
                pedirJson(`/condiciones-actuales/${encodeURIComponent(codigo)}`)
            )
        );

        const niveles = resultados
            .filter((resultado) => resultado.status === "fulfilled")
            .map((resultado) => nivelDesdeTasa(resultado.value?.tasa_lluvia_mm_h));

        fijarNivelReal(Math.max(0, ...niveles));

    } catch (error) {

        // Sin datos se deja lo que hubiera: la web no se queja por esto.

    }

}


if (ES_ACTUALIDAD) {

    document.addEventListener("meteoarchidona:lluvia-real", (evento) => {

        fijarNivelReal(Number(evento.detail?.nivel) || 0);

    });

} else {

    consultarLluviaReal();

    window.setInterval(consultarLluviaReal, INTERVALO_CONDICIONES_MS);

    document.addEventListener("visibilitychange", () => {

        if (!document.hidden) {

            consultarLluviaReal();

        }

    });

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


/*
 * Nivel que se pinta: el de la prueba del logotipo o el de la lluvia
 * real, el mayor de los dos.
 */
function nivelEfectivo() {

    // En Actualidad la lluvia real la pinta su propio motor.
    return ES_ACTUALIDAD ? nivel : Math.max(nivel, nivelReal);

}


function crearGotaCristal(nivel) {

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

    const efectivo = nivelEfectivo();

    if (
        efectivo <= 0
        || lluviaQuitada()
        || window.matchMedia("(prefers-reduced-motion: reduce)").matches
        || Math.random() > PROBABILIDAD_CRISTAL[efectivo]
    ) {

        return;

    }

    const cantidad = efectivo >= 4 && Math.random() > 0.48 ? 2 : 1;

    for (let i = 0; i < cantidad; i += 1) {

        crearGotaCristal(efectivo);

    }

}


function aplicarNivel() {

    guardarNivel(nivel);

    pintarCapas();


    const indicador = document.getElementById("simulacion-GLOBAL");

    if (indicador) {

        indicador.textContent = nivel > 0 ? `Prueba ${NOMBRES_NIVEL[nivel]}` : "";

        indicador.classList.toggle("visible", nivel > 0);

    }

}


/*
 * Pinta las capas con el nivel efectivo (prueba o real). Se llama al
 * cambiar la prueba y cada vez que cambia la lluvia real o el botón.
 */
function pintarCapas() {

    const efectivo = nivelEfectivo();

    if (!capaLluvia) {

        if (efectivo === 0) {

            return;

        }

        crearCapas();

    }

    capaLluvia.classList.remove("activa", "nivel-1", "nivel-2", "nivel-3", "nivel-4");

    capaCristal.classList.toggle("activa", efectivo > 0);

    if (efectivo > 0) {

        capaLluvia.classList.add("activa", `nivel-${efectivo}`);

    }


    // El temporizador de las gotas del cristal solo corre mientras
    // llueve: sin lluvia no hay nada que gastar.
    if (efectivo > 0 && temporizadorCristal === null) {

        temporizadorCristal = window.setInterval(turnoCristal, INTERVALO_CRISTAL_MS);

    } else if (efectivo === 0 && temporizadorCristal !== null) {

        window.clearInterval(temporizadorCristal);

        temporizadorCristal = null;

        capaCristal.replaceChildren();

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


// La lluvia real también se pinta con estas capas fuera de Actualidad.
if (!ES_ACTUALIDAD) {

    alCambiarLluvia = pintarCapas;

    pintarCapas();

}

})();


// Fin de fichero: js/lluvia.js
