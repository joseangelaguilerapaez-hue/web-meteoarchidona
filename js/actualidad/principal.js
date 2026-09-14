"use strict";

/*
 * MeteoArchidona
 * Actualidad
 *
 * Orquestador principal de la arquitectura modular de Actualidad.
 *
 * Responsabilidades:
 *
 * - inicializar los módulos de la página;
 * - capturar la plantilla dinámica de estaciones;
 * - cargar y sincronizar el catálogo público;
 * - cargar las condiciones meteorológicas;
 * - inicializar efectos visuales y controles;
 * - configurar eventos globales;
 * - programar las actualizaciones periódicas.
 *
 * El diagnóstico temporal utilizado durante la modularización
 * ha sido retirado una vez estabilizada la carga de los módulos.
 */


import {
    INTERVALO_CATALOGO_MS,
    INTERVALO_CONDICIONES_MS,
    INTERVALO_GOTAS_CRISTAL_MS,
    estadoActualidad,
    establecerTemporizadorResize
} from "./estado.js";


import {
    cargarCatalogoEstaciones,
    cargarCondiciones,
    refrescarCatalogo
} from "./api.js";


import {
    capturarPlantillaFichaEstacion,
    sincronizarFichasEstaciones
} from "./estaciones.js?v=20260914-estaciones1";


import {
    actualizarSistemaLluvia,
    generarGotasCristalActivas,
    inicializarLluviaVisual
} from "./efectos-lluvia.js?v=20260914-diagnostico2";


import {
    actualizarIndicadorSimulacion,
    configurarControlesLluvia
} from "./simulacion.js?v=20260914-diagnostico3";


import {
    configurarPatrocinios
} from "./patrocinios.js";


function configurarCabeceraDinamica() {
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
}


function configurarRedimensionado() {
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
}


function configurarIntervalos() {
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
}


export async function inicializarActualidad() {
    configurarCabeceraDinamica();

    const plantillaDisponible =
        capturarPlantillaFichaEstacion();

    if (
        !plantillaDisponible
    ) {
        throw new Error(
            "No se ha encontrado la plantilla base de estaciones."
        );
    }

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

    inicializarLluviaVisual();

    configurarControlesLluvia();

    configurarPatrocinios();

    actualizarSistemaLluvia();

    await cargarCondiciones();

    configurarRedimensionado();

    configurarIntervalos();
}


void inicializarActualidad()
    .catch(
        error => {
            console.error(
                "No ha sido posible iniciar Actualidad.",
                error
            );
        }
    );


// Fin de fichero: js/actualidad/principal.js