"use strict";

/*
 * MeteoArchidona
 * Actualidad
 *
 * Orquestador principal de la página Actualidad.
 *
 * Responsabilidades:
 *
 * - coordinar el arranque de los módulos de Actualidad;
 * - cargar el componente reutilizable de ficha de estación;
 * - cargar y sincronizar el catálogo público;
 * - inicializar efectos visuales y controles;
 * - cargar las condiciones meteorológicas;
 * - recalcular la disposición de las fichas al cambiar el ancho;
 * - programar las actualizaciones periódicas.
 */


/* ==========================================================
   ESTADO
   ========================================================== */


import {
    INTERVALO_CATALOGO_MS,
    INTERVALO_CONDICIONES_MS,
    INTERVALO_GOTAS_CRISTAL_MS,
    estadoActualidad,
    establecerTemporizadorResize
} from "./estado.js?v=20260914-modular2";


/* ==========================================================
   LLUVIA VISUAL
   ========================================================== */


import {
    actualizarSistemaLluvia,
    generarGotasCristalActivas,
    inicializarLluviaVisual
} from "./efectos-lluvia.js?v=20260914-modular2";


/* ==========================================================
   SIMULACIÓN
   ========================================================== */


import {
    actualizarIndicadorSimulacion,
    configurarControlesLluvia
} from "./simulacion.js?v=20260914-modular2";


/* ==========================================================
   PATROCINIOS
   ========================================================== */


import {
    configurarPatrocinios
} from "./patrocinios.js?v=20260914-modular2";


/* ==========================================================
   ESTACIONES
   ========================================================== */


import {
    cargarPlantillaFichaEstacion,
    capturarPlantillaFichaEstacion,
    sincronizarFichasEstaciones
} from "./estaciones.js?v=20261007-ficha5";


/* ==========================================================
   API
   ========================================================== */


import {
    cargarCatalogoEstaciones,
    cargarCondiciones,
    refrescarCatalogo
} from "./api.js?v=20261007-ficha5";


/* ==========================================================
   PLANTILLA DE ESTACIÓN
   ========================================================== */


/*
 * La vía normal es el componente externo:
 *
 *     componentes/ficha-estacion.html
 *
 * Se conserva la detección de una plantilla incrustada como
 * compatibilidad defensiva durante la transición.
 */
async function prepararPlantillaEstaciones() {

    const plantillaIncrustada =
        document.getElementById(
            "plantilla-estacion"
        );


    if (
        plantillaIncrustada
        &&
        plantillaIncrustada.tagName
        ===
        "TEMPLATE"
    ) {

        return capturarPlantillaFichaEstacion();

    }


    return await cargarPlantillaFichaEstacion();

}


/* ==========================================================
   REDIMENSIONAMIENTO
   ========================================================== */


function configurarRedimensionamiento() {

    window.addEventListener(
        "resize",
        () => {

            if (
                estadoActualidad
                    .temporizadorResize
                !==
                null
            ) {

                clearTimeout(
                    estadoActualidad
                        .temporizadorResize
                );

            }


            establecerTemporizadorResize(
                window.setTimeout(
                    () => {

                        /*
                         * sincronizarFichasEstaciones() recalcula también
                         * el modo vertical/horizontal de cada ficha.
                         *
                         * Esto es necesario para que:
                         *
                         * - escritorio con número impar:
                         *     última ficha horizontal;
                         *
                         * - móvil / una sola columna:
                         *     todas las fichas verticales.
                         *
                         * sincronizarFichasEstaciones() ya no mueve
                         * fichas existentes dentro del DOM, de modo que
                         * un resize provocado al entrar en fullscreen
                         * no desmonta ni vuelve a insertar el iframe.
                         */
                        sincronizarFichasEstaciones();


                        actualizarSistemaLluvia();


                        establecerTemporizadorResize(
                            null
                        );

                    },
                    180
                )
            );

        }
    );

}


/* ==========================================================
   ARRANQUE
   ========================================================== */


async function arrancarActualidad() {

    try {

        /* ==================================================
           CABECERA DINÁMICA
           ================================================== */

        document.addEventListener(
            "cabecera:montada",
            () => {

                configurarControlesLluvia();


                actualizarIndicadorSimulacion(
                    "GLOBAL"
                );

            },
            {
                once:
                    true
            }
        );


        /* ==================================================
           PLANTILLA
           ================================================== */

        const plantillaDisponible =
            await prepararPlantillaEstaciones();


        if (
            !plantillaDisponible
        ) {

            throw new Error(
                "No se ha podido preparar la plantilla de estaciones."
            );

        }


        /* ==================================================
           CATÁLOGO
           ================================================== */

        const catalogoCargado =
            await cargarCatalogoEstaciones();


        if (
            catalogoCargado
        ) {

            const sincronizado =
                sincronizarFichasEstaciones();


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

        inicializarLluviaVisual();


        configurarControlesLluvia();


        configurarPatrocinios();


        actualizarSistemaLluvia();


        /* ==================================================
           CONDICIONES
           ================================================== */

        await cargarCondiciones();


        /* ==================================================
           RESPONSIVE
           ================================================== */

        configurarRedimensionamiento();


        /* ==================================================
           INTERVALOS
           ================================================== */

        window.setInterval(
            cargarCondiciones,
            INTERVALO_CONDICIONES_MS
        );


        window.setInterval(
            refrescarCatalogo,
            INTERVALO_CATALOGO_MS
        );


        window.setInterval(
            generarGotasCristalActivas,
            INTERVALO_GOTAS_CRISTAL_MS
        );


    } catch (
        error
    ) {

        console.error(
            "No ha sido posible iniciar Actualidad.",
            error
        );

    }

}


void arrancarActualidad();


// Fin de fichero: js/actualidad/principal.js