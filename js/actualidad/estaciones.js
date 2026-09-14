"use strict";

/*
 * MeteoArchidona
 * Actualidad
 *
 * Catálogo público de estaciones y fichas dinámicas.
 *
 * Responsabilidades:
 *
 * - normalizar el catálogo público de estaciones;
 * - conservar metadatos y códigos publicados;
 * - crear y retirar fichas dinámicamente;
 * - mantener la plantilla estructural de estación;
 * - preparar el estado interno asociado a cada estación;
 * - actualizar nombre, localidad y metadatos de la ficha;
 * - conservar como respaldo temporal las estaciones presentes en el DOM.
 *
 * Este módulo no consulta directamente la API.
 */


import {
    estadoActualidad,
    establecerCodigosEstacion,
    establecerEstacionesPublicas,
    establecerPlantillaFichaEstacion
} from "./estado.js";


import {
    normalizarCodigoEstacion,
    obtenerCodigosDesdeDom,
    obtenerElemento
} from "./dom.js";


import {
    inicializarLluviaVisualEstacion,
    actualizarSistemaLluvia
} from "./efectos-lluvia.js";


import {
    configurarControlesLluvia
} from "./simulacion.js";


import {
    configurarPatrocinios
} from "./patrocinios.js";


export function obtenerMetadatosEstacion(
    codigo
) {
    const codigoNormalizado =
        normalizarCodigoEstacion(
            codigo
        );

    return (
        estadoActualidad
            .estacionesPublicas
            .find(
                estacion =>
                    estacion.codigo
                    ===
                    codigoNormalizado
            )
        ||
        null
    );
}


export function estacionTieneFicha(
    codigo
) {
    return Boolean(
        obtenerElemento(
            `tarjeta-${codigo}`
        )
    );
}


export function obtenerCodigosConFicha() {
    return estadoActualidad
        .codigosEstacion
        .filter(
            codigo =>
                estacionTieneFicha(
                    codigo
                )
        );
}


export function crearEstadoInicialEstacion(
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

    if (
        !Object.prototype.hasOwnProperty.call(
            estadoActualidad
                .vientoEstacion,
            codigo
        )
    ) {
        estadoActualidad
            .vientoEstacion[
                codigo
            ] = {
                direccion: null,
                velocidad: 0
            };
    }
}


export function eliminarEstadoEstacionesAusentes(
    codigosValidos
) {
    const permitidos =
        new Set(
            codigosValidos
        );

    Object.keys(
        estadoActualidad
            .lluviaReal
    ).forEach(
        codigo => {
            if (
                !permitidos.has(
                    codigo
                )
            ) {
                delete estadoActualidad
                    .lluviaReal[
                        codigo
                    ];
            }
        }
    );

    Object.keys(
        estadoActualidad
            .lluviaSimulada
    ).forEach(
        codigo => {
            if (
                codigo !== "GLOBAL"
                &&
                !permitidos.has(
                    codigo
                )
            ) {
                delete estadoActualidad
                    .lluviaSimulada[
                        codigo
                    ];
            }
        }
    );

    Object.keys(
        estadoActualidad
            .vientoEstacion
    ).forEach(
        codigo => {
            if (
                !permitidos.has(
                    codigo
                )
            ) {
                delete estadoActualidad
                    .vientoEstacion[
                        codigo
                    ];
            }
        }
    );
}


export function establecerCatalogoEstaciones(
    estaciones
) {
    const normalizadas = [];

    const codigosVistos =
        new Set();

    estaciones.forEach(
        estacion => {
            const codigo =
                normalizarCodigoEstacion(
                    estacion?.codigo
                );

            if (
                !codigo
                ||
                codigosVistos.has(
                    codigo
                )
            ) {
                return;
            }

            codigosVistos.add(
                codigo
            );

            normalizadas.push(
                {
                    codigo,

                    nombre_publico:
                        estacion?.nombre_publico
                        ||
                        codigo,

                    estado:
                        estacion?.estado
                        ||
                        null,

                    ciudad:
                        estacion?.ciudad
                        ??
                        null,

                    region:
                        estacion?.region
                        ??
                        null,

                    pais:
                        estacion?.pais
                        ??
                        null
                }
            );
        }
    );

    establecerEstacionesPublicas(
        normalizadas
    );

    const codigos =
        normalizadas.map(
            estacion =>
                estacion.codigo
        );

    establecerCodigosEstacion(
        codigos
    );

    eliminarEstadoEstacionesAusentes(
        codigos
    );

    codigos.forEach(
        codigo => {
            crearEstadoInicialEstacion(
                codigo
            );
        }
    );

    actualizarSistemaLluvia();
}


export function establecerCatalogoDesdeDom() {
    const codigos =
        obtenerCodigosDesdeDom();

    establecerCatalogoEstaciones(
        codigos.map(
            codigo => ({
                codigo,
                nombre_publico:
                    codigo,
                estado:
                    null,
                ciudad:
                    null,
                region:
                    null,
                pais:
                    null
            })
        )
    );
}


export function capturarPlantillaFichaEstacion() {
    const panel =
        document.querySelector(
            ".panel-superior"
        );

    if (
        !panel
    ) {
        return false;
    }

    const template =
        obtenerElemento(
            "plantilla-estacion"
        );

    let ficha =
        null;

    if (
        template
        &&
        template.tagName
        ===
        "TEMPLATE"
    ) {
        ficha =
            template.content
                .querySelector(
                    ".estacion-principal"
                );
    }

    if (
        !ficha
    ) {
        ficha =
            Array.from(
                panel.children
            ).find(
                elemento =>
                    elemento.classList
                        .contains(
                            "estacion-principal"
                        )
            )
            ||
            null;
    }

    if (
        !ficha
    ) {
        return false;
    }

    const codigo =
        normalizarCodigoEstacion(
            ficha.id.replace(
                /^tarjeta-/,
                ""
            )
        );

    if (
        !codigo
    ) {
        return false;
    }

    const plantilla =
        ficha.cloneNode(
            true
        );

    plantilla
        .querySelectorAll(
            ".gota-lluvia, .gota-cristal"
        )
        .forEach(
            elemento =>
                elemento.remove()
        );

    plantilla
        .querySelectorAll(
            "*"
        )
        .forEach(
            elemento => {
                delete elemento.dataset
                    .gotasLluviaInicializadas;

                delete elemento.dataset
                    .controlLluviaConfigurado;

                delete elemento.dataset
                    .patrocinioConfigurado;
            }
        );

    establecerPlantillaFichaEstacion(
        plantilla,
        codigo
    );

    return true;
}


export function sustituirCodigoEnFicha(
    ficha,
    codigoOrigen,
    codigoDestino
) {
    const elementos = [
        ficha,
        ...ficha.querySelectorAll(
            "*"
        )
    ];

    elementos.forEach(
        elemento => {
            if (
                elemento.id
                &&
                elemento.id.endsWith(
                    `-${codigoOrigen}`
                )
            ) {
                elemento.id =
                    `${
                        elemento.id.slice(
                            0,
                            -(
                                codigoOrigen.length
                                +
                                1
                            )
                        )
                    }-${codigoDestino}`;
            }

            if (
                elemento.dataset
                    .lluviaControl
                ===
                codigoOrigen
            ) {
                elemento.dataset
                    .lluviaControl =
                    codigoDestino;
            }

            if (
                elemento.dataset
                    .patrocinio
                ===
                codigoOrigen
            ) {
                elemento.dataset
                    .patrocinio =
                    codigoDestino;
            }

            delete elemento.dataset
                .gotasLluviaInicializadas;

            delete elemento.dataset
                .controlLluviaConfigurado;

            delete elemento.dataset
                .patrocinioConfigurado;
        }
    );
}


export function obtenerLocalidadEstacion(
    estacion
) {
    if (
        estacion?.ciudad
    ) {
        return estacion.ciudad;
    }

    const partes = [
        estacion?.region,
        estacion?.pais
    ].filter(
        Boolean
    );

    return partes.join(
        " · "
    );
}


export function actualizarMetadatosFicha(
    ficha,
    estacion
) {
    const nombre =
        estacion.nombre_publico
        ||
        estacion.codigo;

    const localidad =
        obtenerLocalidadEstacion(
            estacion
        );

    const nombreElemento =
        ficha.querySelector(
            ".estacion-nombre"
        );

    if (
        nombreElemento
    ) {
        nombreElemento.textContent =
            nombre;
    }

    const localidadElemento =
        ficha.querySelector(
            ".estacion-localidad"
        );

    if (
        localidadElemento
    ) {
        localidadElemento.textContent =
            localidad;
    }

    const veleta =
        ficha.querySelector(
            "[data-lluvia-control]"
        );

    if (
        veleta
    ) {
        veleta.setAttribute(
            "aria-label",
            `Veleta de ${nombre}`
        );

        veleta.setAttribute(
            "title",
            `Veleta de ${nombre}`
        );
    }

    const patrocinio =
        ficha.querySelector(
            ".patrocinio-estacion"
        );

    if (
        patrocinio
    ) {
        patrocinio.setAttribute(
            "aria-label",
            `Patrocinadores de los datos de lluvia de ${nombre}`
        );
    }
}


export function prepararFichaNueva(
    ficha,
    estacion
) {
    const codigo =
        estacion.codigo;

    ficha.dataset
        .estacionDinamica =
        "1";

    ficha.dataset
        .codigoEstacion =
        codigo;

    const localidad =
        ficha.querySelector(
            ".estacion-localidad"
        );

    if (
        localidad
    ) {
        localidad.id =
            `localidad-${codigo}`;
    }

    const estado =
        ficha.querySelector(
            ".online"
        );

    if (
        estado
    ) {
        estado.innerHTML =
            '<span class="punto"></span>Cargando...';
    }

    const simulacion =
        ficha.querySelector(
            ".simulacion-estacion"
        );

    if (
        simulacion
    ) {
        simulacion.classList.remove(
            "visible"
        );

        simulacion.textContent =
            "";
    }

    actualizarMetadatosFicha(
        ficha,
        estacion
    );
}


export function crearFichaEstacion(
    estacion
) {
    if (
        !estadoActualidad
            .plantillaFichaEstacion
        ||
        !estadoActualidad
            .codigoPlantillaFicha
    ) {
        return null;
    }

    const ficha =
        estadoActualidad
            .plantillaFichaEstacion
            .cloneNode(
                true
            );

    sustituirCodigoEnFicha(
        ficha,
        estadoActualidad
            .codigoPlantillaFicha,
        estacion.codigo
    );

    prepararFichaNueva(
        ficha,
        estacion
    );

    return ficha;
}


export function obtenerOCrearRejillaEstaciones() {
    const panel =
        document.querySelector(
            ".panel-superior"
        );

    if (
        !panel
    ) {
        return null;
    }

    let rejilla =
        obtenerElemento(
            "rejilla-estaciones"
        );

    if (
        rejilla
    ) {
        return rejilla;
    }

    if (
        !estadoActualidad
            .plantillaFichaEstacion
    ) {
        return null;
    }

    rejilla =
        document.createElement(
            "div"
        );

    rejilla.id =
        "rejilla-estaciones";

    rejilla.className =
        "rejilla-estaciones";

    Array.from(
        panel.children
    ).forEach(
        elemento => {
            if (
                elemento.classList
                    .contains(
                        "estacion-principal"
                    )
            ) {
                elemento.remove();
            }
        }
    );

    panel.classList.add(
        "panel-superior-dinamico"
    );

    panel.appendChild(
        rejilla
    );

    return rejilla;
}


export function sincronizarFichasEstaciones() {
    if (
        !estadoActualidad
            .plantillaFichaEstacion
    ) {
        return false;
    }

    const rejilla =
        obtenerOCrearRejillaEstaciones();

    if (
        !rejilla
    ) {
        return false;
    }

    const codigosValidos =
        new Set(
            estadoActualidad
                .codigosEstacion
        );

    rejilla.querySelectorAll(
        ".estacion-principal[data-estacion-dinamica='1']"
    ).forEach(
        ficha => {
            const codigo =
                normalizarCodigoEstacion(
                    ficha.dataset
                        .codigoEstacion
                );

            if (
                !codigosValidos.has(
                    codigo
                )
            ) {
                ficha.remove();
            }
        }
    );

    estadoActualidad
        .estacionesPublicas
        .forEach(
            estacion => {
                let ficha =
                    obtenerElemento(
                        `tarjeta-${estacion.codigo}`
                    );

                if (
                    !ficha
                ) {
                    ficha =
                        crearFichaEstacion(
                            estacion
                        );

                    if (
                        !ficha
                    ) {
                        return;
                    }

                    rejilla.appendChild(
                        ficha
                    );

                    crearEstadoInicialEstacion(
                        estacion.codigo
                    );

                    inicializarLluviaVisualEstacion(
                        estacion.codigo
                    );

                    configurarControlesLluvia(
                        ficha
                    );

                    configurarPatrocinios(
                        ficha
                    );

                } else {
                    actualizarMetadatosFicha(
                        ficha,
                        estacion
                    );
                }

                /*
                 * Reinsertar conserva el orden devuelto
                 * por el catálogo público.
                 */
                rejilla.appendChild(
                    ficha
                );
            }
        );

    actualizarSistemaLluvia();

    return true;
}


// Fin de fichero: js/actualidad/estaciones.js