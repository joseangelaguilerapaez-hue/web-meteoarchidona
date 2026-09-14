"use strict";

/*
 * MeteoArchidona
 * Actualidad
 *
 * Utilidades DOM y funciones generales de presentación.
 *
 * Este módulo contiene funciones puras o de acceso sencillo al DOM
 * utilizadas por los demás módulos de Actualidad.
 *
 * No contiene:
 *
 * - consultas HTTP;
 * - lógica meteorológica;
 * - estado global;
 * - construcción de fichas;
 * - animaciones;
 * - planificación periódica.
 */


export function obtenerElemento(
    id
) {
    return document.getElementById(
        id
    );
}


export function asignarTexto(
    id,
    texto
) {
    const elemento =
        obtenerElemento(
            id
        );

    if (
        elemento
    ) {
        elemento.textContent =
            texto;
    }
}


export function asignarHtml(
    id,
    html
) {
    const elemento =
        obtenerElemento(
            id
        );

    if (
        elemento
    ) {
        elemento.innerHTML =
            html;
    }
}


export function formatearNumero(
    valor,
    decimales = 1
) {
    if (
        valor === null
        ||
        valor === undefined
        ||
        Number.isNaN(
            Number(
                valor
            )
        )
    ) {
        return "--";
    }

    return Number(
        valor
    ).toFixed(
        decimales
    );
}


export function limitar(
    valor,
    minimo,
    maximo
) {
    return Math.min(
        maximo,
        Math.max(
            minimo,
            valor
        )
    );
}


export function normalizarCodigoEstacion(
    codigo
) {
    if (
        codigo === null
        ||
        codigo === undefined
    ) {
        return "";
    }

    return String(
        codigo
    )
        .trim()
        .toUpperCase();
}


export function normalizarTexto(
    valor
) {
    if (
        valor === null
        ||
        valor === undefined
    ) {
        return "";
    }

    return String(
        valor
    ).trim();
}


export function numeroFinito(
    valor,
    valorDefecto = null
) {
    if (
        valor === null
        ||
        valor === undefined
        ||
        valor === ""
    ) {
        return valorDefecto;
    }

    const numero =
        Number(
            valor
        );

    if (
        !Number.isFinite(
            numero
        )
    ) {
        return valorDefecto;
    }

    return numero;
}


export function obtenerCodigosDesdeDom() {
    const codigos =
        new Set();

    document.querySelectorAll(
        "[data-lluvia-control]"
    ).forEach(
        elemento => {
            const codigo =
                normalizarCodigoEstacion(
                    elemento.dataset
                        .lluviaControl
                );

            if (
                codigo
            ) {
                codigos.add(
                    codigo
                );
            }
        }
    );

    return Array.from(
        codigos
    );
}


// Fin de fichero: js/actualidad/dom.js