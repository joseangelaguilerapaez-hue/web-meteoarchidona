"use strict";

/*
 * MeteoArchidona
 * Actualidad
 *
 * Simulación manual de lluvia.
 *
 * Esta simulación es exclusivamente visual y sirve para comprobar
 * los efectos gráficos de lluvia de la web pública.
 *
 * No debe confundirse con las estaciones meteorológicas cuyo Estado
 * funcional es DATOS_SIMULADOS.
 *
 * Responsabilidades:
 *
 * - mantener el nivel visual de prueba;
 * - mostrar el indicador de simulación manual;
 * - avanzar entre intensidades de lluvia;
 * - desactivar la prueba;
 * - configurar los controles táctiles, ratón y teclado.
 */


import {
    NOMBRES_NIVEL_LLUVIA,
    estadoActualidad
} from "./estado.js";


import {
    normalizarCodigoEstacion,
    obtenerElemento
} from "./dom.js";


import {
    actualizarSistemaLluvia
} from "./efectos-lluvia.js";


export function asegurarEstadoSimulacion(
    codigo
) {
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


export function actualizarIndicadorSimulacion(
    origen
) {
    const elemento =
        obtenerElemento(
            `simulacion-${origen}`
        );

    if (
        !elemento
    ) {
        return;
    }

    const nivel =
        estadoActualidad
            .lluviaSimulada[
                origen
            ]
        ||
        0;

    if (
        nivel <= 0
    ) {
        elemento.classList.remove(
            "visible"
        );

        elemento.textContent =
            "";

        return;
    }

    elemento.textContent =
        origen === "GLOBAL"
        ?
        `Prueba ${NOMBRES_NIVEL_LLUVIA[nivel]}`
        :
        `Prueba lluvia · ${NOMBRES_NIVEL_LLUVIA[nivel]}`;

    elemento.classList.add(
        "visible"
    );
}


export function avanzarSimulacion(
    origen
) {
    asegurarEstadoSimulacion(
        origen
    );

    const actual =
        estadoActualidad
            .lluviaSimulada[
                origen
            ]
        ||
        0;

    estadoActualidad
        .lluviaSimulada[
            origen
        ] =
        actual <= 0
        ||
        actual >= 4
        ?
        1
        :
        actual + 1;

    actualizarIndicadorSimulacion(
        origen
    );

    actualizarSistemaLluvia();
}


export function desactivarSimulacion(
    origen
) {
    asegurarEstadoSimulacion(
        origen
    );

    estadoActualidad
        .lluviaSimulada[
            origen
        ] =
        0;

    actualizarIndicadorSimulacion(
        origen
    );

    actualizarSistemaLluvia();
}


export function configurarControlLluvia(
    elemento,
    origen
) {
    if (
        elemento.dataset
            .controlLluviaConfigurado
        ===
        "1"
    ) {
        return;
    }

    elemento.dataset
        .controlLluviaConfigurado =
        "1";

    let temporizadorLargo =
        null;

    let pulsacionLarga =
        false;

    let ultimoToque =
        0;

    let inicioX =
        0;

    let inicioY =
        0;


    function cancelar() {
        if (
            temporizadorLargo
            !==
            null
        ) {
            clearTimeout(
                temporizadorLargo
            );

            temporizadorLargo =
                null;
        }
    }


    elemento.addEventListener(
        "pointerdown",
        evento => {
            pulsacionLarga =
                false;

            inicioX =
                evento.clientX;

            inicioY =
                evento.clientY;

            cancelar();

            temporizadorLargo =
                setTimeout(
                    () => {
                        pulsacionLarga =
                            true;

                        ultimoToque =
                            0;

                        desactivarSimulacion(
                            origen
                        );
                    },
                    700
                );
        }
    );


    elemento.addEventListener(
        "pointermove",
        evento => {
            if (
                Math.abs(
                    evento.clientX
                    -
                    inicioX
                )
                >
                12
                ||
                Math.abs(
                    evento.clientY
                    -
                    inicioY
                )
                >
                12
            ) {
                cancelar();
            }
        }
    );


    elemento.addEventListener(
        "pointercancel",
        () => {
            cancelar();

            pulsacionLarga =
                false;
        }
    );


    elemento.addEventListener(
        "pointerup",
        evento => {
            cancelar();

            if (
                pulsacionLarga
            ) {
                pulsacionLarga =
                    false;

                return;
            }

            const ahora =
                Date.now();

            if (
                ultimoToque > 0
                &&
                ahora
                -
                ultimoToque
                <
                450
            ) {
                ultimoToque =
                    0;

                avanzarSimulacion(
                    origen
                );

                evento.preventDefault();

                return;
            }

            ultimoToque =
                ahora;
        }
    );


    elemento.addEventListener(
        "contextmenu",
        evento =>
            evento.preventDefault()
    );


    elemento.addEventListener(
        "keydown",
        evento => {
            if (
                evento.key
                ===
                "Enter"
            ) {
                evento.preventDefault();

                avanzarSimulacion(
                    origen
                );
            }

            if (
                evento.key
                ===
                "Escape"
            ) {
                evento.preventDefault();

                desactivarSimulacion(
                    origen
                );
            }
        }
    );
}


export function configurarControlesLluvia(
    raiz = document
) {
    raiz.querySelectorAll(
        "[data-lluvia-control]"
    ).forEach(
        control => {
            const codigo =
                normalizarCodigoEstacion(
                    control.dataset
                        .lluviaControl
                );

            if (
                codigo
            ) {
                asegurarEstadoSimulacion(
                    codigo
                );

                configurarControlLluvia(
                    control,
                    codigo
                );
            }
        }
    );
}


// Fin de fichero: js/actualidad/simulacion.js