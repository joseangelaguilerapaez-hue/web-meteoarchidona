"use strict";

/*
 * MeteoArchidona
 * Actualidad
 *
 * Orquestador temporal de diagnóstico de la arquitectura modular.
 *
 * Este fichero carga los módulos uno a uno mediante import() para
 * identificar con precisión cualquier error de carga o evaluación.
 *
 * Todas las dependencias de la arquitectura modular utilizan una
 * única versión común para evitar mezclar generaciones distintas
 * del grafo de módulos ES.
 *
 * Cuando el diagnóstico quede resuelto, volveremos al orquestador
 * definitivo con imports estáticos.
 */


function mostrarErrorDiagnostico(
    modulo,
    error
) {
    console.error(
        `Error cargando módulo ${modulo}:`,
        error
    );

    let panel =
        document.getElementById(
            "diagnostico-actualidad-modulos"
        );

    if (
        !panel
    ) {
        panel =
            document.createElement(
                "div"
            );

        panel.id =
            "diagnostico-actualidad-modulos";

        panel.style.position =
            "fixed";

        panel.style.left =
            "12px";

        panel.style.right =
            "12px";

        panel.style.top =
            "12px";

        panel.style.zIndex =
            "999999";

        panel.style.padding =
            "14px";

        panel.style.background =
            "#300";

        panel.style.color =
            "#fff";

        panel.style.border =
            "2px solid #f66";

        panel.style.borderRadius =
            "8px";

        panel.style.fontFamily =
            "monospace";

        panel.style.fontSize =
            "13px";

        panel.style.whiteSpace =
            "pre-wrap";

        panel.style.wordBreak =
            "break-word";

        document.body.appendChild(
            panel
        );
    }

    panel.textContent =
        `Fallo modular en Actualidad\n\n`
        +
        `Módulo: ${modulo}\n\n`
        +
        `Error: ${
            error?.message
            ||
            String(
                error
            )
        }`;
}


async function importarModulo(
    nombre,
    ruta
) {
    try {
        return await import(
            ruta
        );

    } catch (
        error
    ) {
        mostrarErrorDiagnostico(
            nombre,
            error
        );

        throw error;
    }
}


/* ==========================================================
   ARRANQUE
   ========================================================== */


async function arrancarActualidad() {

    try {

        /*
         * Cargamos primero los módulos base y después sus dependientes.
         *
         * Todo el grafo utiliza la misma versión modular2.
         *
         * De esta forma evitamos que una dependencia interna pueda
         * recuperar desde caché una generación anterior del módulo.
         */

        const estado =
            await importarModulo(
                "estado.js",
                "./estado.js?v=20260914-modular2"
            );

        await importarModulo(
            "dom.js",
            "./dom.js?v=20260914-modular2"
        );

        await importarModulo(
            "viento.js",
            "./viento.js?v=20260914-modular2"
        );

        await importarModulo(
            "lluvia.js",
            "./lluvia.js?v=20260914-modular2"
        );

        const efectosLluvia =
            await importarModulo(
                "efectos-lluvia.js",
                "./efectos-lluvia.js?v=20260914-modular2"
            );

        const simulacion =
            await importarModulo(
                "simulacion.js",
                "./simulacion.js?v=20260914-modular2"
            );

        const patrocinios =
            await importarModulo(
                "patrocinios.js",
                "./patrocinios.js?v=20260914-modular2"
            );

        const estaciones =
            await importarModulo(
                "estaciones.js",
                "./estaciones.js?v=20260914-modular2"
            );

        await importarModulo(
            "meteorologia.js",
            "./meteorologia.js?v=20260914-modular2"
        );

        const api =
            await importarModulo(
                "api.js",
                "./api.js?v=20260914-modular2"
            );


        /* ==================================================
           CABECERA DINÁMICA
           ================================================== */

        document.addEventListener(
            "cabecera:montada",
            () => {

                simulacion
                    .configurarControlesLluvia();

                simulacion
                    .actualizarIndicadorSimulacion(
                        "GLOBAL"
                    );
            },
            {
                once: true
            }
        );


        /* ==================================================
           PLANTILLA
           ================================================== */

        const plantillaDisponible =
            estaciones
                .capturarPlantillaFichaEstacion();

        if (
            !plantillaDisponible
        ) {
            throw new Error(
                "No se ha encontrado la plantilla base de estaciones."
            );
        }


        /* ==================================================
           CATÁLOGO
           ================================================== */

        const catalogoCargado =
            await api
                .cargarCatalogoEstaciones();

        if (
            catalogoCargado
        ) {
            const sincronizado =
                estaciones
                    .sincronizarFichasEstaciones();

            if (
                !sincronizado
            ) {
                throw new Error(
                    "El catálogo se cargó pero no fue posible crear las fichas."
                );
            }
        }


        /* ==================================================
           EFECTOS Y CONTROLES
           ================================================== */

        efectosLluvia
            .inicializarLluviaVisual();

        simulacion
            .configurarControlesLluvia();

        patrocinios
            .configurarPatrocinios();

        efectosLluvia
            .actualizarSistemaLluvia();


        /* ==================================================
           CONDICIONES
           ================================================== */

        await api
            .cargarCondiciones();


        /* ==================================================
           RESIZE
           ================================================== */

        window.addEventListener(
            "resize",
            () => {

                if (
                    estado
                        .estadoActualidad
                        .temporizadorResize
                    !==
                    null
                ) {
                    clearTimeout(
                        estado
                            .estadoActualidad
                            .temporizadorResize
                    );
                }

                estado
                    .establecerTemporizadorResize(
                        window.setTimeout(
                            () => {

                                efectosLluvia
                                    .actualizarSistemaLluvia();

                                estado
                                    .establecerTemporizadorResize(
                                        null
                                    );
                            },
                            180
                        )
                    );
            }
        );


        /* ==================================================
           INTERVALOS
           ================================================== */

        window.setInterval(
            api.cargarCondiciones,
            estado.INTERVALO_CONDICIONES_MS
        );

        window.setInterval(
            api.refrescarCatalogo,
            estado.INTERVALO_CATALOGO_MS
        );

        window.setInterval(
            efectosLluvia.generarGotasCristalActivas,
            estado.INTERVALO_GOTAS_CRISTAL_MS
        );


    } catch (
        error
    ) {

        if (
            !document.getElementById(
                "diagnostico-actualidad-modulos"
            )
        ) {
            mostrarErrorDiagnostico(
                "arranque general",
                error
            );
        }

        console.error(
            "No ha sido posible iniciar Actualidad.",
            error
        );
    }
}


void arrancarActualidad();


// Fin de fichero: js/actualidad/principal.js