"use strict";

/*
 * MeteoArchidona
 * Actualidad
 *
 * Lógica meteorológica y visual del viento.
 *
 * Responsabilidades:
 *
 * - normalizar direcciones meteorológicas;
 * - convertir grados a dirección cardinal;
 * - actualizar la veleta de una estación;
 * - conservar el viento actual de cada estación;
 * - calcular el movimiento visual de la lluvia según el viento;
 * - determinar el viento dominante utilizado por los efectos
 *   meteorológicos globales.
 *
 * Este módulo no obtiene datos de la API.
 */


import {
    estadoActualidad
} from "./estado.js";


import {
    asignarTexto,
    limitar,
    obtenerElemento
} from "./dom.js";


export function normalizarGrados(
    grados
) {
    if (
        grados === null
        ||
        grados === undefined
        ||
        Number.isNaN(
            Number(
                grados
            )
        )
    ) {
        return null;
    }

    return (
        (
            Number(
                grados
            )
            %
            360
        )
        +
        360
    )
    %
    360;
}


export function obtenerDireccionCardinal(
    grados
) {
    const valor =
        normalizarGrados(
            grados
        );

    if (
        valor === null
    ) {
        return "--";
    }

    const direcciones = [
        "N",
        "NNE",
        "NE",
        "ENE",
        "E",
        "ESE",
        "SE",
        "SSE",
        "S",
        "SSO",
        "SO",
        "OSO",
        "O",
        "ONO",
        "NO",
        "NNO"
    ];

    return direcciones[
        Math.round(
            valor
            /
            22.5
        )
        %
        16
    ];
}


export function actualizarVeleta(
    codigo,
    grados
) {
    const valor =
        normalizarGrados(
            grados
        );

    const veleta =
        obtenerElemento(
            `veleta-${codigo}`
        );

    if (
        valor === null
    ) {
        asignarTexto(
            `direccion-${codigo}`,
            "--"
        );

        asignarTexto(
            `grados-${codigo}`,
            "--°"
        );

        if (
            veleta
        ) {
            veleta.style.setProperty(
                "--angulo",
                "0deg"
            );
        }

        return;
    }

    asignarTexto(
        `direccion-${codigo}`,
        obtenerDireccionCardinal(
            valor
        )
    );

    asignarTexto(
        `grados-${codigo}`,
        `${Math.round(valor)}°`
    );

    if (
        veleta
    ) {
        veleta.style.setProperty(
            "--angulo",
            `${valor}deg`
        );
    }
}


export function establecerVientoEstacion(
    codigo,
    direccion,
    velocidad
) {
    estadoActualidad
        .vientoEstacion[
            codigo
        ] = {
            direccion:
                normalizarGrados(
                    direccion
                ),

            velocidad:
                Number.isFinite(
                    Number(
                        velocidad
                    )
                )
                ?
                Number(
                    velocidad
                )
                :
                0
        };
}


export function limpiarVientoEstacion(
    codigo
) {
    estadoActualidad
        .vientoEstacion[
            codigo
        ] = {
            direccion: null,
            velocidad: 0
        };
}


export function calcularMovimientoViento(
    direccionMeteorologica,
    velocidadKmh,
    ancho,
    alto
) {
    const direccion =
        normalizarGrados(
            direccionMeteorologica
        );

    const velocidad =
        Number.isFinite(
            Number(
                velocidadKmh
            )
        )
        ?
        Math.max(
            0,
            Number(
                velocidadKmh
            )
        )
        :
        0;

    if (
        direccion === null
    ) {
        return {
            destino: 180,
            vectorX: 0,
            vectorY: 1,
            componenteSur: true,
            inicioX: 0,
            finalX: 0,
            recorridoY: Math.max(
                alto * 1.45,
                500
            ),
            angulo: 0,
            fuerza: 0
        };
    }

    const destino =
        (
            direccion
            +
            180
        )
        %
        360;

    const radianes =
        destino
        *
        Math.PI
        /
        180;

    const vectorX =
        Math.sin(
            radianes
        );

    const vectorY =
        -Math.cos(
            radianes
        );

    const fuerza =
        limitar(
            velocidad
            /
            50,
            0,
            1
        );

    const derivaBase =
        ancho
        *
        (
            0.035
            +
            fuerza
            *
            0.33
        );

    const finalX =
        vectorX
        *
        derivaBase;

    const inicioX =
        -finalX
        *
        0.10;

    const recorridoBase =
        Math.max(
            alto * 1.45,
            500
        );

    const recorridoY =
        recorridoBase
        +
        (
            vectorY
            *
            fuerza
            *
            alto
            *
            0.16
        );

    const angulo =
        Math.atan2(
            finalX,
            Math.max(
                recorridoY,
                1
            )
        )
        *
        180
        /
        Math.PI;

    const componenteSur =
        vectorY
        >
        0.08;

    return {
        destino,
        vectorX,
        vectorY,
        componenteSur,
        inicioX,
        finalX,
        recorridoY,
        angulo,
        fuerza
    };
}


export function obtenerEstacionDominante(
    codigos,
    obtenerNivelEfectivo
) {
    let dominante =
        null;

    codigos.forEach(
        codigo => {
            if (
                dominante === null
            ) {
                dominante =
                    codigo;

                return;
            }

            const nivelActual =
                obtenerNivelEfectivo(
                    codigo
                );

            const nivelDominante =
                obtenerNivelEfectivo(
                    dominante
                );

            if (
                nivelActual
                >
                nivelDominante
            ) {
                dominante =
                    codigo;

                return;
            }

            const velocidadActual =
                Number(
                    estadoActualidad
                        .vientoEstacion[
                            codigo
                        ]?.velocidad
                )
                ||
                0;

            const velocidadDominante =
                Number(
                    estadoActualidad
                        .vientoEstacion[
                            dominante
                        ]?.velocidad
                )
                ||
                0;

            if (
                nivelActual
                ===
                nivelDominante
                &&
                velocidadActual
                >
                velocidadDominante
            ) {
                dominante =
                    codigo;
            }
        }
    );

    return dominante;
}


export function obtenerVientoGlobal(
    codigosActivos,
    obtenerNivelEfectivo,
    codigosDisponibles = (
        estadoActualidad
            .codigosEstacion
    )
) {
    let codigo =
        null;

    if (
        codigosActivos.length
        >
        0
    ) {
        codigo =
            obtenerEstacionDominante(
                codigosActivos,
                obtenerNivelEfectivo
            );

    } else {
        codigo =
            codigosDisponibles.reduce(
                (
                    mejor,
                    actual
                ) => {
                    if (
                        mejor === null
                    ) {
                        return actual;
                    }

                    const velocidadActual =
                        Number(
                            estadoActualidad
                                .vientoEstacion[
                                    actual
                                ]?.velocidad
                        )
                        ||
                        0;

                    const velocidadMejor =
                        Number(
                            estadoActualidad
                                .vientoEstacion[
                                    mejor
                                ]?.velocidad
                        )
                        ||
                        0;

                    return (
                        velocidadActual
                        >
                        velocidadMejor
                    )
                    ?
                    actual
                    :
                    mejor;
                },
                null
            );
    }

    if (
        !codigo
    ) {
        return {
            direccion: null,
            velocidad: 0
        };
    }

    return {
        direccion:
            estadoActualidad
                .vientoEstacion[
                    codigo
                ]?.direccion
            ??
            null,

        velocidad:
            estadoActualidad
                .vientoEstacion[
                    codigo
                ]?.velocidad
            ??
            0
    };
}


// Fin de fichero: js/actualidad/viento.js