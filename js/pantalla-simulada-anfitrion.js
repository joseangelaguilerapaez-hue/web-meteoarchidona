/*
 * ==========================================================
 * PANTALLA COMPLETA SIMULADA · lado de la página
 * ==========================================================
 *
 * Pareja de js/pantalla-simulada.js. Se carga en todas las
 * páginas (junto a cabecera.js).
 *
 * Cuando un visor incrustado en un iframe del mismo sitio
 * entra en pantalla simulada (iPhone, sin Fullscreen API),
 * esta página estira ese iframe a toda la pantalla y bloquea
 * el desplazamiento de debajo. Al salir lo deja todo como
 * estaba, incluida la posición de scroll.
 *
 * Un antepasado con transform, filter, backdrop-filter,
 * contain, etc. haría que position: fixed se midiera contra
 * él y no contra la pantalla; mientras dura, esas propiedades
 * se anulan en línea y se restauran después.
 */

(function () {

    "use strict";


    const MENSAJE = "meteoarchidona:pantalla-simulada";

    const CLASE_IFRAME = "iframe-pantalla-simulada";

    const CLASE_DOCUMENTO = "con-pantalla-simulada";

    const Z_MAXIMO = "2147483000";


    let actual = null;

    let observador = null;


    function insertarEstilos() {

        if (
            document.getElementById(
                "estilos-pantalla-simulada"
            )
        ) {
            return;
        }

        const estilos =
            document.createElement("style");

        estilos.id =
            "estilos-pantalla-simulada";

        estilos.textContent = `
            html.${CLASE_DOCUMENTO},
            html.${CLASE_DOCUMENTO} body {
                overflow: hidden !important;
                overscroll-behavior: none;
            }

            iframe.${CLASE_IFRAME} {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: auto !important;
                bottom: auto !important;
                width: 100vw !important;
                height: 100vh !important;
                height: 100dvh !important;
                max-width: none !important;
                max-height: none !important;
                margin: 0 !important;
                border: 0 !important;
                border-radius: 0 !important;
                transform: none !important;
                z-index: ${Z_MAXIMO} !important;
                background: #000;
            }
        `;

        document.head.appendChild(estilos);

    }


    function buscarIframe(origen) {

        for (
            const iframe
            of
            document.querySelectorAll("iframe")
        ) {

            if (iframe.contentWindow === origen) {
                return iframe;
            }

        }

        return null;

    }


    function cambiosNecesarios(estilo) {

        const cambios = {};

        if (
            estilo.transform
            &&
            estilo.transform !== "none"
        ) {
            cambios.transform = "none";
        }

        if (
            estilo.filter
            &&
            estilo.filter !== "none"
        ) {
            cambios.filter = "none";
        }

        if (
            estilo.backdropFilter
            &&
            estilo.backdropFilter !== "none"
        ) {
            cambios.backdropFilter = "none";
        }

        if (
            estilo.webkitBackdropFilter
            &&
            estilo.webkitBackdropFilter !== "none"
        ) {
            cambios.webkitBackdropFilter = "none";
        }

        if (
            estilo.perspective
            &&
            estilo.perspective !== "none"
        ) {
            cambios.perspective = "none";
        }

        if (
            estilo.contain
            &&
            estilo.contain !== "none"
        ) {
            cambios.contain = "none";
        }

        if (
            estilo.willChange
            &&
            /transform|filter|perspective/.test(
                estilo.willChange
            )
        ) {
            cambios.willChange = "auto";
        }

        if (
            estilo.containerType
            &&
            estilo.containerType !== "normal"
        ) {
            cambios.containerType = "normal";
        }

        /*
         * Un antepasado posicionado puede formar un contexto de
         * apilamiento por debajo de la cabecera fija.
         */
        if (estilo.position !== "static") {
            cambios.zIndex = Z_MAXIMO;
        }

        return cambios;

    }


    function neutralizarAntepasados(iframe) {

        const ajustes = [];

        let nodo = iframe.parentElement;

        while (
            nodo
            &&
            nodo !== document.documentElement
        ) {

            const cambios =
                cambiosNecesarios(
                    getComputedStyle(nodo)
                );

            const claves =
                Object.keys(cambios);

            if (claves.length) {

                const previos = {};

                for (const clave of claves) {

                    previos[clave] =
                        nodo.style[clave];

                    nodo.style[clave] =
                        cambios[clave];

                }

                ajustes.push({
                    nodo,
                    previos
                });

            }

            nodo = nodo.parentElement;

        }

        return ajustes;

    }


    function activar(iframe) {

        if (
            actual
            &&
            actual.iframe === iframe
        ) {
            return;
        }

        if (actual) {
            desactivar();
        }

        insertarEstilos();

        const scroll = window.scrollY;

        const ajustes =
            neutralizarAntepasados(iframe);

        iframe.classList.add(CLASE_IFRAME);

        document.documentElement.classList.add(
            CLASE_DOCUMENTO
        );

        actual = {
            iframe,
            ajustes,
            scroll
        };

        /*
         * Si el iframe desaparece (cambio de cámara, dashboard que
         * se repinta…), se libera la página.
         */
        observador =
            new MutationObserver(() => {

                if (
                    actual
                    &&
                    !actual.iframe.isConnected
                ) {
                    desactivar();
                }

            });

        observador.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );

    }


    function desactivar() {

        if (!actual) {
            return;
        }

        const {
            iframe,
            ajustes,
            scroll
        } = actual;

        actual = null;

        if (observador) {

            observador.disconnect();

            observador = null;

        }

        iframe.classList.remove(CLASE_IFRAME);

        document.documentElement.classList.remove(
            CLASE_DOCUMENTO
        );

        for (const { nodo, previos } of ajustes) {

            for (const clave of Object.keys(previos)) {

                nodo.style[clave] =
                    previos[clave];

            }

        }

        window.scrollTo(0, scroll);

    }


    window.addEventListener(
        "message",
        (evento) => {

            if (
                evento.origin !== window.location.origin
                ||
                !evento.data
                ||
                evento.data.tipo !== MENSAJE
            ) {
                return;
            }

            const iframe =
                buscarIframe(evento.source);

            if (evento.data.activa) {

                if (iframe) {

                    activar(iframe);

                    try {

                        evento.source.postMessage(
                            {
                                tipo: MENSAJE + ":ok"
                            },
                            window.location.origin
                        );

                    } catch (error) {

                        console.debug(
                            "No se pudo confirmar al visor.",
                            error
                        );

                    }

                }

                return;

            }

            if (
                actual
                &&
                (
                    !iframe
                    ||
                    actual.iframe === iframe
                )
            ) {
                desactivar();
            }

        }
    );


    document.addEventListener(
        "keydown",
        (evento) => {

            if (
                evento.key !== "Escape"
                ||
                !actual
            ) {
                return;
            }

            const iframe = actual.iframe;

            desactivar();

            try {

                iframe.contentWindow.postMessage(
                    {
                        tipo: MENSAJE + ":salir"
                    },
                    window.location.origin
                );

            } catch (error) {

                console.debug(
                    "No se pudo avisar al visor.",
                    error
                );

            }

        }
    );

})();

/* Fin de fichero: js/pantalla-simulada-anfitrion.js */
