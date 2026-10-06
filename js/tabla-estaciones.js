"use strict";

/*
 * MeteoArchidona
 * Tabla de estaciones
 *
 * Construcción y actualización dinámica de la tabla de estaciones.
 *
 * Las estaciones se descubren mediante:
 *
 *     GET /estaciones
 *
 * Para cada estación se consultan sus condiciones mediante:
 *
 *     GET /condiciones-actuales/{codigo}
 *
 * No existe ninguna lista fija de estaciones en este fichero.
 */


const INTERVALO_CONDICIONES_MS =
    60_000;


const INTERVALO_CATALOGO_MS =
    300_000;


let estacionesPublicas = [];


/* ==========================================================
   UTILIDADES
   ========================================================== */


function obtenerApiBase() {
    const apiBase =
        String(
            window.API_BASE
            ||
            ""
        )
            .trim()
            .replace(
                /\/+$/,
                ""
            );

    if (
        !apiBase
    ) {
        throw new Error(
            "window.API_BASE no está definido."
        );
    }

    return apiBase;
}


function normalizarCodigoEstacion(
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


function numeroValido(
    valor
) {
    return (
        valor !== null
        &&
        valor !== undefined
        &&
        valor !== ""
        &&
        Number.isFinite(
            Number(
                valor
            )
        )
    );
}


function formatearNumero(
    valor,
    decimales = 1
) {
    if (
        !numeroValido(
            valor
        )
    ) {
        return null;
    }

    return Number(
        valor
    ).toFixed(
        decimales
    );
}


function formatearMedida(
    valor,
    unidad,
    decimales = 1
) {
    const numero =
        formatearNumero(
            valor,
            decimales
        );

    if (
        numero === null
    ) {
        return "—";
    }

    return `${numero} ${unidad}`;
}


function obtenerDireccionCardinal(
    grados
) {
    if (
        !numeroValido(
            grados
        )
    ) {
        return "";
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

    const valor =
        (
            Number(
                grados
            )
            %
            360
            +
            360
        )
        %
        360;

    const indice =
        Math.round(
            valor / 22.5
        )
        %
        16;

    return direcciones[
        indice
    ];
}


function formatearViento(
    datos
) {
    const velocidad =
        formatearNumero(
            datos?.viento_actual_kmh
        );

    if (
        velocidad === null
    ) {
        return "—";
    }

    const direccion =
        obtenerDireccionCardinal(
            datos?.direccion_viento_grados
        );

    if (
        !direccion
    ) {
        return `${velocidad} km/h`;
    }

    return `${velocidad} km/h · ${direccion}`;
}


function obtenerCuerpoTabla() {
    return document.getElementById(
        "tabla-estaciones-cuerpo"
    );
}


function obtenerFila(
    codigo
) {
    const cuerpo =
        obtenerCuerpoTabla();

    if (
        !cuerpo
    ) {
        return null;
    }

    return Array.from(
        cuerpo.querySelectorAll(
            "tr[data-codigo-estacion]"
        )
    ).find(
        fila =>
            fila.dataset
                .codigoEstacion
            ===
            codigo
    )
    ||
    null;
}


function establecerEstado(
    texto,
    esError = false
) {
    const elemento =
        document.getElementById(
            "tabla-estaciones-estado"
        );

    if (
        !elemento
    ) {
        return;
    }

    elemento.textContent =
        texto;

    elemento.classList.toggle(
        "error",
        esError
    );
}


function obtenerHoraActual() {
    return new Intl.DateTimeFormat(
        "es-ES",
        {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    ).format(
        new Date()
    );
}


/* ==========================================================
   FILAS DINÁMICAS
   ========================================================== */


function crearCelda(
    clase,
    campo
) {
    const celda =
        document.createElement(
            "td"
        );

    celda.className =
        clase;

    celda.dataset.campo =
        campo;

    celda.textContent =
        "—";

    return celda;
}


function crearFilaEstacion(
    estacion
) {
    const fila =
        document.createElement(
            "tr"
        );

    fila.dataset
        .codigoEstacion =
        estacion.codigo;


    const nombre =
        crearCelda(
            "tabla-estaciones-nombre",
            "nombre"
        );

    nombre.textContent =
        estacion.nombre_publico
        ||
        estacion.codigo;

    fila.appendChild(
        nombre
    );


    fila.appendChild(
        crearCelda(
            "tabla-estaciones-valor",
            "temperatura"
        )
    );


    fila.appendChild(
        crearCelda(
            "tabla-estaciones-valor",
            "humedad"
        )
    );


    fila.appendChild(
        crearCelda(
            "tabla-estaciones-valor",
            "presion"
        )
    );


    fila.appendChild(
        crearCelda(
            "tabla-estaciones-valor tabla-estaciones-viento",
            "viento"
        )
    );


    fila.appendChild(
        crearCelda(
            "tabla-estaciones-valor",
            "lluvia-dia"
        )
    );


    fila.appendChild(
        crearCelda(
            "tabla-estaciones-valor",
            "lluvia-mes"
        )
    );


    return fila;
}


function asignarTextoFila(
    fila,
    campo,
    texto
) {
    const celda =
        fila.querySelector(
            `[data-campo="${campo}"]`
        );

    if (
        celda
    ) {
        celda.textContent =
            texto;
    }
}


function crearFilaVacia(
    texto
) {
    const fila =
        document.createElement(
            "tr"
        );

    fila.className =
        "tabla-estaciones-vacia";


    const celda =
        document.createElement(
            "td"
        );

    celda.colSpan =
        7;

    celda.textContent =
        texto;


    fila.appendChild(
        celda
    );

    return fila;
}


function sincronizarFilas() {
    const cuerpo =
        obtenerCuerpoTabla();

    if (
        !cuerpo
    ) {
        return;
    }


    cuerpo.querySelectorAll(
        ".tabla-estaciones-cargando, .tabla-estaciones-vacia"
    ).forEach(
        elemento =>
            elemento.remove()
    );


    const codigosValidos =
        new Set(
            estacionesPublicas.map(
                estacion =>
                    estacion.codigo
            )
        );


    cuerpo.querySelectorAll(
        "tr[data-codigo-estacion]"
    ).forEach(
        fila => {
            const codigo =
                fila.dataset
                    .codigoEstacion;

            if (
                !codigosValidos.has(
                    codigo
                )
            ) {
                fila.remove();
            }
        }
    );


    estacionesPublicas.forEach(
        estacion => {
            let fila =
                obtenerFila(
                    estacion.codigo
                );

            if (
                !fila
            ) {
                fila =
                    crearFilaEstacion(
                        estacion
                    );
            }


            asignarTextoFila(
                fila,
                "nombre",
                estacion.nombre_publico
                ||
                estacion.codigo
            );


            /*
             * Reinsertar conserva el orden exacto devuelto
             * por el catálogo público de estaciones.
             */
            cuerpo.appendChild(
                fila
            );
        }
    );


    if (
        estacionesPublicas.length
        ===
        0
    ) {
        cuerpo.appendChild(
            crearFilaVacia(
                "No hay estaciones públicas disponibles."
            )
        );
    }
}


/* ==========================================================
   CATÁLOGO DE ESTACIONES
   ========================================================== */


function establecerCatalogoEstaciones(
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
                        codigo
                }
            );
        }
    );


    estacionesPublicas =
        normalizadas;
}


async function cargarCatalogoEstaciones() {
    const respuesta =
        await fetch(
            `${obtenerApiBase()}/estaciones`,
            {
                cache: "no-store"
            }
        );


    if (
        !respuesta.ok
    ) {
        throw new Error(
            `HTTP ${respuesta.status}`
        );
    }


    const datos =
        await respuesta.json();


    if (
        !datos
        ||
        !Array.isArray(
            datos.estaciones
        )
    ) {
        throw new Error(
            "Respuesta de catálogo de estaciones no válida."
        );
    }


    establecerCatalogoEstaciones(
        datos.estaciones
    );


    sincronizarFilas();
}


/* ==========================================================
   REPRESENTACIÓN DE DATOS
   ========================================================== */


function mostrarDatosEstacion(
    estacion,
    datos
) {
    const fila =
        obtenerFila(
            estacion.codigo
        );

    if (
        !fila
    ) {
        return;
    }


    fila.classList.remove(
        "tabla-estaciones-sin-datos"
    );


    asignarTextoFila(
        fila,
        "nombre",
        datos?.nombre_estacion
        ||
        estacion.nombre_publico
        ||
        estacion.codigo
    );


    asignarTextoFila(
        fila,
        "temperatura",
        formatearMedida(
            datos?.temperatura_c,
            "°C"
        )
    );


    asignarTextoFila(
        fila,
        "humedad",
        formatearMedida(
            datos?.humedad_pct,
            "%"
        )
    );


    asignarTextoFila(
        fila,
        "presion",
        formatearMedida(
            datos?.presion_hpa,
            "hPa"
        )
    );


    asignarTextoFila(
        fila,
        "viento",
        formatearViento(
            datos
        )
    );


    asignarTextoFila(
        fila,
        "lluvia-dia",
        formatearMedida(
            datos?.lluvia_dia_mm,
            "mm"
        )
    );


    asignarTextoFila(
        fila,
        "lluvia-mes",
        formatearMedida(
            datos?.lluvia_mes_mm,
            "mm"
        )
    );
}


function mostrarErrorEstacion(
    estacion
) {
    const fila =
        obtenerFila(
            estacion.codigo
        );

    if (
        !fila
    ) {
        return;
    }


    fila.classList.add(
        "tabla-estaciones-sin-datos"
    );


    [
        "temperatura",
        "humedad",
        "presion",
        "viento",
        "lluvia-dia",
        "lluvia-mes"
    ].forEach(
        campo => {
            asignarTextoFila(
                fila,
                campo,
                "—"
            );
        }
    );
}


/* ==========================================================
   CONSULTA DE CONDICIONES
   ========================================================== */


async function cargarEstacion(
    estacion
) {
    try {
        const respuesta =
            await fetch(
                `${obtenerApiBase()}/condiciones-actuales/${
                    encodeURIComponent(
                        estacion.codigo
                    )
                }`,
                {
                    cache: "no-store"
                }
            );


        if (
            !respuesta.ok
        ) {
            throw new Error(
                `HTTP ${respuesta.status}`
            );
        }


        const datos =
            await respuesta.json();


        mostrarDatosEstacion(
            estacion,
            datos
        );


        return true;

    } catch (
        error
    ) {
        console.error(
            `Error cargando ${estacion.codigo}:`,
            error
        );


        mostrarErrorEstacion(
            estacion
        );


        return false;
    }
}


async function cargarCondiciones() {
    if (
        estacionesPublicas.length
        ===
        0
    ) {
        return;
    }


    const resultados =
        await Promise.all(
            estacionesPublicas.map(
                estacion =>
                    cargarEstacion(
                        estacion
                    )
            )
        );


    const correctas =
        resultados.filter(
            Boolean
        ).length;


    establecerEstado(
        `${correctas}/${estacionesPublicas.length} estaciones · actualizado ${obtenerHoraActual()}`,
        correctas
        !==
        estacionesPublicas.length
    );
}


/* ==========================================================
   REFRESCOS
   ========================================================== */


async function refrescarCatalogo() {
    try {
        await cargarCatalogoEstaciones();

        return true;

    } catch (
        error
    ) {
        console.error(
            "Error cargando catálogo público de estaciones:",
            error
        );


        establecerEstado(
            "No se ha podido actualizar el catálogo de estaciones.",
            true
        );


        return false;
    }
}


/* ==========================================================
   INICIALIZACIÓN
   ========================================================== */


async function inicializarTablaEstaciones() {
    const catalogoCargado =
        await refrescarCatalogo();


    if (
        catalogoCargado
    ) {
        await cargarCondiciones();
    }


    window.setInterval(
        cargarCondiciones,
        INTERVALO_CONDICIONES_MS
    );


    window.setInterval(
        refrescarCatalogo,
        INTERVALO_CATALOGO_MS
    );
}


if (
    document.readyState
    ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        inicializarTablaEstaciones,
        {
            once: true
        }
    );

} else {
    inicializarTablaEstaciones();
}


// Fin de fichero: js/tabla-estaciones.js