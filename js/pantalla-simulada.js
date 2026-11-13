/*
 * ==========================================================
 * PANTALLA COMPLETA SIMULADA · lado del visor
 * ==========================================================
 *
 * Safari del iPhone no permite poner en pantalla completa un
 * elemento cualquiera (Fullscreen API): solo el <video> con su
 * reproductor nativo, que pierde el zoom de pellizco y todo lo
 * que el visor pinta encima. El iPad, Android y los ordenadores
 * sí la tienen.
 *
 * Cuando la API no está disponible, el visor se estira a toda
 * su ventana con la clase .pantalla-simulada y, si está dentro
 * de un iframe, avisa a la página que lo contiene para que
 * estire el iframe a toda la pantalla
 * (js/pantalla-simulada-anfitrion.js).
 *
 * También cubre el caso de un iframe sin permiso de pantalla
 * completa (document.fullscreenEnabled === false).
 *
 * API global: window.PantallaSimulada
 *     nativaDisponible(raiz)  -> true si hay Fullscreen API usable
 *     entrar(raiz) / salir() / alternar(raiz)
 *     activo()                -> elemento en pantalla simulada o null
 *     EVENTO                  -> nombre del evento de cambio
 *                                (se lanza sobre document)
 */

(function () {

    "use strict";


    const CLASE = "pantalla-simulada";

    const CLASE_DOCUMENTO = "con-pantalla-simulada";

    const EVENTO = "pantallasimuladachange";

    const MENSAJE = "meteoarchidona:pantalla-simulada";


    let elemento = null;

    let confirmado = false;


    function nativaDisponible(raiz) {

        const permitida =
            Boolean(
                document.fullscreenEnabled
                ||
                document.webkitFullscreenEnabled
            );

        return (
            permitida
            &&
            Boolean(
                raiz
                &&
                (
                    raiz.requestFullscreen
                    ||
                    raiz.webkitRequestFullscreen
                )
            )
        );

    }



    /*
     * El visor y la página son del mismo sitio, así que el propio
     * visor puede estirar su iframe (window.frameElement) sin
     * depender de que la página tenga cargado
     * js/pantalla-simulada-anfitrion.js (una página antigua en la
     * caché del iPhone no lo tendría). Si no se puede, se pide por
     * postMessage.
     */
    const CLASE_IFRAME = "iframe-pantalla-simulada";

    const Z_MAXIMO = "2147483000";

    let marcoEstirado = null;


    function marcoPropio() {

        try {

            const marco = window.frameElement;

            if (
                marco
                &&
                marco.ownerDocument
                &&
                marco.ownerDocument.defaultView
            ) {
                return marco;
            }

        } catch (error) {

            console.debug(
                "Sin acceso al iframe contenedor.",
                error
            );

        }

        return null;

    }


    function insertarEstilosMarco(doc) {

        if (
            doc.getElementById(
                "estilos-pantalla-simulada"
            )
        ) {
            return;
        }

        const estilos =
            doc.createElement("style");

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

        doc.head.appendChild(estilos);

    }


    function cambiosAntepasado(estilo) {

        const cambios = {};

        const anular = [
            "transform",
            "filter",
            "backdropFilter",
            "webkitBackdropFilter",
            "perspective",
            "contain"
        ];

        for (const propiedad of anular) {

            if (
                estilo[propiedad]
                &&
                estilo[propiedad] !== "none"
            ) {
                cambios[propiedad] = "none";
            }

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

        if (estilo.position !== "static") {
            cambios.zIndex = Z_MAXIMO;
        }

        return cambios;

    }


    function estirarMarco() {

        const marco = marcoPropio();

        if (!marco) {
            return false;
        }

        try {

            const doc = marco.ownerDocument;

            const vista = doc.defaultView;

            insertarEstilosMarco(doc);

            const scroll = vista.scrollY;

            const ajustes = [];

            let nodo = marco.parentElement;

            while (
                nodo
                &&
                nodo !== doc.documentElement
            ) {

                const cambios =
                    cambiosAntepasado(
                        vista.getComputedStyle(nodo)
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

            marco.classList.add(CLASE_IFRAME);

            doc.documentElement.classList.add(
                CLASE_DOCUMENTO
            );

            marcoEstirado = {
                marco,
                doc,
                vista,
                ajustes,
                scroll
            };

            return true;

        } catch (error) {

            console.debug(
                "No se pudo estirar el iframe desde el visor.",
                error
            );

            return false;

        }

    }


    function soltarMarco() {

        if (!marcoEstirado) {
            return false;
        }

        const {
            marco,
            doc,
            vista,
            ajustes,
            scroll
        } = marcoEstirado;

        marcoEstirado = null;

        try {

            marco.classList.remove(CLASE_IFRAME);

            doc.documentElement.classList.remove(
                CLASE_DOCUMENTO
            );

            for (const { nodo, previos } of ajustes) {

                for (const clave of Object.keys(previos)) {

                    nodo.style[clave] =
                        previos[clave];

                }

            }

            vista.scrollTo(0, scroll);

        } catch (error) {

            console.debug(
                "No se pudo devolver el iframe a su sitio.",
                error
            );

        }

        return true;

    }


    function avisarAnfitrion(activa) {

        if (window.parent === window) {
            return;
        }

        try {

            window.parent.postMessage(
                {
                    tipo: MENSAJE,
                    activa
                },
                window.location.origin
            );

        } catch (error) {

            console.debug(
                "No se pudo avisar a la página contenedora.",
                error
            );

        }

    }


    function notificar() {

        document.dispatchEvent(
            new Event(EVENTO)
        );

    }


    function entrar(raiz) {

        if (
            !raiz
            ||
            elemento === raiz
        ) {
            return;
        }

        if (elemento) {
            salir();
        }

        elemento = raiz;

        confirmado = false;

        raiz.classList.add(CLASE);

        document.documentElement.classList.add(
            CLASE_DOCUMENTO
        );

        if (estirarMarco()) {

            confirmado = true;

        } else {

            avisarAnfitrion(true);

        }

        notificar();

    }


    function salir() {

        if (!elemento) {
            return;
        }

        elemento.classList.remove(CLASE);

        elemento = null;

        document.documentElement.classList.remove(
            CLASE_DOCUMENTO
        );

        if (!soltarMarco()) {

            avisarAnfitrion(false);

        }

        notificar();

    }


    function alternar(raiz) {

        if (elemento) {

            salir();

        } else {

            entrar(raiz);

        }

    }


    function activo() {

        return elemento;

    }


    function anfitrionConfirmado() {

        return confirmado;

    }


    document.addEventListener(
        "keydown",
        (evento) => {

            if (
                evento.key === "Escape"
                &&
                elemento
            ) {

                salir();

            }

        }
    );


    /*
     * La página contenedora puede pedir la salida
     * (por ejemplo, con Escape en un ordenador).
     */
    window.addEventListener(
        "message",
        (evento) => {

            if (
                evento.origin !== window.location.origin
                ||
                !evento.data
            ) {
                return;
            }

            if (evento.data.tipo === MENSAJE + ":ok") {

                confirmado = true;

                return;

            }

            if (evento.data.tipo === MENSAJE + ":salir") {

                salir();

            }

        }
    );


    window.addEventListener(
        "pagehide",
        salir
    );


    window.PantallaSimulada = {
        nativaDisponible,
        entrar,
        salir,
        alternar,
        activo,
        anfitrionConfirmado,
        EVENTO
    };

})();

/* Fin de fichero: js/pantalla-simulada.js */
