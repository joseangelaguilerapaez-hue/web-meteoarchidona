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
 * - utilizar temporalmente la plantilla incrustada si todavía existe;
 * - cargar automáticamente el componente externo cuando se retire;
 * - cargar y sincronizar el catálogo público;
 * - inicializar efectos visuales y controles;
 * - cargar las condiciones meteorológicas;
 * - reaccionar al redimensionado de la ventana;
 * - programar las actualizaciones periódicas.
 *
 * Migración de ficha de estación:
 *
 * Mientras pages/actualidad.html contenga:
 *
 *     <template id="plantilla-estacion">
 *
 * se utilizará esa plantilla antigua.
 *
 * Cuando la retiremos, el arranque cargará automáticamente:
 *
 *     componentes/ficha-estacion.html
 *
 * mediante js/ficha-estacion.js.
 *
 * Esto permite hacer la migración archivo a archivo sin dejar
 * Actualidad en un estado intermedio roto.
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
} from "./estaciones.js?v=20261007-ficha1";


/* ==========================================================
   API
   ========================================================== */


import {
    cargarCatalogoEstaciones,
    cargarCondiciones,
    refrescarCatalogo
} from "./api.js?v=20260914-modular2";


/* ==========================================================
   PLANTILLA DE ESTACIÓN
   ========================================================== */


/*
 * Durante la migración existen dos posibles fuentes:
 *
 * 1. Plantilla antigua incrustada en actualidad.html.
 * 2. Nuevo componente externo ficha-estacion.html.
 *
 * La presencia de la plantilla antigua actúa como interruptor
 * temporal. Cuando desaparezca del HTML no será necesario cambiar
 * nuevamente este archivo.
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
           RESIZE
           ================================================== */

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