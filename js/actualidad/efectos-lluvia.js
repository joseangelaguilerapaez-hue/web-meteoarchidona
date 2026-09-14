"use strict";

/*
 * MeteoArchidona
 * Actualidad
 *
 * Efectos visuales de lluvia.
 *
 * Responsabilidades:
 *
 * - aplicar niveles visuales a las capas de lluvia;
 * - orientar la lluvia según el viento;
 * - gestionar gotas sobre el cristal;
 * - crear las gotas animadas de precipitación;
 * - decidir cuándo la lluvia debe mostrarse localmente o de forma global;
 * - mantener sincronizados los efectos visuales con el estado
 *   meteorológico de las estaciones.
 *
 * Este módulo no obtiene datos meteorológicos de la API.
 */


import {
    estadoActualidad
} from "./estado.js?v=20260914-modular2";


import {
    obtenerElemento
} from "./dom.js?v=20260914-modular2";


import {
    obtenerNivelEfectivo
} from "./lluvia.js?v=20260914-modular2";


import {
    calcularMovimientoViento,
    obtenerVientoGlobal
} from "./viento.js?v=20260914-modular2";


export function obtenerCodigosConFicha() {
    return estadoActualidad
        .codigosEstacion
        .filter(
            codigo =>
                Boolean(
                    obtenerElemento(
                        `tarjeta-${codigo}`
                    )
                )
        );
}


export function aplicarNivelACapa(
    capa,
    nivel
) {
    if (
        !capa
    ) {
        return;
    }

    capa.classList.remove(
        "activa",
        "nivel-1",
        "nivel-2",
        "nivel-3",
        "nivel-4"
    );

    if (
        nivel > 0
    ) {
        capa.classList.add(
            "activa",
            `nivel-${nivel}`
        );
    }
}


export function aplicarVientoACapa(
    capa,
    viento
) {
    if (
        !capa
    ) {
        return null;
    }

    const referencia =
        capa.classList.contains(
            "capa-lluvia-ficha"
        )
        ?
        capa.parentElement
        :
        document.documentElement;

    const ancho =
        referencia?.clientWidth
        ||
        window.innerWidth
        ||
        360;

    const alto =
        referencia?.clientHeight
        ||
        window.innerHeight
        ||
        700;

    const movimiento =
        calcularMovimientoViento(
            viento?.direccion
            ??
            null,

            viento?.velocidad
            ??
            0,

            ancho,
            alto
        );

    capa.style.setProperty(
        "--inicio-x",
        `${movimiento.inicioX.toFixed(1)}px`
    );

    capa.style.setProperty(
        "--final-x",
        `${movimiento.finalX.toFixed(1)}px`
    );

    capa.style.setProperty(
        "--recorrido-y",
        `${movimiento.recorridoY.toFixed(1)}px`
    );

    capa.style.setProperty(
        "--angulo-gota",
        `${movimiento.angulo.toFixed(2)}deg`
    );

    return movimiento;
}


export function configurarCapaCristal(
    capa,
    nivel,
    movimiento
) {
    if (
        !capa
    ) {
        return;
    }

    capa.dataset.nivel =
        String(
            nivel
        );

    capa.dataset.vectorX =
        movimiento
        ?
        String(
            movimiento.vectorX
        )
        :
        "0";

    capa.classList.remove(
        "activa"
    );

    if (
        nivel > 0
        &&
        movimiento
        &&
        movimiento.componenteSur
    ) {
        capa.classList.add(
            "activa"
        );
    }
}


export function actualizarCapaMeteorologica(
    idLluvia,
    idCristal,
    nivel,
    viento
) {
    const capaLluvia =
        obtenerElemento(
            idLluvia
        );

    const capaCristal =
        obtenerElemento(
            idCristal
        );

    aplicarNivelACapa(
        capaLluvia,
        nivel
    );

    configurarCapaCristal(
        capaCristal,
        nivel,
        aplicarVientoACapa(
            capaLluvia,
            viento
        )
    );
}


export function actualizarSistemaLluvia() {
    const codigosRenderizados =
        obtenerCodigosConFicha();

    const activos =
        codigosRenderizados.filter(
            codigo =>
                obtenerNivelEfectivo(
                    codigo
                )
                >
                0
        );

    let nivelGlobal =
        0;

    if (
        activos.length
        >=
        2
    ) {
        nivelGlobal =
            Math.max(
                ...activos.map(
                    codigo =>
                        obtenerNivelEfectivo(
                            codigo
                        )
                )
            );
    }

    codigosRenderizados.forEach(
        codigo => {
            let nivelLocal =
                0;

            if (
                activos.length
                ===
                1
                &&
                activos[
                    0
                ]
                ===
                codigo
            ) {
                nivelLocal =
                    obtenerNivelEfectivo(
                        codigo
                    );
            }

            actualizarCapaMeteorologica(
                `capa-lluvia-${codigo}`,
                `capa-gotas-cristal-${codigo}`,
                nivelLocal,
                estadoActualidad
                    .vientoEstacion[
                        codigo
                    ]
            );
        }
    );

    nivelGlobal =
        Math.max(
            nivelGlobal,
            estadoActualidad
                .lluviaSimulada
                .GLOBAL
            ||
            0
        );

    actualizarCapaMeteorologica(
        "capa-lluvia",
        "capa-gotas-cristal",
        nivelGlobal,
        obtenerVientoGlobal(
            activos,
            obtenerNivelEfectivo,
            codigosRenderizados
        )
    );
}


export function inicializarGotasEnCapa(
    idCapa,
    totalGotas = 160
) {
    const capa =
        obtenerElemento(
            idCapa
        );

    if (
        !capa
    ) {
        return;
    }

    if (
        capa.dataset
            .gotasLluviaInicializadas
        ===
        "1"
    ) {
        return;
    }

    capa.dataset
        .gotasLluviaInicializadas =
        "1";

    for (
        let i = 0;
        i < totalGotas;
        i += 1
    ) {
        const gota =
            document.createElement(
                "span"
            );

        gota.className =
            "gota-lluvia";

        gota.style.setProperty(
            "--x",
            `${Math.random() * 116 - 8}%`
        );

        gota.style.setProperty(
            "--longitud",
            `${13 + Math.random() * 27}px`
        );

        gota.style.setProperty(
            "--duracion",
            `${0.58 + Math.random() * 0.42}s`
        );

        gota.style.setProperty(
            "--retraso",
            `${-Math.random() * 2.4}s`
        );

        gota.style.setProperty(
            "--opacidad",
            (
                0.38
                +
                Math.random()
                *
                0.57
            ).toFixed(
                2
            )
        );

        capa.appendChild(
            gota
        );
    }
}


export function inicializarLluviaVisual() {
    inicializarGotasEnCapa(
        "capa-lluvia"
    );

    document.querySelectorAll(
        ".capa-lluvia-ficha[id]"
    ).forEach(
        capa => {
            inicializarGotasEnCapa(
                capa.id
            );
        }
    );
}


export function inicializarLluviaVisualEstacion(
    codigo
) {
    inicializarGotasEnCapa(
        `capa-lluvia-${codigo}`
    );
}


export function obtenerMaximoGotasCristal(
    nivel,
    esGlobal
) {
    const globales = {
        1: 4,
        2: 7,
        3: 11,
        4: 16
    };

    const locales = {
        1: 3,
        2: 5,
        3: 8,
        4: 11
    };

    return esGlobal
        ?
        (
            globales[
                nivel
            ]
            ||
            0
        )
        :
        (
            locales[
                nivel
            ]
            ||
            0
        );
}


export function obtenerProbabilidadGotaCristal(
    nivel
) {
    return (
        {
            1: 0.16,
            2: 0.34,
            3: 0.62,
            4: 0.88
        }[
            nivel
        ]
        ||
        0
    );
}


export function crearGotaCristal(
    capa,
    nivel
) {
    if (
        !capa
        ||
        nivel <= 0
    ) {
        return;
    }

    const esGlobal =
        capa.classList.contains(
            "capa-gotas-cristal"
        );

    const maximo =
        obtenerMaximoGotasCristal(
            nivel,
            esGlobal
        );

    if (
        capa.querySelectorAll(
            ".gota-cristal"
        ).length
        >=
        maximo
    ) {
        return;
    }

    const gota =
        document.createElement(
            "span"
        );

    const base =
        {
            1: 5,
            2: 6,
            3: 7,
            4: 8
        }[
            nivel
        ];

    const rango =
        {
            1: 4,
            2: 6,
            3: 8,
            4: 10
        }[
            nivel
        ];

    const tamano =
        base
        +
        Math.random()
        *
        rango;

    const vida =
        2600
        +
        Math.random()
        *
        3400;

    const opacidad =
        0.15
        +
        Math.random()
        *
        (
            0.06
            +
            nivel
            *
            0.025
        );

    const deslizar =
        8
        +
        nivel
        *
        5
        +
        Math.random()
        *
        14;

    const vectorX =
        Number(
            capa.dataset.vectorX
        )
        ||
        0;

    gota.className =
        "gota-cristal";

    gota.style.setProperty(
        "--x",
        `${4 + Math.random() * 92}%`
    );

    gota.style.setProperty(
        "--y",
        `${4 + Math.random() * 76}%`
    );

    gota.style.setProperty(
        "--tamano",
        `${tamano.toFixed(1)}px`
    );

    gota.style.setProperty(
        "--vida",
        `${Math.round(vida)}ms`
    );

    gota.style.setProperty(
        "--opacidad-cristal",
        opacidad.toFixed(
            2
        )
    );

    gota.style.setProperty(
        "--deslizar",
        `${deslizar.toFixed(1)}px`
    );

    gota.style.setProperty(
        "--desvio-x",
        `${
            (
                vectorX
                *
                (
                    3
                    +
                    nivel
                    *
                    2
                )
            ).toFixed(
                1
            )
        }px`
    );

    capa.appendChild(
        gota
    );

    window.setTimeout(
        () => {
            gota.remove();
        },
        vida
        +
        150
    );
}


export function generarGotasCristalActivas() {
    if (
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches
    ) {
        return;
    }

    document.querySelectorAll(
        ".capa-gotas-cristal.activa, .capa-gotas-cristal-ficha.activa"
    ).forEach(
        capa => {
            const nivel =
                Number(
                    capa.dataset.nivel
                )
                ||
                0;

            if (
                nivel <= 0
                ||
                Math.random()
                >
                obtenerProbabilidadGotaCristal(
                    nivel
                )
            ) {
                return;
            }

            const cantidad =
                nivel >= 4
                &&
                Math.random()
                >
                0.48
                ?
                2
                :
                1;

            for (
                let i = 0;
                i < cantidad;
                i += 1
            ) {
                crearGotaCristal(
                    capa,
                    nivel
                );
            }
        }
    );
}


// Fin de fichero: js/actualidad/efectos-lluvia.js