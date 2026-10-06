"use strict";

/*
 * MeteoArchidona
 * Tabla de estaciones
 *
 * Construcción dinámica de la tabla de estaciones y aplicación de la
 * escala cromática meteorológica.
 *
 * Las estaciones se descubren mediante:
 *
 *     GET /estaciones
 *
 * Para cada estación se consultan sus condiciones mediante:
 *
 *     GET /condiciones-actuales/{codigo}
 *
 * Las dos celdas de lluvia se colorean con tasa_lluvia_mm_h.
 * Los valores mostrados siguen siendo los acumulados diario y mensual.
 *
 * Los nombres compactos son únicamente una decisión de presentación
 * de esta tabla. No condicionan el catálogo dinámico de estaciones:
 * cualquier estación futura sin alias seguirá apareciendo normalmente.
 */


const INTERVALO_CONDICIONES_MS = 60_000;
const INTERVALO_CATALOGO_MS = 300_000;


const CLASES_METEO = [
    "meteo-azul",
    "meteo-cian",
    "meteo-verde",
    "meteo-ambar",
    "meteo-naranja",
    "meteo-rojo",
    "meteo-gris",
    "meteo-neutro"
];


let estacionesPublicas = [];


/* ==========================================================
   UTILIDADES
   ========================================================== */


function obtenerApiBase() {
    const apiBase = String(
        window.API_BASE || ""
    )
        .trim()
        .replace(/\/+$/, "");

    if (!apiBase) {
        throw new Error(
            "window.API_BASE no está definido."
        );
    }

    return apiBase;
}


function normalizarCodigoEstacion(codigo) {
    return String(
        codigo ?? ""
    )
        .trim()
        .toUpperCase();
}


function numeroValido(valor) {
    return (
        valor !== null
        &&
        valor !== undefined
        &&
        valor !== ""
        &&
        Number.isFinite(Number(valor))
    );
}


function formatearNumero(
    valor,
    decimales = 1
) {
    if (!numeroValido(valor)) {
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
    const numero = formatearNumero(
        valor,
        decimales
    );

    return numero === null
        ? "—"
        : `${numero} ${unidad}`;
}


function obtenerDireccionCardinal(grados) {
    if (!numeroValido(grados)) {
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

    const valor = (
        Number(grados) % 360 + 360
    ) % 360;

    return direcciones[
        Math.round(
            valor / 22.5
        ) % 16
    ];
}


function formatearViento(datos) {
    const velocidad = formatearNumero(
        datos?.viento_actual_kmh
    );

    if (velocidad === null) {
        return "—";
    }

    const direccion = obtenerDireccionCardinal(
        datos?.direccion_viento_grados
    );

    return direccion
        ? `${velocidad} km/h · ${direccion}`
        : `${velocidad} km/h`;
}


/* ==========================================================
   NOMBRES COMPACTOS
   ========================================================== */


/*
 * Normaliza únicamente para poder reconocer de forma robusta
 * los nombres a los que se aplica un alias visual.
 */
function normalizarNombreEstacion(nombre) {
    return String(
        nombre ?? ""
    )
        .trim()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /\s+/g,
            " "
        )
        .toUpperCase();
}


/*
 * Alias exclusivamente visuales para la tabla compacta.
 *
 * No constituyen una lista de estaciones.
 * Las estaciones se siguen obteniendo siempre desde /estaciones.
 */
function compactarNombreEstacion(nombre) {
    const original = String(
        nombre ?? ""
    ).trim();

    if (!original) {
        return "";
    }

    const clave = normalizarNombreEstacion(
        original
    );


    if (
        clave.startsWith(
            "EL SILO"
        )
    ) {
        return "Silo";
    }


    if (
        clave.startsWith(
            "LOS LLANOS"
        )
    ) {
        return "Llanos";
    }


    if (
        clave.startsWith(
            "SALINAS"
        )
    ) {
        return "Salinas";
    }


    if (
        clave.includes(
            "PUERTA DE LA HOYA"
        )
    ) {
        return "La Hoya";
    }


    if (
        clave.startsWith(
            "LA VEGA"
        )
    ) {
        return "La Vega";
    }


    return original;
}


function obtenerNombreVisible(
    estacion,
    datos = null
) {
    const nombre =
        datos?.nombre_estacion
        ||
        estacion?.nombre_publico
        ||
        estacion?.codigo
        ||
        "";

    return (
        compactarNombreEstacion(
            nombre
        )
        ||
        estacion?.codigo
        ||
        "—"
    );
}


function obtenerCuerpoTabla() {
    return document.getElementById(
        "tabla-estaciones-cuerpo"
    );
}


function obtenerFila(codigo) {
    const cuerpo = obtenerCuerpoTabla();

    if (!cuerpo) {
        return null;
    }

    return Array.from(
        cuerpo.querySelectorAll(
            "tr[data-codigo-estacion]"
        )
    ).find(
        fila =>
            fila.dataset.codigoEstacion
            ===
            codigo
    ) || null;
}


function obtenerCelda(
    fila,
    campo
) {
    return fila?.querySelector(
        `[data-campo="${campo}"]`
    ) || null;
}


function asignarTextoFila(
    fila,
    campo,
    texto
) {
    const celda = obtenerCelda(
        fila,
        campo
    );

    if (celda) {
        celda.textContent = texto;
    }
}


function establecerEstado(
    texto,
    esError = false
) {
    const elemento = document.getElementById(
        "tabla-estaciones-estado"
    );

    if (!elemento) {
        return;
    }

    elemento.textContent = texto;

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
   CLASIFICACIÓN CROMÁTICA
   ========================================================== */


function claseTemperatura(valor) {
    if (!numeroValido(valor)) {
        return "meteo-gris";
    }

    const n = Number(valor);

    if (n < 0) {
        return "meteo-azul";
    }

    if (n < 10) {
        return "meteo-cian";
    }

    if (n < 20) {
        return "meteo-verde";
    }

    if (n < 30) {
        return "meteo-ambar";
    }

    if (n <= 35) {
        return "meteo-naranja";
    }

    return "meteo-rojo";
}


function claseHumedad(valor) {
    if (!numeroValido(valor)) {
        return "meteo-gris";
    }

    const n = Number(valor);

    if (n < 30) {
        return "meteo-ambar";
    }

    if (n < 60) {
        return "meteo-verde";
    }

    if (n <= 80) {
        return "meteo-cian";
    }

    return "meteo-azul";
}


function clasePresion(valor) {
    if (!numeroValido(valor)) {
        return "meteo-gris";
    }

    const n = Number(valor);

    if (n < 1000) {
        return "meteo-azul";
    }

    if (n < 1015) {
        return "meteo-cian";
    }

    if (n <= 1025) {
        return "meteo-verde";
    }

    return "meteo-ambar";
}


function claseViento(valor) {
    if (!numeroValido(valor)) {
        return "meteo-gris";
    }

    const n = Number(valor);

    if (n < 5) {
        return "meteo-gris";
    }

    if (n < 20) {
        return "meteo-verde";
    }

    if (n < 40) {
        return "meteo-ambar";
    }

    if (n <= 60) {
        return "meteo-naranja";
    }

    return "meteo-rojo";
}


function claseLluvia(tasa) {
    if (!numeroValido(tasa)) {
        return "meteo-gris";
    }

    const n = Number(tasa);

    if (n <= 0) {
        return "meteo-neutro";
    }

    if (n < 0.5) {
        return "meteo-cian";
    }

    if (n < 2) {
        return "meteo-azul";
    }

    if (n < 10) {
        return "meteo-naranja";
    }

    return "meteo-rojo";
}


function aplicarClaseMeteorologica(
    fila,
    campo,
    clase
) {
    const celda = obtenerCelda(
        fila,
        campo
    );

    if (!celda) {
        return;
    }

    celda.classList.remove(
        ...CLASES_METEO
    );

    celda.classList.add(
        clase
    );
}


function colorearDatosEstacion(
    fila,
    datos
) {
    aplicarClaseMeteorologica(
        fila,
        "temperatura",
        claseTemperatura(
            datos?.temperatura_c
        )
    );

    aplicarClaseMeteorologica(
        fila,
        "humedad",
        claseHumedad(
            datos?.humedad_pct
        )
    );

    aplicarClaseMeteorologica(
        fila,
        "presion",
        clasePresion(
            datos?.presion_hpa
        )
    );

    aplicarClaseMeteorologica(
        fila,
        "viento",
        claseViento(
            datos?.viento_actual_kmh
        )
    );

    const lluvia = claseLluvia(
        datos?.tasa_lluvia_mm_h
    );

    aplicarClaseMeteorologica(
        fila,
        "lluvia-dia",
        lluvia
    );

    aplicarClaseMeteorologica(
        fila,
        "lluvia-mes",
        lluvia
    );
}


function colorearErrorEstacion(fila) {
    [
        "temperatura",
        "humedad",
        "presion",
        "viento",
        "lluvia-dia",
        "lluvia-mes"
    ].forEach(
        campo =>
            aplicarClaseMeteorologica(
                fila,
                campo,
                "meteo-gris"
            )
    );
}


/* ==========================================================
   FILAS DINÁMICAS
   ========================================================== */


function crearCelda(
    clase,
    campo
) {
    const celda = document.createElement(
        "td"
    );

    celda.className = clase;

    celda.dataset.campo = campo;

    celda.textContent = "—";

    return celda;
}


function crearFilaEstacion(estacion) {
    const fila = document.createElement(
        "tr"
    );

    fila.dataset.codigoEstacion =
        estacion.codigo;


    const nombre = crearCelda(
        "tabla-estaciones-nombre",
        "nombre"
    );

    nombre.textContent =
        obtenerNombreVisible(
            estacion
        );

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


function crearFilaVacia(texto) {
    const fila = document.createElement(
        "tr"
    );

    const celda = document.createElement(
        "td"
    );

    fila.className =
        "tabla-estaciones-vacia";

    celda.colSpan = 7;

    celda.textContent = texto;

    fila.appendChild(
        celda
    );

    return fila;
}


function sincronizarFilas() {
    const cuerpo = obtenerCuerpoTabla();

    if (!cuerpo) {
        return;
    }


    cuerpo.querySelectorAll(
        ".tabla-estaciones-cargando, .tabla-estaciones-vacia"
    ).forEach(
        elemento =>
            elemento.remove()
    );


    const codigosValidos = new Set(
        estacionesPublicas.map(
            estacion =>
                estacion.codigo
        )
    );


    cuerpo.querySelectorAll(
        "tr[data-codigo-estacion]"
    ).forEach(
        fila => {
            if (
                !codigosValidos.has(
                    fila.dataset.codigoEstacion
                )
            ) {
                fila.remove();
            }
        }
    );


    estacionesPublicas.forEach(
        estacion => {
            let fila = obtenerFila(
                estacion.codigo
            );

            if (!fila) {
                fila = crearFilaEstacion(
                    estacion
                );
            }

            asignarTextoFila(
                fila,
                "nombre",
                obtenerNombreVisible(
                    estacion
                )
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

    const codigosVistos = new Set();


    estaciones.forEach(
        estacion => {
            const codigo = normalizarCodigoEstacion(
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
    const respuesta = await fetch(
        `${obtenerApiBase()}/estaciones`,
        {
            cache: "no-store"
        }
    );

    if (!respuesta.ok) {
        throw new Error(
            `HTTP ${respuesta.status}`
        );
    }


    const datos = await respuesta.json();


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
    const fila = obtenerFila(
        estacion.codigo
    );

    if (!fila) {
        return;
    }


    fila.classList.remove(
        "tabla-estaciones-sin-datos"
    );


    asignarTextoFila(
        fila,
        "nombre",
        obtenerNombreVisible(
            estacion,
            datos
        )
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


    colorearDatosEstacion(
        fila,
        datos
    );
}


function mostrarErrorEstacion(estacion) {
    const fila = obtenerFila(
        estacion.codigo
    );

    if (!fila) {
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
        campo =>
            asignarTextoFila(
                fila,
                campo,
                "—"
            )
    );


    colorearErrorEstacion(
        fila
    );
}


/* ==========================================================
   CONSULTA DE CONDICIONES
   ========================================================== */


async function cargarEstacion(estacion) {
    try {
        const respuesta = await fetch(
            `${obtenerApiBase()}/condiciones-actuales/${
                encodeURIComponent(
                    estacion.codigo
                )
            }`,
            {
                cache: "no-store"
            }
        );

        if (!respuesta.ok) {
            throw new Error(
                `HTTP ${respuesta.status}`
            );
        }


        const datos = await respuesta.json();


        mostrarDatosEstacion(
            estacion,
            datos
        );


        return true;

    } catch (error) {
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


    const resultados = await Promise.all(
        estacionesPublicas.map(
            estacion =>
                cargarEstacion(
                    estacion
                )
        )
    );


    const correctas = resultados.filter(
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

        await cargarCondiciones();

        return true;

    } catch (error) {
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
    await refrescarCatalogo();


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