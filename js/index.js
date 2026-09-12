/*
 * MeteoArchidona
 * Portada
 *
 * Lógica exclusiva de:
 *
 *     index.html
 *
 * Salió de un <script> al final de esa página. Ahora se carga con
 * defer desde la cabecera, que se ejecuta igual: con el documento ya
 * leído y antes de DOMContentLoaded.
 */

/*
 * MeteoArchidona
 * index.html
 *
 * El index conserva únicamente la lógica común de navegación:
 *
 * - reloj y fecha;
 * - selección de paneles;
 * - hash de navegación;
 * - carga diferida de Observaciones;
 * - comunicación básica con páginas internas cargadas en iframe.
 *
 * Toda la lógica meteorológica de Actualidad pertenece ya a:
 *
 *     js/actualidad.js
 */


/* ==========================================================
   UTILIDADES
   ========================================================== */


function obtenerElemento(
    id
) {

    return document.getElementById(
        id
    );

}


/* ==========================================================
   RELOJ GENERAL
   ========================================================== */


function actualizarReloj() {

    const ahora =
        new Date();


    const fecha =
        obtenerElemento(
            "fecha-actual"
        );


    const reloj =
        obtenerElemento(
            "reloj-actual"
        );


    if (
        fecha
    ) {

        fecha.textContent =
            ahora.toLocaleDateString(
                "es-ES"
            );

    }


    if (
        reloj
    ) {

        reloj.textContent =
            ahora.toLocaleTimeString(
                "es-ES",
                {
                    hour:
                        "2-digit",

                    minute:
                        "2-digit"
                }
            );

    }

}


/* ==========================================================
   CARGA DIFERIDA DE OBSERVACIONES
   ========================================================== */


function cargarPanelObservaciones() {

    const iframe =
        document.querySelector(
            "#panel-observaciones iframe"
        );


    if (
        !iframe
        ||
        iframe.getAttribute(
            "src"
        )
        ||
        !iframe.dataset.src
    ) {

        return;

    }


    requestAnimationFrame(
        () =>
            requestAnimationFrame(
                () => {

                    if (
                        !iframe.getAttribute(
                            "src"
                        )
                    ) {

                        iframe.setAttribute(
                            "src",
                            iframe.dataset.src
                        );

                    }

                }
            )
    );

}


/* ==========================================================
   PUENTE DE NAVEGACIÓN PARA PÁGINAS INTERNAS
   ========================================================== */


function conectarNavegacionIframe(
    iframe
) {

    if (
        !iframe
    ) {

        return;

    }


    iframe.addEventListener(
        "load",
        () => {

            try {

                const documento =
                    iframe.contentDocument;


                if (
                    !documento
                ) {

                    return;

                }


                documento
                    .querySelectorAll(
                        "[data-panel]"
                    )
                    .forEach(
                        control => {

                            control.addEventListener(
                                "click",
                                evento => {

                                    const nombrePanel =
                                        control.dataset.panel;


                                    if (
                                        !nombrePanel
                                    ) {

                                        return;

                                    }


                                    evento.preventDefault();


                                    activarPanel(
                                        nombrePanel
                                    );

                                }
                            );

                        }
                    );

            } catch (
                error
            ) {

                console.warn(
                    "No se pudo conectar la navegación del iframe.",
                    error
                );

            }

        }
    );

}


/* ==========================================================
   ACTIVACIÓN DE PANELES
   ========================================================== */


function activarPanel(
    nombrePanel,
    actualizarHash = true
) {

    const paneles =
        document.querySelectorAll(
            "[data-panel-contenido]"
        );


    const enlaces =
        document.querySelectorAll(
            ".navegacion [data-panel]"
        );


    let encontrado =
        false;


    paneles.forEach(
        panel => {

            const activo =
                panel.dataset
                    .panelContenido
                ===
                nombrePanel;


            panel.classList.toggle(
                "activo",
                activo
            );


            panel.setAttribute(
                "aria-hidden",
                String(
                    !activo
                )
            );


            if (
                activo
            ) {

                encontrado =
                    true;

            }

        }
    );


    if (
        !encontrado
    ) {

        return;

    }


    if (
        nombrePanel
        ===
        "observaciones"
    ) {

        cargarPanelObservaciones();

    }


    enlaces.forEach(
        enlace => {

            const activo =
                enlace.dataset.panel
                ===
                nombrePanel;


            enlace.classList.toggle(
                "activo",
                activo
            );


            if (
                activo
            ) {

                enlace.setAttribute(
                    "aria-current",
                    "page"
                );

            } else {

                enlace.removeAttribute(
                    "aria-current"
                );

            }

        }
    );


    if (
        actualizarHash
    ) {

        history.replaceState(
            null,
            "",
            `#${nombrePanel}`
        );

    }


    window.scrollTo(
        {
            top:
                0,

            behavior:
                "auto"
        }
    );

}


/* ==========================================================
   CONFIGURACIÓN DE NAVEGACIÓN
   ========================================================== */


function configurarPaneles() {

    document
        .querySelectorAll(
            "[data-panel]"
        )
        .forEach(
            control => {

                control.addEventListener(
                    "click",
                    evento => {

                        const nombrePanel =
                            control.dataset.panel;


                        if (
                            !nombrePanel
                        ) {

                            return;

                        }


                        evento.preventDefault();


                        activarPanel(
                            nombrePanel
                        );

                    }
                );

            }
        );


    const hashInicial =
        window.location.hash
            .replace(
                "#",
                ""
            )
            .trim();


    const panelesValidos = [
        "actualidad",
        "observaciones",
        "prediccion",
        "en-vivo"
    ];


    if (
        panelesValidos.includes(
            hashInicial
        )
    ) {

        activarPanel(
            hashInicial,
            false
        );

    } else {

        activarPanel(
            "actualidad",
            false
        );

    }


    window.addEventListener(
        "hashchange",
        () => {

            const nombrePanel =
                window.location.hash
                    .replace(
                        "#",
                        ""
                    )
                    .trim();


            if (
                panelesValidos.includes(
                    nombrePanel
                )
            ) {

                activarPanel(
                    nombrePanel,
                    false
                );

            }

        }
    );

}


/* ==========================================================
   CONFIGURACIÓN DE IFRAMES
   ========================================================== */


function configurarPuentesIframes() {

    document
        .querySelectorAll(
            "iframe[data-puente-paneles]"
        )
        .forEach(
            iframe => {

                conectarNavegacionIframe(
                    iframe
                );

            }
        );

}


/* ==========================================================
   INICIALIZACIÓN
   ========================================================== */


actualizarReloj();


window.setInterval(
    actualizarReloj,
    30000
);


configurarPuentesIframes();


configurarPaneles();




// Fin de fichero: js/index.js
