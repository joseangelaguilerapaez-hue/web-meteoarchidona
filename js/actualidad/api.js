"use strict";

/*
 * MeteoArchidona
 * Actualidad
 *
 * Acceso a la API pública de MeteoArchidona.
 *
 * Responsabilidades:
 *
 * - cargar el catálogo público de estaciones;
 * - cargar las condiciones actuales de una estación;
 * - cargar las condiciones de todas las estaciones con ficha;
 * - refrescar el catálogo y sincronizar las fichas;
 * - coordinar los errores de consulta con la representación visual;
 * - utilizar window.API_BASE, publicado por js/api.js.
 *
 * Este módulo no realiza el bootstrap general de Actualidad.
 * Los intervalos, eventos globales y demás tareas de inicialización
 * corresponden a principal.js.
 */


import {
    estadoActualidad
} from "./estado.js?v=20260914-modular2";


import {
    crearEstadoInicialEstacion,
    establecerCatalogoEstaciones,
    establecerCatalogoDesdeDom,
    estacionTieneFicha,
    obtenerCodigosConFicha,
    sincronizarFichasEstaciones
} from "./estaciones.js?v=20260914-modular2";


import {
    inicializarLluviaVisualEstacion
} from "./efectos-lluvia.js?v=20260914-modular2";


import {
    mostrarDatosEstacion,
    mostrarErrorEstacion
} from "./meteorologia.js?v=20260914-modular2";


function obtenerApiBase() {
    const apiBase =
        String(
            window.API_BASE
            ||
            ""
        )
            .trim()
            .replace(
                /\/+$/,
                ""
            );

    if (
        !apiBase
    ) {
        throw new Error(
            "window.API_BASE no está definido. Debe cargarse js/api.js antes de Actualidad."
        );
    }

    return apiBase;
}


export async function cargarCatalogoEstaciones() {
    try {
        const respuesta =
            await fetch(
                `${obtenerApiBase()}/estaciones`,
                {
                    cache: "no-store"
                }
            );

        if (
            !respuesta.ok
        ) {
            throw new Error(
                `HTTP ${respuesta.status}`
            );
        }

        const datos =
            await respuesta.json();

        if (
            !datos
            ||
            !Array.isArray(
                datos.estaciones
            )
        ) {
            throw new Error(
                "Respuesta de catálogo de estaciones no válida."
            );
        }

        establecerCatalogoEstaciones(
            datos.estaciones
        );

        return true;

    } catch (
        error
    ) {
        console.error(
            "Error cargando catálogo público de estaciones:",
            error
        );

        /*
         * Si todavía no existe un catálogo válido, se utilizan como
         * respaldo temporal las estaciones que ya estuvieran presentes
         * en el HTML.
         *
         * Esto conserva el comportamiento anterior y permite que
         * Actualidad siga intentando cargar condiciones aunque falle
         * momentáneamente /estaciones.
         */
        if (
            estadoActualidad
                .codigosEstacion
                .length
            ===
            0
        ) {
            establecerCatalogoDesdeDom();
        }

        return false;
    }
}


export async function cargarEstacion(
    codigo
) {
    if (
        !estacionTieneFicha(
            codigo
        )
    ) {
        return false;
    }

    crearEstadoInicialEstacion(
        codigo
    );

    inicializarLluviaVisualEstacion(
        codigo
    );

    try {
        const respuesta =
            await fetch(
                `${
                    obtenerApiBase()
                }/condiciones-actuales/${
                    encodeURIComponent(
                        codigo
                    )
                }`,
                {
                    cache: "no-store"
                }
            );

        if (
            !respuesta.ok
        ) {
            throw new Error(
                `HTTP ${respuesta.status}`
            );
        }

        const datos =
            await respuesta.json();

        mostrarDatosEstacion(
            codigo,
            datos
        );

        return true;

    } catch (
        error
    ) {
        console.error(
            `Error cargando ${codigo}:`,
            error
        );

        mostrarErrorEstacion(
            codigo
        );

        return false;
    }
}


export async function cargarCondiciones() {
    const codigos =
        obtenerCodigosConFicha();

    if (
        codigos.length
        ===
        0
    ) {
        return [];
    }

    return Promise.all(
        codigos.map(
            codigo =>
                cargarEstacion(
                    codigo
                )
        )
    );
}


export async function refrescarCatalogo() {
    const cargado =
        await cargarCatalogoEstaciones();

    if (
        cargado
    ) {
        sincronizarFichasEstaciones();
    }

    /*
     * Aunque el refresco del catálogo falle, se vuelven a consultar
     * las condiciones de las fichas que sigan disponibles.
     *
     * De esta forma un fallo temporal de /estaciones no interrumpe
     * innecesariamente la actualización meteorológica.
     */
    await cargarCondiciones();

    return cargado;
}


// Fin de fichero: js/actualidad/api.js