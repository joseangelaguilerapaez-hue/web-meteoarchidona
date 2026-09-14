/*
 * MeteoArchidona
 * Administración
 *
 * Orquestador principal de la administración modular.
 *
 * Responsabilidades:
 *
 * - conectar los distintos módulos administrativos;
 * - cargar los catálogos generales;
 * - cargar estaciones;
 * - coordinar estaciones y simulación;
 * - inicializar todos los manejadores de eventos;
 * - restaurar una sesión administrativa existente;
 * - limpiar los módulos al cerrar sesión;
 * - gestionar la navegación entre módulos administrativos.
 *
 * Este fichero será el punto de entrada definitivo de Administración
 * cuando sustituyamos el antiguo js/administracion.js.
 *
 * De momento se incorpora sin modificar administracion.html para
 * poder validar el nuevo módulo antes del cambio final.
 */


import {
    $,
    estadoAdministracion,
    mostrarEstado,
    establecerCatalogos
} from "./estado.js";

import {
    RUTA_CATALOGOS,
    peticionJson
} from "./api.js";

import {
    configurarCallbacksAcceso,
    configurarEventosAcceso,
    recuperarSesion
} from "./acceso.js";

import {
    configurarCallbacksEstaciones,
    configurarEventosEstaciones,
    cargarOpcionesEstaciones,
    cargarEstaciones,
    actualizarResumenEstaciones,
    renderizarEstaciones,
    actualizarSelectReferenciaGeneral,
    seleccionarEstacion
} from "./estaciones.js";

import {
    configurarEventosSimulacion,
    cargarOpcionesSimulacion,
    estacionesActualizadas,
    estacionSeleccionada,
    ocultarEditoresReglas
} from "./simulacion.js";

import {
    configurarEventosWeatherlink,
    limpiarWeatherlink
} from "./weatherlink.js";

import {
    configurarEventosEumetsat,
    limpiarEumetsat
} from "./eumetsat.js";

import {
    configurarEventosSql,
    limpiarSql
} from "./sql.js";


/* ==========================================================
   NAVEGACIÓN ENTRE MÓDULOS
   ========================================================== */

export function activarModulo(
    nombre
){

    document.querySelectorAll(
        ".modulo"
    ).forEach(
        modulo=>
            modulo.classList.toggle(
                "activo",
                modulo.id
                ===
                `modulo-${nombre}`
            )
    );

    document.querySelectorAll(
        ".modulo-boton"
    ).forEach(
        boton=>
            boton.classList.toggle(
                "activo",
                boton.dataset.modulo
                ===
                nombre
            )
    )
}


/* ==========================================================
   CATÁLOGOS
   ========================================================== */

async function cargarCatalogos(){

    const datos=
        await peticionJson(
            RUTA_CATALOGOS
        );

    establecerCatalogos(
        datos
    );

    cargarOpcionesEstaciones();

    cargarOpcionesSimulacion();

    return estadoAdministracion.catalogos
}


/* ==========================================================
   CARGA GENERAL DE ADMINISTRACIÓN
   ========================================================== */

export async function cargarDatosAdministracion(){

    mostrarEstado(
        $("estadoPanel"),
        "Actualizando datos administrativos...",
        "info"
    );

    try{

        await cargarCatalogos();

        await cargarEstaciones();

        actualizarResumenEstaciones();

        renderizarEstaciones();

        actualizarSelectReferenciaGeneral();

        estacionesActualizadas();

        /*
         * Si en una futura recarga administrativa ya hubiera una
         * estación seleccionada, se conserva la selección y se
         * recuperan sus datos completos y sus reglas.
         */
        if(
            estadoAdministracion.codigoEdicion
            &&
            estadoAdministracion
                .estaciones
                .some(
                    estacion=>
                        estacion.codigo
                        ===
                        estadoAdministracion
                            .codigoEdicion
                )
        ){

            await seleccionarEstacion(
                estadoAdministracion
                    .codigoEdicion
            )
        }

        mostrarEstado(
            $("estadoPanel"),
            "Datos administrativos actualizados.",
            "ok"
        );

        return true

    }catch(error){

        mostrarEstado(
            $("estadoPanel"),
            error.message
            ||
            "No ha sido posible cargar los datos administrativos.",
            "error"
        );

        throw error
    }
}


/* ==========================================================
   APERTURA DE SESIÓN
   ========================================================== */

async function alAbrirSesion(){

    await cargarDatosAdministracion();

    activarModulo(
        "resumen"
    )
}


/* ==========================================================
   CIERRE DE SESIÓN
   ========================================================== */

async function alCerrarSesion(){

    ocultarEditoresReglas();

    limpiarWeatherlink();

    limpiarEumetsat();

    limpiarSql();

    activarModulo(
        "resumen"
    )
}


/* ==========================================================
   COORDINACIÓN ESTACIONES / SIMULACIÓN
   ========================================================== */

async function alSeleccionarEstacion(
    estacion
){

    await estacionSeleccionada(
        estacion
    )
}


async function alActualizarEstaciones(){

    estacionesActualizadas()
}


/* ==========================================================
   CONFIGURACIÓN DE CALLBACKS
   ========================================================== */

function configurarCallbacks(){

    configurarCallbacksAcceso(
        {
            alAbrirSesion,
            alCerrarSesion
        }
    );

    configurarCallbacksEstaciones(
        {
            alSeleccionarEstacion,
            alActualizarEstaciones
        }
    )
}


/* ==========================================================
   EVENTOS GENERALES
   ========================================================== */

function configurarEventosGenerales(){

    $("botonActualizar")
        ?.addEventListener(
            "click",
            ()=>
                void cargarDatosAdministracion()
        );

    document.querySelectorAll(
        ".modulo-boton"
    ).forEach(
        boton=>
            boton.addEventListener(
                "click",
                ()=>
                    activarModulo(
                        boton.dataset.modulo
                    )
            )
    );

    document.querySelectorAll(
        "[data-ir-modulo]"
    ).forEach(
        boton=>
            boton.addEventListener(
                "click",
                ()=>
                    activarModulo(
                        boton.dataset.irModulo
                    )
            )
    )
}


/* ==========================================================
   CONFIGURACIÓN DE TODOS LOS EVENTOS
   ========================================================== */

function configurarEventos(){

    configurarEventosGenerales();

    configurarEventosAcceso();

    configurarEventosEstaciones();

    configurarEventosSimulacion();

    configurarEventosWeatherlink();

    configurarEventosEumetsat();

    configurarEventosSql()
}


/* ==========================================================
   INICIALIZACIÓN
   ========================================================== */

export async function iniciarAdministracion(){

    configurarCallbacks();

    configurarEventos();

    try{

        await recuperarSesion()

    }catch(error){

        console.error(
            "No ha sido posible iniciar Administración.",
            error
        );

        mostrarEstado(
            $("estadoPanel"),
            error.message
            ||
            "No ha sido posible iniciar Administración.",
            "error"
        )
    }
}


/* ==========================================================
   ARRANQUE
   ========================================================== */

void iniciarAdministracion();


// Fin de fichero: js/administracion/principal.js