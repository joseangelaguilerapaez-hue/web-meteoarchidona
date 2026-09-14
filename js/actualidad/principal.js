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
 * - capturar la plantilla dinámica de estaciones;
 * - cargar y sincronizar el catálogo público;
 * - inicializar efectos visuales y controles;
 * - cargar las condiciones meteorológicas;
 * - reaccionar al redimensionado de la ventana;
 * - programar las actualizaciones periódicas.
 *
 * Todas las dependencias pertenecen a una única generación
 * versionada del grafo modular para evitar mezclar módulos
 * almacenados previamente en caché.
 */


import {
    INTERVALO_CATALOGO_MS,
    INTERVALO_CONDICIONES_MS,
    INTERVALO_GOTAS_CRISTAL_MS,
    estadoActualidad,
    establecerTemporizadorResize
} from "./estado.js?v=20260914-modular2";


import {
    actualizarSistemaLluvia,
    generarGotasCristalActivas,
    inicializarLluviaVisual
} from "./efectos-lluvia.js?v=20260914-modular2";


import {
    actualizarIndicadorSimulacion,
    configurarControlesLluvia
} from "./simulacion.js?v=20260914-modular2";


import {
    configurarPatrocinios
} from "./patrocinios.js?v=20260914-modular2";


import {
    capturarPlantillaFichaEstacion,
    sincronizarFichasEstaciones
} from "./estaciones.js?v=20260914-modular2";


import {
    cargarCatalogoEstaciones,
    cargarCondiciones,
    refrescarCatalogo
} from "./api.js?v=20260914-modular2";


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
                once: true
            }
        );


        /* ==================================================
           PLANTILLA
           ================================================== */

        const plantillaDisponible =
            capturarPlantillaFichaEstacion();

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