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
 * - conservar los nombres visuales compactos de las fichas;
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
} from "./dom.js?v=20260914-modular2";


import {
    crearEstadoInicialEstacion,
    obtenerMetadatosEstacion,
    obtenerNombreVisibleEstacion
} from "./estaciones.js?v=20261025-sin-camara1";


import {
    mostrarErrorLluvia,
    mostrarLluvia
} from "./lluvia.js?v=20260914-modular2";


import {
    actualizarSistemaLluvia
} from "./efectos-lluvia.js?v=20260914-modular2";


import {
    actualizarVeleta,
    establecerVientoEstacion,
    limpiarVientoEstacion
} from "./viento.js?v=20260914-modular2";


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


/*
 * Minutos que puede pasar una estación sin mandar datos antes de que
 * la ficha deje de decir "En línea".
 *
 * Las estaciones mandan una lectura por minuto. Una hora da margen
 * suficiente para un corte de luz o de red sin alarmar, y evita que la
 * web afirme que una estación está en línea cuando lleva días callada,
 * como le pasó a La Vega en octubre de 2026: doce días parada y la
 * ficha seguía diciendo "En línea" sobre unos grados en blanco.
 */
export const MINUTOS_PARA_CONSIDERAR_PARADA = 60;


/*
 * Convierte la fecha y la hora de una lectura en un instante.
 *
 * La API las manda por separado y en formato español, dd/mm/aaaa y
 * hh:mm, ya en hora local de la estación.
 */
export function instanteDeLaLectura(
    datos
) {

    const fecha =
        datos?.fecha_observacion;

    const hora =
        datos?.hora_observacion;

    if (
        typeof fecha !== "string"
        ||
        typeof hora !== "string"
    ) {

        return null;

    }


    const partesFecha =
        fecha.split(
            "/"
        );

    const partesHora =
        hora.split(
            ":"
        );

    if (
        partesFecha.length !== 3
        ||
        partesHora.length < 2
    ) {

        return null;

    }


    const instante =
        new Date(
            Number(partesFecha[2]),
            Number(partesFecha[1]) - 1,
            Number(partesFecha[0]),
            Number(partesHora[0]),
            Number(partesHora[1])
        );

    return Number.isNaN(
        instante.valueOf()
    )
        ? null
        : instante;

}


/*
 * Desde cuándo no manda datos una estación, en minutos.
 *
 * Devuelve null cuando no se puede saber, para no acusar de parada a
 * una estación por un dato que no se ha entendido.
 */
export function minutosSinDatos(
    datos,
    ahora
) {

    const instante =
        instanteDeLaLectura(
            datos
        );

    if (
        !instante
    ) {

        return null;

    }


    const referencia =
        ahora || new Date();

    return Math.floor(
        (
            referencia - instante
        )
        /
        60000
    );

}


export function obtenerTextoEstadoFicha(
    metadatos,
    datos,
    ahora
) {

    if (
        metadatos?.estado
        ===
        "DATOS_SIMULADOS"
    ) {

        return "Datos simulados";

    }


    const minutos =
        minutosSinDatos(
            datos,
            ahora
        );

    if (
        minutos !== null
        &&
        minutos >= MINUTOS_PARA_CONSIDERAR_PARADA
    ) {

        const instante =
            instanteDeLaLectura(
                datos
            );

        const dia =
            instante.toLocaleDateString(
                "es-ES",
                {
                    day: "numeric",
                    month: "short"
                }
            ).replace(
                ".",
                ""
            );

        const horas =
            Math.floor(
                minutos / 60
            );

        /*
         * Dentro del mismo día basta la hora; a partir de ahí, el día
         * dice más que un número de horas que nadie va a dividir.
         */
        return horas < 24
            ? `Sin datos desde las ${
                instante.toLocaleTimeString(
                    "es-ES",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                )
            }`
            : `Sin datos desde el ${dia}`;

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


    /*
     * La respuesta de condiciones puede incluir nombre_estacion.
     *
     * Ese valor no debe saltarse los alias visuales de Actualidad.
     * Por ejemplo:
     *
     *     Salinas Los Pachecos (Archidona)
     *
     * continúa mostrándose como:
     *
     *     Salinas
     */
    const nombreOrigen =
        datos.nombre_estacion
        ||
        metadatos?.nombre_publico
        ||
        codigo;


    const nombre =
        obtenerNombreVisibleEstacion(
            nombreOrigen,
            codigo
        );


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

        const texto =
            obtenerTextoEstadoFicha(
                metadatos,
                datos
            );

        /*
         * La clase cambia el color del punto y del texto: verde
         * mientras llegan datos, apagado cuando la estación calla.
         */
        estado.classList.toggle(
            "sin-datos",
            texto.startsWith(
                "Sin datos"
            )
        );

        estado.innerHTML =
            `<span class="punto"></span>${texto}`;

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


// Fin de fichero: js/actualidad/meteorologia.js