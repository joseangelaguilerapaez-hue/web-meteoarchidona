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
 * - representar el episodio de lluvia abierto (episodio_lluvia de la API);
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

    mostrarEpisodioLluvia(
        codigo,
        datos.episodio_lluvia
    );
}


/*
 * Episodio de lluvia (José, 13-11-2026): la lluvia de horas o días
 * seguidos, que se cierra tras 24 horas con 0,2 mm o menos. La API lo
 * calcula y solo lo manda mientras está abierto; si llega null, la
 * línea se oculta.
 */

const DIAS_SEMANA = [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado"
];


function partesInstante(
    iso
) {
    // Fecha y hora tal como las manda la API (hora local de la estación).
    const coincidencia =
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(
            String(
                iso || ""
            )
        );

    if (
        !coincidencia
    ) {
        return null;
    }

    const [, anio, mes, dia, hora, minuto] =
        coincidencia;

    return {
        fecha: `${anio}-${mes}-${dia}`,
        diaSemana: DIAS_SEMANA[
            new Date(
                Date.UTC(
                    Number(anio),
                    Number(mes) - 1,
                    Number(dia)
                )
            ).getUTCDay()
        ],
        dia: Number(dia),
        hora: `${hora}:${minuto}`
    };
}


function fechaMadrid(
    desplazamientoDias = 0
) {
    const instante =
        new Date(
            Date.now()
            + desplazamientoDias * 86400000
        );

    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: "Europe/Madrid",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }
    ).format(
        instante
    );
}


function textoDesde(
    iso
) {
    const partes =
        partesInstante(
            iso
        );

    if (
        !partes
    ) {
        return "";
    }

    if (
        partes.fecha === fechaMadrid()
    ) {
        return `desde las ${partes.hora}`;
    }

    if (
        partes.fecha === fechaMadrid(-1)
    ) {
        return `desde ayer, ${partes.hora}`;
    }

    return `desde el ${partes.diaSemana} ${partes.dia}, ${partes.hora}`;
}


function mostrarEpisodioLluvia(
    codigo,
    episodio
) {
    const elemento =
        document.getElementById(
            `lluvia-episodio-${codigo}`
        );

    if (
        !elemento
    ) {
        return;
    }

    if (
        !episodio
        ||
        typeof episodio.lluvia_mm !== "number"
    ) {
        elemento.hidden = true;
        elemento.removeAttribute("title");
        return;
    }

    const valor =
        elemento.querySelector(
            ".lluvia-episodio-valor"
        );

    const desde =
        elemento.querySelector(
            ".lluvia-episodio-desde"
        );

    if (
        valor
        &&
        desde
    ) {
        valor.textContent =
            `${formatearNumero(episodio.lluvia_mm)} mm`;

        desde.textContent =
            textoDesde(
                episodio.inicio
            );
    }

    const ultima =
        partesInstante(
            episodio.ultima_lluvia
        );

    const detalles = [
        "Episodio de lluvia: la que cae seguida durante horas o días.",
        "Se cierra tras 24 horas con 0,2 mm o menos."
    ];

    if (
        ultima
    ) {
        detalles.push(
            `Última lluvia: ${ultima.diaSemana} ${ultima.dia}, ${ultima.hora}.`
        );
    }

    if (
        typeof episodio.intensidad_maxima_mm_h === "number"
    ) {
        detalles.push(
            `Intensidad máxima: ${formatearNumero(episodio.intensidad_maxima_mm_h)} mm/h.`
        );
    }

    elemento.title =
        detalles.join(
            " "
        );

    elemento.hidden = false;
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

    mostrarEpisodioLluvia(
        codigo,
        null
    );
}


// Fin de fichero: js/actualidad/lluvia.js