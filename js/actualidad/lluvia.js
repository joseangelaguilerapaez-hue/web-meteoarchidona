"use strict";

/*
 * MeteoArchidona
 * Actualidad
 *
 * Clasificación y representación de lluvia.
 *
 * Responsabilidades:
 *
 * - clasificar la intensidad de lluvia a partir de la tasa;
 * - seleccionar el icono correspondiente;
 * - obtener el nivel efectivo entre lluvia real y simulación visual;
 * - representar los datos de precipitación de una estación;
 * - representar el estado de error de precipitación.
 *
 * Este módulo no crea efectos gráficos de lluvia.
 * Los efectos visuales pertenecen a efectos-lluvia.js.
 *
 * La simulación incluida en estadoActualidad.lluviaSimulada es
 * exclusivamente una simulación VISUAL de la web y no debe
 * confundirse con estaciones cuyo estado funcional sea
 * DATOS_SIMULADOS.
 */


import {
    NOMBRES_NIVEL_LLUVIA,
    estadoActualidad
} from "./estado.js?v=20260914-modular2";


import {
    asignarTexto,
    formatearNumero
} from "./dom.js?v=20260914-modular2";


function asegurarEstadoLluviaEstacion(
    codigo
) {
    if (
        !Object.prototype.hasOwnProperty.call(
            estadoActualidad
                .lluviaReal,
            codigo
        )
    ) {
        estadoActualidad
            .lluviaReal[
                codigo
            ] =
            0;
    }

    if (
        !Object.prototype.hasOwnProperty.call(
            estadoActualidad
                .lluviaSimulada,
            codigo
        )
    ) {
        estadoActualidad
            .lluviaSimulada[
                codigo
            ] =
            0;
    }
}


export function nivelLluviaDesdeTasa(
    tasa
) {
    if (
        tasa === null
        ||
        tasa === undefined
        ||
        Number.isNaN(
            Number(
                tasa
            )
        )
    ) {
        return 0;
    }

    const valor =
        Number(
            tasa
        );

    if (
        valor <= 0
    ) {
        return 0;
    }

    if (
        valor < 0.5
    ) {
        return 1;
    }

    if (
        valor < 2
    ) {
        return 2;
    }

    if (
        valor < 10
    ) {
        return 3;
    }

    return 4;
}


export function obtenerIconoLluvia(
    nivel
) {
    if (
        nivel <= 0
    ) {
        return "☁️";
    }

    if (
        nivel === 1
    ) {
        return "🌦️";
    }

    if (
        nivel === 4
    ) {
        return "⛈️";
    }

    return "🌧️";
}


export function obtenerNivelEfectivo(
    codigo
) {
    asegurarEstadoLluviaEstacion(
        codigo
    );

    return Math.max(
        estadoActualidad
            .lluviaReal[
                codigo
            ]
        ||
        0,

        estadoActualidad
            .lluviaSimulada[
                codigo
            ]
        ||
        0
    );
}


export function mostrarLluvia(
    codigo,
    datos
) {
    asegurarEstadoLluviaEstacion(
        codigo
    );

    const dia =
        formatearNumero(
            datos.lluvia_dia_mm
        );

    const mes =
        formatearNumero(
            datos.lluvia_mes_mm
        );

    const anio =
        formatearNumero(
            datos.lluvia_anio_agricola_mm
        );

    const tasa =
        formatearNumero(
            datos.tasa_lluvia_mm_h
        );

    const nivel =
        nivelLluviaDesdeTasa(
            datos.tasa_lluvia_mm_h
        );

    const icono =
        obtenerIconoLluvia(
            nivel
        );

    estadoActualidad
        .lluviaReal[
            codigo
        ] =
        nivel;

    asignarTexto(
        `lluvia-tasa-${codigo}`,
        `${tasa} mm/h`
    );

    asignarTexto(
        `lluvia-dia-${codigo}`,
        `${dia} mm`
    );

    asignarTexto(
        `lluvia-mes-${codigo}`,
        `${mes} mm`
    );

    asignarTexto(
        `lluvia-anio-${codigo}`,
        `${anio} mm`
    );

    asignarTexto(
        `lluvia-estado-${codigo}`,
        NOMBRES_NIVEL_LLUVIA[
            nivel
        ]
    );

    asignarTexto(
        `lluvia-icono-actual-${codigo}`,
        icono
    );

    asignarTexto(
        `lluvia-resumen-icono-dia-${codigo}`,
        icono
    );

    asignarTexto(
        `lluvia-resumen-icono-mes-${codigo}`,
        icono
    );

    asignarTexto(
        `lluvia-resumen-icono-anio-${codigo}`,
        icono
    );
}


export function mostrarErrorLluvia(
    codigo
) {
    asegurarEstadoLluviaEstacion(
        codigo
    );

    estadoActualidad
        .lluviaReal[
            codigo
        ] =
        0;

    asignarTexto(
        `lluvia-tasa-${codigo}`,
        "-- mm/h"
    );

    asignarTexto(
        `lluvia-dia-${codigo}`,
        "-- mm"
    );

    asignarTexto(
        `lluvia-mes-${codigo}`,
        "-- mm"
    );

    asignarTexto(
        `lluvia-anio-${codigo}`,
        "-- mm"
    );

    asignarTexto(
        `lluvia-estado-${codigo}`,
        "--"
    );

    asignarTexto(
        `lluvia-icono-actual-${codigo}`,
        "☁️"
    );

    asignarTexto(
        `lluvia-resumen-icono-dia-${codigo}`,
        "☁️"
    );

    asignarTexto(
        `lluvia-resumen-icono-mes-${codigo}`,
        "☁️"
    );

    asignarTexto(
        `lluvia-resumen-icono-anio-${codigo}`,
        "☁️"
    );
}


// Fin de fichero: js/actualidad/lluvia.js