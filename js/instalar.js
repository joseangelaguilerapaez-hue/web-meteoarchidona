/*
 * MeteoArchidona · Botón de instalar del pie
 *
 * Enseña «Instalar la aplicación» en el pie, pero solo a quien pueda
 * hacer algo con él. Instalar no se parece en nada según el navegador:
 *
 * - Chrome, Edge y Samsung Internet avisan con beforeinstallprompt y
 *   dejan abrir el diálogo nativo cuando queramos. Un clic y dentro.
 * - Safari del iPhone no tiene forma de pedirlo desde la página: solo
 *   se puede explicar dónde está el botón de Apple.
 * - Firefox y los demás no instalan nada. A esos no se les enseña el
 *   botón: un botón que no hace nada es peor que no tenerlo.
 *
 * Quien ya la tiene instalada tampoco lo ve.
 *
 * Por qué un atributo en <html> y no tocar el botón directamente:
 * el pie lo monta js/cabecera.js por su cuenta y tarda lo que tarde en
 * llegar, así que aquí no se sabe si existe todavía. Con
 * `data-instalable` en la raíz manda la hoja de estilos (css/pie.css),
 * y da igual quién llegue antes.
 */

(function () {
    "use strict";


    const RAIZ = document.documentElement;

    /* Lo que Chrome nos da para abrir el diálogo cuando queramos. */
    let peticionGuardada = null;

    let ventana = null;


    function yaInstalada() {

        return (
            window.matchMedia("(display-mode: standalone)").matches
            ||
            // Lo de Safari, que no entiende display-mode.
            window.navigator.standalone === true
        );

    }


    /*
     * Safari del iPhone y del iPad. Chrome y Firefox de iOS llevan el
     * mismo motor por dentro, pero sus menús no tienen «Añadir a
     * pantalla de inicio», así que no sirve explicárselo.
     */
    function esSafariDeApple() {

        const agente = window.navigator.userAgent;

        const esDeApple =
            /iPhone|iPod/.test(agente)
            ||
            // El iPad moderno se hace pasar por Mac: se le reconoce
            // porque es el único «Mac» con pantalla táctil.
            (/Macintosh/.test(agente) && navigator.maxTouchPoints > 1);

        if (!esDeApple) {

            return false;

        }


        /* CriOS es Chrome; FxiOS, Firefox; EdgiOS, Edge. */
        return !/CriOS|FxiOS|EdgiOS|OPiOS/.test(agente);

    }


    function esconderBoton() {

        delete RAIZ.dataset.instalable;

    }


    /* ==========================================================
       VENTANA DE PASOS (SOLO SAFARI)
       ========================================================== */

    function crearVentana() {

        const dialogo = document.createElement("dialog");

        dialogo.className = "instalar-ventana";

        dialogo.innerHTML = `
<header class="instalar-ventana-cabecera">
    <h2>Instalar en tu iPhone</h2>
    <button type="button" class="instalar-cerrar" aria-label="Cerrar">&times;</button>
</header>

<ol class="instalar-pasos">
    <li>Toca <strong>Compartir</strong>, el cuadrado con la flecha hacia arriba, abajo en la barra de Safari.</li>
    <li>Baja por la lista y toca <strong>Añadir a pantalla de inicio</strong>.</li>
    <li>Toca <strong>Añadir</strong> arriba a la derecha.</li>
</ol>

<p class="instalar-nota">
    En el iPhone solo Safari puede hacerlo: los demás navegadores no
    tienen esa opción.
</p>`;

        dialogo.addEventListener("click", (evento) => {

            // Un clic en el fondo oscuro (el propio <dialog>) la cierra.
            if (
                evento.target === dialogo
                ||
                evento.target.closest(".instalar-cerrar")
            ) {

                dialogo.close();

            }

        });

        document.body.appendChild(dialogo);


        return dialogo;

    }


    function explicarEnSafari() {

        if (!ventana) {

            ventana = crearVentana();

        }

        ventana.showModal();

    }


    /* ==========================================================
       INSTALACIÓN NATIVA
       ========================================================== */

    async function instalar() {

        const peticion = peticionGuardada;

        /*
         * Solo vale una vez: después de usarla, Chrome no la da por
         * buena otra vez y habría que esperar a un beforeinstallprompt
         * nuevo.
         */
        peticionGuardada = null;

        esconderBoton();

        peticion.prompt();


        const respuesta = await peticion.userChoice;

        /*
         * Si dice que no, el botón vuelve: puede cambiar de idea, y
         * Chrome no siempre avisa otra vez.
         */
        if (respuesta && respuesta.outcome !== "accepted") {

            peticionGuardada = peticion;

            RAIZ.dataset.instalable = "nativo";

        }

    }


    /* ==========================================================
       ARRANQUE
       ========================================================== */

    window.addEventListener("beforeinstallprompt", (evento) => {

        /* Sin esto el navegador saca su propio aviso cuando le parece. */
        evento.preventDefault();

        peticionGuardada = evento;

        if (!yaInstalada()) {

            RAIZ.dataset.instalable = "nativo";

        }

    });


    window.addEventListener("appinstalled", () => {

        peticionGuardada = null;

        esconderBoton();

    });


    document.addEventListener("click", (evento) => {

        if (!evento.target.closest("[data-instalar]")) {

            return;

        }


        if (peticionGuardada) {

            instalar();


            return;

        }


        explicarEnSafari();

    });


    if (esSafariDeApple() && !yaInstalada()) {

        RAIZ.dataset.instalable = "safari";

    }

})();

/* Fin de fichero: js/instalar.js */
