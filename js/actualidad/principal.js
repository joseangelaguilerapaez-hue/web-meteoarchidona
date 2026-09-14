"use strict";

/*
 * MeteoArchidona
 * Actualidad
 *
 * Orquestador principal de la página Actualidad.
 *
 * Responsabilidades:
 *
 * - arrancar la arquitectura modular de Actualidad;
 * - capturar la plantilla estructural de estación;
 * - cargar el catálogo público;
 * - sincronizar las fichas dinámicas;
 * - inicializar los efectos visuales de lluvia;
 * - configurar los controles manuales de lluvia;
 * - configurar los controles de patrocinio;
 * - cargar las condiciones meteorológicas;
 * - programar los refrescos periódicos;
 * - actualizar el sistema visual tras cambios de tamaño;
 * - conectar el logotipo Y&Z como control GLOBAL de lluvia de prueba
 *   cuando la cabecera dinámica haya sido montada.
 *
 * Este módulo no contiene lógica meteorológica, lógica HTTP detallada
 * ni construcción interna de fichas. Su función es coordinar los
 * módulos especializados de Actualidad.
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
} from "./estaciones.js";


import {
    actualizarSistemaLluvia,
    generarGotasCristalActivas,
    inicializarLluviaVisual
} from "./efectos-lluvia.js";


import {
    actualizarIndicadorSimulacion,
    configurarControlesLluvia
} from "./simulacion.js";


import {
    configurarPatrocinios
} from "./patrocinios.js";


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
                setTimeout(
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


function configurarCabeceraDinamica() {
    /*
     * El logotipo de Y&Z funciona como mando GLOBAL de la lluvia
     * visual de prueba.
     *
     * El logotipo no pertenece originalmente al documento de
     * Actualidad: js/cabecera.js inserta componentes/cabecera.html
     * dinámicamente.
     *
     * Cuando la cabecera termina de montarse emite
     * "cabecera:montada". En ese momento se repasan los controles
     * para conectar el logotipo recién incorporado.
     */
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


function programarActualizaciones() {
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
    const plantillaDisponible =
        capturarPlantillaFichaEstacion();

    if (
        !plantillaDisponible
    ) {
        console.error(
            "No se ha encontrado una ficha base para construir las estaciones dinámicas."
        );
    }

    const catalogoCargado =
        await cargarCatalogoEstaciones();

    if (
        catalogoCargado
        &&
        plantillaDisponible
    ) {
        sincronizarFichasEstaciones();
    }

    /*
     * Si el catálogo público no estuviera disponible durante el
     * arranque, api.js conserva como respaldo temporal las estaciones
     * presentes originalmente en el HTML.
     *
     * Por ello la inicialización visual continúa aunque la consulta
     * inicial a /estaciones haya fallado.
     */
    inicializarLluviaVisual();

    configurarControlesLluvia();

    configurarPatrocinios();

    actualizarSistemaLluvia();

    await cargarCondiciones();

    configurarRedimensionado();

    programarActualizaciones();
}


configurarCabeceraDinamica();


if (
    document.readyState
    ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        inicializarActualidad,
        {
            once: true
        }
    );

} else {
    inicializarActualidad();
}


// Fin de fichero: js/actualidad/principal.js