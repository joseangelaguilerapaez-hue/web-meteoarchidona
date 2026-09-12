/*
 * MeteoArchidona
 * Cabecera común
 *
 * Monta la cabecera de componentes/cabecera.html en el
 * <div id="cabecera"> de cada página, marca el enlace de la sección
 * en la que estamos y pone el reloj en marcha.
 *
 * La sección se lee de <body data-seccion="...">, que tiene que
 * coincidir con el data-seccion del enlace correspondiente.
 *
 * Antes esto vivía en index.html, cuando el sitio era una sola página
 * con las secciones dentro de iframes. Ahora cada sección es una
 * página de verdad con su propia dirección.
 */


/*
 * Todo va dentro de una función anónima para no dejar nada en el
 * ámbito global. No es manía: js/administracion.js tiene su propio
 * actualizarReloj —el de la caducidad de la sesión— y, al cargarse
 * después, se quedaba con el nombre. El reloj de la cabecera se
 * paraba en --:-- en esa página.
 */

(function () {

"use strict";



const RUTA_CABECERA = "/componentes/cabecera.html";


/* ==========================================================
   RELOJ
   ========================================================== */


function actualizarReloj() {

    const ahora = new Date();

    const fecha = document.getElementById("fecha-actual");

    const reloj = document.getElementById("reloj-actual");


    if (fecha) {

        fecha.textContent = ahora.toLocaleDateString("es-ES");

    }


    if (reloj) {

        reloj.textContent = ahora.toLocaleTimeString(
            "es-ES",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    }

}


/* ==========================================================
   MONTAJE
   ========================================================== */


function marcarSeccionActual() {

    const seccion = document.body.dataset.seccion;

    if (!seccion) {

        return;

    }


    const enlace = document.querySelector(
        `.navegacion a[data-seccion="${seccion}"]`
    );


    if (enlace) {

        enlace.classList.add("activo");

        enlace.setAttribute("aria-current", "page");

    }

}


function recogerControlesDePagina() {

    /*
     * Los controles propios de una página —hoy solo el botón de
     * cerrar sesión de Administración— se declaran en su HTML con
     * data-en-cabecera y se traen aquí al montar.
     *
     * No van en componentes/cabecera.html porque tienen que existir
     * desde el primer momento: js/administracion.js busca su botón
     * por id nada más arrancar, y la cabecera llega después.
     */

    const hueco = document.getElementById("cabecera-acciones");

    if (!hueco) {

        return;

    }


    document
        .querySelectorAll("[data-en-cabecera]")
        .forEach((control) => hueco.appendChild(control));

}


/* ==========================================================
   MENÚ DESPLEGABLE (MÓVIL)
   ========================================================== */


/*
 * En pantallas de hasta 850 px el menú se esconde tras un botón para
 * que la cabecera no se coma media pantalla. Aquí solo se cambia la
 * clase .menu-abierto y el aria-expanded; lo que se ve lo decide
 * css/cabecera.css, así que en escritorio el botón ni aparece.
 */

const ANCHO_MENU_MOVIL = 850;


function configurarMenu() {

    const cabecera = document.querySelector(".cabecera");

    const boton = document.querySelector(".boton-menu");

    const menu = document.getElementById("navegacion-principal");


    if (!cabecera || !boton || !menu) {

        return;

    }


    function abrir(abierto) {

        cabecera.classList.toggle("menu-abierto", abierto);

        boton.setAttribute("aria-expanded", String(abierto));

        boton.setAttribute(
            "aria-label",
            abierto ? "Cerrar menú" : "Abrir menú"
        );

    }


    boton.addEventListener("click", () => {

        abrir(!cabecera.classList.contains("menu-abierto"));

    });


    // Al elegir una sección se navega; no tiene sentido dejarlo abierto.
    menu.addEventListener("click", (evento) => {

        if (evento.target.closest("a")) {

            abrir(false);

        }

    });


    // Escape lo cierra y devuelve el foco al botón.
    document.addEventListener("keydown", (evento) => {

        if (
            evento.key === "Escape"
            && cabecera.classList.contains("menu-abierto")
        ) {

            abrir(false);

            boton.focus();

        }

    });


    // Tocar fuera de la cabecera también lo cierra.
    document.addEventListener("click", (evento) => {

        if (
            cabecera.classList.contains("menu-abierto")
            && !cabecera.contains(evento.target)
        ) {

            abrir(false);

        }

    });


    // Si se gira el móvil o se ensancha la ventana a escritorio, se
    // cierra: ahí el menú ya está a la vista y la clase sobra.
    window.addEventListener("resize", () => {

        if (window.innerWidth > ANCHO_MENU_MOVIL) {

            abrir(false);

        }

    });

}


async function montarCabecera() {

    const hueco = document.getElementById("cabecera");


    if (!hueco) {

        return;

    }


    try {

        const respuesta = await fetch(RUTA_CABECERA);

        if (!respuesta.ok) {

            throw new Error(
                `La cabecera respondió ${respuesta.status}`
            );

        }

        hueco.innerHTML = await respuesta.text();

    } catch (error) {

        /*
         * Sin cabecera no se puede navegar, así que se deja al menos
         * la vuelta a la portada en vez de dejar al visitante
         * encerrado en la página.
         */

        hueco.innerHTML =
            '<header class="cabecera">'
            + '<a href="/" class="marca-titulo">METEO<span>ARCHIDONA</span></a>'
            + "</header>";

        console.error("No se ha podido cargar la cabecera:", error);

        return;

    }


    marcarSeccionActual();

    configurarMenu();

    recogerControlesDePagina();

    /*
     * La cabecera llega después que el JS de la página, así que lo
     * que haya dentro y necesite configurarse —hoy el logotipo, que
     * es el mando de la lluvia de prueba— no estaba cuando esa
     * página repasó el documento. Se avisa para que lo repase otra
     * vez.
     */
    document.dispatchEvent(
        new CustomEvent("cabecera:montada")
    );

    actualizarReloj();

    window.setInterval(actualizarReloj, 30000);

}


montarCabecera();

})();


// Fin de fichero: js/cabecera.js
