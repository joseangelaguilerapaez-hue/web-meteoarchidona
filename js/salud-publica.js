/*
 * MeteoArchidona
 * Salud de las estaciones en todas las páginas (José, 10-11-2026;
 * docs/salud-estaciones.md de api-meteoarchidona).
 *
 * Lo carga js/cabecera.js, como la cuenta y el distintivo. Hace dos cosas:
 *
 * 1. Semáforo público en las fichas de estación: tres luces pequeñas
 *    (rojo, ámbar, verde) junto a «En línea», con la encendida según
 *    GET /salud/semaforo. Rojo: hay que mirarla. Ámbar: algo falla.
 *    Verde: todo bien. Solo el color: los detalles, en Administración.
 *    Las fichas se montan cuando quieren, así que se vigila la página y
 *    se pone en cuanto aparecen; se refresca cada 2 minutos.
 *
 * 2. Franja roja bajo la cabecera para los usuarios administradores
 *    mientras haya una alerta abierta (GET /salud/alertas, con la cookie
 *    de sesión: a los demás la API les dice que no y no se pinta nada).
 *    Se puede cerrar: vuelve a salir si aparece una alerta nueva o al
 *    cabo de unas horas si sigue abierta (se recuerda en este navegador).
 *
 * El texto nunca se mete como HTML.
 */

(function () {

"use strict";


const CADA_SEMAFORO_MS = 2 * 60 * 1000;
const CADA_ALERTAS_MS = 3 * 60 * 1000;
const CLAVE_CERRADA = "ma_salud_franja_cerrada";

const NOMBRES = {
    VERDE: "todo bien",
    AMBAR: "algo falla",
    ROJO: "hay que mirarla",
    SIN_DATO: "sin información",
};

let semaforo = new Map();
let observador = null;
let temporizadorAlertas = null;
let alertasActivas = false;


function api(ruta) {

    return `${window.API_BASE || "/api"}${ruta}`;

}


/* ==========================================================
   SEMÁFORO DE LAS FICHAS
   ========================================================== */


function crearSemaforo() {

    const caja = document.createElement("span");

    caja.className = "salud-semaforo";
    caja.setAttribute("role", "img");

    for (const nivel of ["ROJO", "AMBAR", "VERDE"]) {

        const luz = document.createElement("i");

        luz.dataset.luz = nivel;
        caja.appendChild(luz);

    }

    return caja;

}


function aplicarSemaforo() {

    for (const [codigo, estado] of semaforo) {

        const linea = document.getElementById(`estado-${codigo}`);

        if (!linea || !linea.parentNode) {
            continue;
        }

        let caja = linea.nextElementSibling;

        if (!caja || !caja.classList.contains("salud-semaforo")) {

            caja = crearSemaforo();
            linea.insertAdjacentElement("afterend", caja);

        }

        if (caja.dataset.nivel !== estado.nivel) {

            caja.dataset.nivel = estado.nivel;

            const texto = `Salud de la estación: ${NOMBRES[estado.nivel] || estado.nivel_nombre}`;

            caja.title = texto;
            caja.setAttribute("aria-label", texto);

        }

    }

}


async function pedirSemaforo() {

    try {

        const respuesta = await fetch(api("/salud/semaforo"), { credentials: "same-origin" });

        if (!respuesta.ok) {
            return;
        }

        const lista = await respuesta.json();

        semaforo = new Map(lista.map((estado) => [estado.codigo, estado]));

        aplicarSemaforo();

    } catch (error) {

        // Sin semáforo la página sigue igual.

    }

}


function vigilarFichas() {

    if (observador || !("MutationObserver" in window)) {
        return;
    }

    let pendiente = false;

    observador = new MutationObserver(() => {

        if (pendiente || !semaforo.size) {
            return;
        }

        pendiente = true;

        requestAnimationFrame(() => {

            pendiente = false;
            aplicarSemaforo();

        });

    });

    observador.observe(document.body, { childList: true, subtree: true });

}


/* ==========================================================
   FRANJA DE LOS ADMINISTRADORES
   ========================================================== */


function leerCerrada() {

    try {

        return JSON.parse(localStorage.getItem(CLAVE_CERRADA) || "null");

    } catch (error) {

        return null;

    }

}


function guardarCerrada(ids, horas) {

    try {

        localStorage.setItem(
            CLAVE_CERRADA,
            JSON.stringify({ ids, hasta: Date.now() + horas * 3600 * 1000 })
        );

    } catch (error) {

        // Sin almacenamiento, la franja vuelve a salir al recargar.

    }

}


function quitarFranja() {

    document.querySelector(".salud-franja")?.remove();

}


function pintarFranja(alertas, horas) {

    if (!alertas.length) {

        quitarFranja();
        return;

    }

    const cerrada = leerCerrada();

    if (
        cerrada
        && Date.now() < cerrada.hasta
        && alertas.every((alerta) => cerrada.ids.includes(alerta.id))
    ) {

        quitarFranja();
        return;

    }

    let franja = document.querySelector(".salud-franja");

    if (!franja) {

        franja = document.createElement("div");
        franja.className = "salud-franja";
        franja.setAttribute("role", "alert");

        const cabecera = document.getElementById("cabecera");

        if (cabecera && cabecera.parentNode) {
            cabecera.insertAdjacentElement("afterend", franja);
        } else {
            document.body.prepend(franja);
        }

    }

    const enlace = document.createElement("a");

    enlace.className = "salud-franja-enlace";
    enlace.href = "/administracion#salud";

    const icono = document.createElement("span");

    icono.className = "salud-franja-icono";
    icono.setAttribute("aria-hidden", "true");
    icono.textContent = "⚠";

    const textos = document.createElement("span");

    textos.className = "salud-franja-textos";

    for (const alerta of alertas.slice(0, 3)) {

        const linea = document.createElement("span");

        linea.textContent = alerta.mensaje;
        textos.appendChild(linea);

    }

    if (alertas.length > 3) {

        const mas = document.createElement("span");

        mas.textContent = `y ${alertas.length - 3} más`;
        textos.appendChild(mas);

    }

    const ver = document.createElement("span");

    ver.className = "salud-franja-ver";
    ver.textContent = "Ver salud de estaciones →";

    enlace.append(icono, textos, ver);

    const cerrar = document.createElement("button");

    cerrar.type = "button";
    cerrar.className = "salud-franja-cerrar";
    cerrar.setAttribute("aria-label", "Cerrar el aviso");
    cerrar.textContent = "×";
    cerrar.addEventListener("click", () => {

        guardarCerrada(alertas.map((alerta) => alerta.id), horas);
        quitarFranja();

    });

    franja.replaceChildren(enlace, cerrar);

}


async function pedirAlertas() {

    try {

        const respuesta = await fetch(api("/salud/alertas"), { credentials: "same-origin" });

        if (respuesta.status === 401 || respuesta.status === 403) {

            // No es administrador (o ya no hay sesión): ni franja ni más preguntas.
            dejarDeVigilarAlertas();
            return;

        }

        if (!respuesta.ok) {
            return;
        }

        const datos = await respuesta.json();

        pintarFranja(datos.alertas || [], datos.horas_recordatorio || 4);

    } catch (error) {

        // Sin franja la página sigue igual.

    }

}


function vigilarAlertas() {

    if (alertasActivas) {
        return;
    }

    alertasActivas = true;
    pedirAlertas();
    temporizadorAlertas = setInterval(pedirAlertas, CADA_ALERTAS_MS);

}


function dejarDeVigilarAlertas() {

    alertasActivas = false;
    clearInterval(temporizadorAlertas);
    quitarFranja();

}


/* ==========================================================
   ARRANQUE
   ========================================================== */


function arrancar() {

    pedirSemaforo();
    setInterval(pedirSemaforo, CADA_SEMAFORO_MS);
    vigilarFichas();

    // js/cuenta.js avisa al saber si hay sesión (al arrancar, al entrar y al salir).
    document.addEventListener("meteoarchidona:cuenta", (evento) => {

        if (evento.detail && evento.detail.conSesion) {
            vigilarAlertas();
        } else {
            dejarDeVigilarAlertas();
        }

    });

    // Por si la cuenta ya se pintó antes de cargar este script.
    if (document.querySelector('#cuenta-zona [data-cuenta-accion="salir"]')) {
        vigilarAlertas();
    }

}


if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", arrancar);
} else {
    arrancar();
}

})();


/* Fin de fichero: js/salud-publica.js */
