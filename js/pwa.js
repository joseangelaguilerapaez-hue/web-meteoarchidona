/*
 * MeteoArchidona · Alta del trabajador de servicio
 *
 * Da de alta sw.js, que es lo que permite instalar la web en el
 * teléfono y enseñar algo sin conexión. El trabajador vive en la raíz
 * del sitio porque solo manda sobre lo que cuelga de su carpeta.
 *
 * Se espera a que la página termine de cargar: el alta no corre prisa
 * y no debe quitarle red a los datos de las estaciones, que es lo que
 * el visitante ha venido a ver.
 *
 * En local (servidor.py) no se da de alta. El trabajador guarda copias
 * y mientras se toca el sitio eso solo sirve para enseñar la versión de
 * hace un rato; los navegadores permiten http para localhost, así que
 * sin esta salvedad se activaría también al desarrollar.
 */

(function () {
    "use strict";

    const MAQUINAS_LOCALES = [
        "localhost",
        "127.0.0.1",
        "[::1]",
        ""
    ];


    if (!("serviceWorker" in navigator)) {

        return;

    }


    if (MAQUINAS_LOCALES.includes(window.location.hostname)) {

        return;

    }


    function darDeAlta() {

        navigator.serviceWorker
            .register("/sw.js")
            .catch(error => {

                /*
                 * Que falle no rompe nada: la web funciona igual, solo
                 * que sin instalación ni aviso de sin conexión.
                 */
                console.error(
                    "No se ha podido dar de alta el trabajador de servicio:",
                    error
                );

            });

    }


    if (document.readyState === "complete") {

        darDeAlta();


        return;

    }


    window.addEventListener(
        "load",
        darDeAlta,
        {
            once: true
        }
    );

})();

/* Fin de fichero: js/pwa.js */
