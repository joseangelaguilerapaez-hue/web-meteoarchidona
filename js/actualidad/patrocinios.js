"use strict";

/*
 * MeteoArchidona
 * Actualidad
 *
 * Controles de patrocinio de las fichas meteorológicas.
 *
 * Responsabilidades:
 *
 * - localizar controles de patrocinio;
 * - evitar registrar eventos más de una vez;
 * - pausar y reanudar la animación correspondiente;
 * - mantener atributos de accesibilidad.
 *
 * Actualmente las franjas de patrocinio pueden permanecer ocultas
 * mediante CSS, pero se conserva su lógica aislada para su futura
 * utilización.
 */


import {
    normalizarCodigoEstacion,
    obtenerElemento
} from "./dom.js?v=20260914-modular2";


export function configurarPatrocinio(
    control
) {
    if (
        control.dataset
            .patrocinioConfigurado
        ===
        "1"
    ) {
        return;
    }

    control.dataset
        .patrocinioConfigurado =
        "1";

    control.addEventListener(
        "click",
        () => {
            const codigo =
                normalizarCodigoEstacion(
                    control.dataset
                        .patrocinio
                );

            if (
                !codigo
            ) {
                return;
            }

            const patrocinio =
                obtenerElemento(
                    `patrocinio-${codigo}`
                );

            if (
                !patrocinio
            ) {
                return;
            }

            const pausado =
                patrocinio.classList.toggle(
                    "pausado"
                );

            control.textContent =
                pausado
                ?
                "▶"
                :
                "Ⅱ";

            control.setAttribute(
                "aria-pressed",
                String(
                    pausado
                )
            );

            control.setAttribute(
                "aria-label",
                pausado
                ?
                "Reanudar patrocinio"
                :
                "Pausar patrocinio"
            );
        }
    );
}


export function configurarPatrocinios(
    raiz = document
) {
    raiz.querySelectorAll(
        ".patrocinio-estacion-control"
    ).forEach(
        control => {
            configurarPatrocinio(
                control
            );
        }
    );
}


// Fin de fichero: js/actualidad/patrocinios.js