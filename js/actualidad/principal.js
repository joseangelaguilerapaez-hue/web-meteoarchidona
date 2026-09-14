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


/* ==========================================================
   REDIMENSIONADO
   ========================================================== */


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


/* ==========================================================
   CABECERA DINÁMICA
   ========================================================== */


function configurarCabeceraDinamica() {

    /*
     * El logotipo Y&Z se monta dinámicamente mediante js/cabecera.js.
     *
     * Cuando la cabecera termina de montarse emite:
     *
     *     cabecera:montada
     *
     * En ese momento se repasan los controles de lluvia para conectar
     * también el logotipo como control GLOBAL de simulación visual.
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


/* ==========================================================
   ACTUALIZACIONES PERIÓDICAS
   ========================================================== */


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


/* ==========================================================
   INICIALIZACIÓN GENERAL
   ========================================================== */


export async function inicializarActualidad() {

    /*
     * El script se carga como type="module".
     *
     * Igual que en Administración, no necesitamos esperar
     * manualmente a DOMContentLoaded: los módulos se ejecutan
     * después de que el documento haya sido analizado.
     */

    const plantillaDisponible =
        capturarPlantillaFichaEstacion();

    if (
        !plantillaDisponible
    ) {

        throw new Error(
            "No se ha encontrado la plantilla base de estaciones de Actualidad."
        );
    }


    const catalogoCargado =
        await cargarCatalogoEstaciones();


    if (
        catalogoCargado
    ) {

        const fichasSincronizadas =
            sincronizarFichasEstaciones();

        if (
            !fichasSincronizadas
        ) {

            throw new Error(
                "No ha sido posible sincronizar las fichas de estaciones."
            );
        }
    }


    /*
     * Si /estaciones falla, api.js conserva el respaldo disponible
     * en el DOM cuando existe.
     *
     * La inicialización visual puede continuar para no dejar
     * bloqueado el resto de Actualidad.
     */

    inicializarLluviaVisual();

    configurarControlesLluvia();

    configurarPatrocinios();

    actualizarSistemaLluvia();


    await cargarCondiciones();


    configurarRedimensionado();

    programarActualizaciones();
}


/* ==========================================================
   ARRANQUE
   ========================================================== */


async function arrancarActualidad() {

    try {

        configurarCabeceraDinamica();

        await inicializarActualidad();

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