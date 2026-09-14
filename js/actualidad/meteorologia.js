"use strict";

/*
 * MeteoArchidona
 * Actualidad
 *
 * Representación de condiciones meteorológicas.
 *
 * Responsabilidades:
 *
 * - clasificar el índice UV;
 * - representar temperatura, humedad y punto de rocío;
 * - representar presión;
 * - representar radiación solar e índice UV;
 * - representar viento;
 * - representar fecha y hora de observación;
 * - representar lluvia mediante el módulo especializado;
 * - mostrar el estado de error de una estación.
 *
 * Este módulo no realiza consultas HTTP.
 */


import {
    asignarHtml,
    asignarTexto,
    formatearNumero,
    obtenerElemento
} from "./dom.js";


import {
    crearEstadoInicialEstacion,
    obtenerMetadatosEstacion
} from "./estaciones.js?v=20260914-estaciones1";


import {
    mostrarErrorLluvia,
    mostrarLluvia
} from "./lluvia.js?v=20260914-diagnostico1";


import {
    actualizarSistemaLluvia
} from "./efectos-lluvia.js?v=20260914-diagnostico2";


import {
    actualizarVeleta,
    establecerVientoEstacion,
    limpiarVientoEstacion
} from "./viento.js";


export function clasificarUv(
    valor
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

    const uv =
        Number(
            valor
        );

    if (
        uv < 3
    ) {
        return "Bajo";
    }

    if (
        uv < 6
    ) {
        return "Moderado";
    }

    if (
        uv < 8
    ) {
        return "Alto";
    }

    if (
        uv < 11
    ) {
        return "Muy alto";
    }

    return "Extremo";
}


export function obtenerTextoEstadoFicha(
    metadatos
) {
    if (
        metadatos?.estado
        ===
        "DATOS_SIMULADOS"
    ) {
        return "Datos simulados";
    }

    return "En línea";
}


export function mostrarDatosEstacion(
    codigo,
    datos
) {
    crearEstadoInicialEstacion(
        codigo
    );

    const metadatos =
        obtenerMetadatosEstacion(
            codigo
        );

    const nombre =
        datos.nombre_estacion
        ||
        metadatos?.nombre_publico
        ||
        codigo;

    asignarTexto(
        `nombre-${codigo}`,
        nombre
    );

    asignarHtml(
        `temperatura-${codigo}`,
        `${
            formatearNumero(
                datos.temperatura_c
            )
        }<sup>°C</sup>`
    );

    asignarTexto(
        `sensacion-${codigo}`,
        `Sensación ${
            formatearNumero(
                datos.indice_calor_c
            )
        } °C`
    );

    const horaExterior =
        datos.hora_observacion_exterior
        ||
        datos.hora_observacion
        ||
        "--:--";

    const fechaExterior =
        datos.fecha_observacion_exterior
        ||
        datos.fecha_observacion
        ||
        "--";

    const horaBarometro =
        datos.hora_observacion_barometro
        ||
        datos.hora_observacion
        ||
        "--:--";

    asignarTexto(
        `observacion-${codigo}`,
        `Exterior ${horaExterior}`
    );

    asignarTexto(
        `fecha-${codigo}`,
        fechaExterior
    );

    asignarTexto(
        `humedad-${codigo}`,
        `${
            formatearNumero(
                datos.humedad_pct
            )
        } %`
    );

    asignarTexto(
        `rocio-${codigo}`,
        `${
            formatearNumero(
                datos.punto_rocio_c
            )
        } °C`
    );

    asignarTexto(
        `presion-${codigo}`,
        `${
            formatearNumero(
                datos.presion_hpa
            )
        } hPa`
    );

    asignarTexto(
        `presion-hora-${codigo}`,
        `Barómetro ${horaBarometro}`
    );

    asignarTexto(
        `radiacion-${codigo}`,
        `${
            formatearNumero(
                datos.radiacion_solar_w_m2,
                0
            )
        } W/m²`
    );

    asignarTexto(
        `uv-${codigo}`,
        formatearNumero(
            datos.indice_uv
        )
    );

    asignarTexto(
        `uv-estado-${codigo}`,
        clasificarUv(
            datos.indice_uv
        )
    );

    asignarHtml(
        `viento-actual-${codigo}`,
        `${
            formatearNumero(
                datos.viento_actual_kmh
            )
        } <small>km/h</small>`
    );

    asignarTexto(
        `viento-2m-${codigo}`,
        `${
            formatearNumero(
                datos.viento_medio_2_min_kmh
            )
        } km/h`
    );

    asignarTexto(
        `viento-10m-${codigo}`,
        `${
            formatearNumero(
                datos.viento_medio_10_min_kmh
            )
        } km/h`
    );

    asignarTexto(
        `racha-${codigo}`,
        `${
            formatearNumero(
                datos.racha_10_min_kmh
            )
        } km/h`
    );

    establecerVientoEstacion(
        codigo,
        datos.direccion_viento_grados,
        datos.viento_actual_kmh
    );

    actualizarVeleta(
        codigo,
        datos.direccion_viento_grados
    );

    const estado =
        obtenerElemento(
            `estado-${codigo}`
        );

    if (
        estado
    ) {
        estado.innerHTML =
            `<span class="punto"></span>${
                obtenerTextoEstadoFicha(
                    metadatos
                )
            }`;
    }

    mostrarLluvia(
        codigo,
        datos
    );

    actualizarSistemaLluvia();
}


export function mostrarErrorEstacion(
    codigo
) {
    crearEstadoInicialEstacion(
        codigo
    );

    limpiarVientoEstacion(
        codigo
    );

    const estado =
        obtenerElemento(
            `estado-${codigo}`
        );

    if (
        estado
    ) {
        estado.textContent =
            "Sin datos";
    }

    asignarHtml(
        `temperatura-${codigo}`,
        "--<sup>°C</sup>"
    );

    asignarTexto(
        `sensacion-${codigo}`,
        "Sensación -- °C"
    );

    asignarTexto(
        `observacion-${codigo}`,
        "Exterior --:--"
    );

    asignarTexto(
        `humedad-${codigo}`,
        "-- %"
    );

    asignarTexto(
        `rocio-${codigo}`,
        "-- °C"
    );

    asignarTexto(
        `presion-${codigo}`,
        "-- hPa"
    );

    asignarTexto(
        `presion-hora-${codigo}`,
        "Barómetro --:--"
    );

    asignarTexto(
        `radiacion-${codigo}`,
        "-- W/m²"
    );

    asignarTexto(
        `uv-${codigo}`,
        "--"
    );

    asignarTexto(
        `uv-estado-${codigo}`,
        "--"
    );

    asignarTexto(
        `fecha-${codigo}`,
        "--"
    );

    asignarHtml(
        `viento-actual-${codigo}`,
        '-- <small>km/h</small>'
    );

    asignarTexto(
        `viento-2m-${codigo}`,
        "-- km/h"
    );

    asignarTexto(
        `viento-10m-${codigo}`,
        "-- km/h"
    );

    asignarTexto(
        `racha-${codigo}`,
        "-- km/h"
    );

    actualizarVeleta(
        codigo,
        null
    );

    mostrarErrorLluvia(
        codigo
    );

    actualizarSistemaLluvia();
}


// Fin de fichero: