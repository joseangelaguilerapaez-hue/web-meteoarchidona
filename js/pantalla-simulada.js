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

        raiz.classList.add(CLASE);

        document.documentElement.classList.add(
            CLASE_DOCUMENTO
        );

        avisarAnfitrion(true);

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

        avisarAnfitrion(false);

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
                ||
                evento.data.tipo !== MENSAJE + ":salir"
            ) {
                return;
            }

            salir();

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
        EVENTO
    };

})();

/* Fin de fichero: js/pantalla-simulada.js */
