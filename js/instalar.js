/*
 * MeteoArchidona · Botón de instalar del pie
 *
 * Regla de la casa: el botón nunca se queda callado. Si puede abrir el
 * diálogo del sistema, lo abre; si no puede, explica dónde está la
 * opción en ese navegador. Lo que no hace nunca es no hacer nada.
 *
 * Por qué hace falta la explicación, y no basta el diálogo:
 *
 * - El aviso que mandan Chrome, Edge y Samsung (beforeinstallprompt)
 *   SOLO SIRVE UNA VEZ. Si el visitante cierra el diálogo sin instalar,
 *   ese aviso queda gastado: volver a usarlo lanza un error y el botón
 *   parecería roto. Hasta que el navegador mande uno nuevo —y puede
 *   tardar días— solo queda explicar.
 * - Safari del iPhone no deja pedirlo desde la página: la opción está
 *   en su menú de compartir y punto.
 * - Chrome y Firefox del iPhone ni siquiera tienen esa opción.
 *
 * El botón se esconde con CSS: el pie lo monta js/cabecera.js por su
 * cuenta y aquí no se sabe si existe todavía. Este script pone
 * data-instalable en <html> y manda css/pie.css. El clic se atiende por
 * delegación en document, por lo mismo.
 *
 * Quien ya la tiene instalada no ve el botón.
 */

(function () {
    "use strict";

    const RAIZ = document.documentElement;

    /* El aviso de Chrome, mientras esté sin gastar. */
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


    /* ==========================================================
       QUÉ NAVEGADOR ES
       ========================================================== */

    const AGENTE = window.navigator.userAgent;


    function esDeApple() {

        return (
            /iPhone|iPod/.test(AGENTE)
            ||
            // El iPad moderno se hace pasar por Mac: se le reconoce
            // porque es el único «Mac» con pantalla táctil.
            (/Macintosh/.test(AGENTE) && navigator.maxTouchPoints > 1)
        );

    }


    /*
     * Qué explicación toca. Es lo único que decide qué ve el visitante
     * cuando no hay diálogo del sistema que abrir.
     */
    function familia() {

        if (esDeApple()) {

            /* CriOS es Chrome; FxiOS, Firefox; EdgiOS, Edge; OPiOS, Opera. */
            return /CriOS|FxiOS|EdgiOS|OPiOS/.test(AGENTE)
                ? "ios-otro"
                : "ios-safari";

        }

        if (/SamsungBrowser/.test(AGENTE)) {

            return "samsung";

        }

        if (/Firefox/.test(AGENTE)) {

            return "firefox";

        }

        if (/Edg\//.test(AGENTE)) {

            return "edge";

        }

        if (/Chrome|Chromium|CrMo/.test(AGENTE)) {

            return "chrome";

        }

        return "otro";

    }


    const FAMILIA = familia();

    const ES_MOVIL = /Android|iPhone|iPod|Mobile/.test(AGENTE);


    /*
     * Quién puede instalar de alguna manera, aunque sea a mano. A los
     * demás no se les enseña el botón: no hay nada que contarles.
     */
    const PUEDE_INSTALAR = [
        "ios-safari",
        "samsung",
        "edge",
        "chrome"
    ].includes(FAMILIA);


    /* ==========================================================
       PASOS, POR NAVEGADOR
       ========================================================== */

    const PASOS = {
        "ios-safari": {
            titulo: "Instalar en tu iPhone",
            pasos: [
                "Toca <strong>Compartir</strong>, el cuadrado con la flecha hacia arriba, abajo en la barra de Safari.",
                "Baja por la lista y toca <strong>Añadir a pantalla de inicio</strong>.",
                "Toca <strong>Añadir</strong> arriba a la derecha."
            ],
            nota: "En el iPhone solo Safari puede hacerlo: los demás navegadores no tienen esa opción."
        },
        samsung: {
            titulo: "Instalar en tu móvil",
            pasos: [
                "Toca el <strong>menú</strong> (las tres rayas, abajo a la derecha).",
                "Toca <strong>Añadir página a</strong> y después <strong>Pantalla de inicio</strong>.",
                "Confirma con <strong>Añadir</strong>."
            ],
            nota: null
        },
        chrome: {
            titulo: "Instalar en tu móvil",
            pasos: [
                "Toca el <strong>menú</strong> de Chrome (los tres puntos, arriba a la derecha).",
                "Toca <strong>Añadir a pantalla de inicio</strong> o <strong>Instalar aplicación</strong>.",
                "Confirma con <strong>Instalar</strong>."
            ],
            nota: "Si hace un momento cerraste el aviso de instalar, Chrome tarda en volver a ofrecerlo. Desde el menú se puede siempre."
        },
        edge: {
            titulo: "Instalar la aplicación",
            pasos: [
                "Abre el <strong>menú</strong> de Edge (los tres puntos).",
                "Entra en <strong>Aplicaciones</strong> y toca <strong>Instalar este sitio como aplicación</strong>.",
                "Confirma con <strong>Instalar</strong>."
            ],
            nota: null
        }
    };


    /* En el ordenador, Chrome lo tiene en la barra de direcciones. */
    const PASOS_ESCRITORIO = {
        titulo: "Instalar la aplicación",
        pasos: [
            "Mira al final de la barra de direcciones: hay un icono de <strong>instalar</strong> (una pantalla con una flecha).",
            "Si no está, abre el <strong>menú</strong> del navegador (los tres puntos) y busca <strong>Instalar MeteoArchidona</strong>.",
            "Confirma con <strong>Instalar</strong>."
        ],
        nota: "Se abrirá en su propia ventana, sin barra del navegador."
    };


    function textosDePasos() {

        if (!ES_MOVIL && (FAMILIA === "chrome" || FAMILIA === "edge")) {

            return PASOS_ESCRITORIO;

        }

        return PASOS[FAMILIA] || PASOS_ESCRITORIO;

    }


    /* ==========================================================
       VENTANA DE PASOS
       ========================================================== */

    function crearVentana() {

        const dialogo = document.createElement("dialog");

        dialogo.className = "instalar-ventana";

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


    function explicar() {

        const textos = textosDePasos();

        if (!ventana) {

            ventana = crearVentana();

        }

        ventana.innerHTML = `
<header class="instalar-ventana-cabecera">
    <h2>${textos.titulo}</h2>
    <button type="button" class="instalar-cerrar" aria-label="Cerrar">&times;</button>
</header>

<ol class="instalar-pasos">
${textos.pasos.map(paso => `    <li>${paso}</li>`).join("\n")}
</ol>
${textos.nota ? `\n<p class="instalar-nota">${textos.nota}</p>` : ""}`;

        /*
         * showModal falta en navegadores viejos. Sin él, al menos que se
         * vea la ventana en vez de no pasar nada.
         */
        if (typeof ventana.showModal === "function") {

            ventana.showModal();


            return;

        }

        ventana.setAttribute("open", "");

    }


    /* ==========================================================
       DIÁLOGO DEL SISTEMA
       ========================================================== */

    async function instalar(peticion) {

        /*
         * Gastado queda, se use bien o mal: volver a llamar a prompt()
         * lanza InvalidStateError. Por eso se suelta antes de usarlo.
         */
        peticionGuardada = null;

        try {

            peticion.prompt();

        } catch (error) {

            /* Ya estaba gastado: se explica a mano, que es lo que queda. */
            RAIZ.dataset.instalable = "manual";

            explicar();


            return;

        }


        const respuesta = await peticion.userChoice.catch(() => null);

        if (respuesta && respuesta.outcome === "accepted") {

            delete RAIZ.dataset.instalable;


            return;

        }

        /*
         * Ha dicho que no, o ha cerrado el diálogo. El botón se queda,
         * pero ya solo puede explicar: el aviso está gastado y el
         * navegador tardará en mandar otro.
         */
        RAIZ.dataset.instalable = "manual";

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

        delete RAIZ.dataset.instalable;

    });


    document.addEventListener("click", (evento) => {

        if (!evento.target.closest("[data-instalar]")) {

            return;

        }


        if (peticionGuardada) {

            instalar(peticionGuardada);


            return;

        }


        explicar();

    });


    if (PUEDE_INSTALAR && !yaInstalada()) {

        RAIZ.dataset.instalable = "manual";

    }

})();

/* Fin de fichero: js/instalar.js */
