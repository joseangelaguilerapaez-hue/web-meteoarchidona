
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
 * - cargar cámaras;
 * - cargar programaciones de timelapse;
 * - coordinar estaciones y simulación;
 * - inicializar efectos y manejadores de eventos;
 * - restaurar una sesión administrativa existente;
 * - limpiar los módulos al cerrar sesión;
 * - gestionar la navegación administrativa.
 *
 * Este fichero es el punto de entrada utilizado por:
 *
 *     pages/administracion.html
 *
 * La incorporación de nuevos módulos no debe alterar
 * el comportamiento de los ya existentes.
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
    cargarCamaras,
    configurarEventosCamaras,
    limpiarCamaras
} from "./camaras.js?v=20261011-presets1";

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
} from "./sql.js?v=20261009-sqlcopiar2";


/* ==========================================================
   ESTADO DEL MÓDULO DE TIMELAPSES
   ========================================================== */

/*
 * El módulo de timelapses se incorpora progresivamente.
 *
 * Su carga es diferida para permitir:
 *
 * 1. registrar primero este orquestador;
 * 2. crear posteriormente timelapses.js;
 * 3. añadir finalmente su sección HTML.
 *
 * Mientras no exista el panel modulo-timelapses,
 * no se intenta importar el archivo JavaScript.
 *
 * De esta forma se conserva la disponibilidad
 * de los módulos administrativos existentes.
 */

let moduloTimelapses = null;

let promesaModuloTimelapses = null;


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
    );

}


/* ==========================================================
   CATÁLOGOS
   ========================================================== */

async function cargarCatalogos(){

    const datos =
        await peticionJson(
            RUTA_CATALOGOS
        );

    establecerCatalogos(
        datos
    );

    cargarOpcionesEstaciones();

    cargarOpcionesSimulacion();

    return estadoAdministracion.catalogos;

}


/* ==========================================================
   CÁMARAS
   ========================================================== */

async function cargarModuloCamaras(){

    /*
     * La carga del módulo de cámaras es independiente.
     *
     * Un fallo específico no debe bloquear
     * el resto de Administración.
     */

    if(
        !$("modulo-camaras")
    ){
        return;
    }

    try{

        await cargarCamaras();

    }catch(error){

        console.error(
            "No se ha podido cargar Administración de Cámaras.",
            error
        );

        /*
         * cargarCamaras informa del error dentro
         * del panel administrativo correspondiente.
         */

    }

}


/* ==========================================================
   IMPORTACIÓN DIFERIDA DE TIMELAPSES
   ========================================================== */

async function obtenerModuloTimelapses(){

    /*
     * Todavía no se importa ningún JavaScript
     * si la página no contiene el módulo.
     */

    if(
        !$("modulo-timelapses")
    ){
        return null;
    }

    /*
     * Conservamos la misma promesa para evitar
     * importaciones duplicadas cuando se solicitan
     * varias recargas administrativas.
     */

    if(
        promesaModuloTimelapses === null
    ){

        promesaModuloTimelapses = import(
            "./timelapses.js?v=20261012-nombres2"
        );

    }

    try{

        moduloTimelapses =
            await promesaModuloTimelapses;

        return moduloTimelapses;

    }catch(error){

        /*
         * Permite reintentar la carga si falló
         * por una incidencia temporal.
         */

        promesaModuloTimelapses = null;

        moduloTimelapses = null;

        throw error;

    }

}


/* ==========================================================
   CARGA ADMINISTRATIVA DE TIMELAPSES
   ========================================================== */

async function cargarModuloTimelapses(){

    if(
        !$("modulo-timelapses")
    ){
        return;
    }

    try{

        const modulo =
            await obtenerModuloTimelapses();

        if(!modulo){
            return;
        }

        /*
         * El módulo proporciona sus propios eventos.
         *
         * La configuración deberá ser idempotente
         * para evitar registrar eventos duplicados
         * durante recargas administrativas.
         */

        modulo.configurarEventosTimelapses();

        /*
         * Consulta:
         *
         * GET /admin/timelapses/programaciones
         *
         * La carga de cámaras y presets específicos
         * será responsabilidad de timelapses.js.
         */

        await modulo.cargarTimelapses();

    }catch(error){

        console.error(
            "No se ha podido cargar Administración de Timelapses.",
            error
        );

        mostrarEstado(
            $("estadoTimelapses"),
            error.message
            ||
            "No se ha podido cargar las programaciones de timelapse.",
            "error"
        );

        /*
         * La incidencia permanece aislada.
         *
         * Los demás módulos administrativos
         * deben continuar funcionando.
         */

    }

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
         * Restaurar la estación seleccionada cuando
         * continúe existiendo en el catálogo.
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
            );

        }

        /*
         * Cámaras.
         *
         * Se cargan después de las estaciones
         * para poder mostrar su nombre público.
         */

        await cargarModuloCamaras();

        /*
         * Timelapses.
         *
         * El módulo se carga después de cámaras.
         *
         * Su funcionamiento es independiente
         * y cualquier error queda aislado.
         */

        await cargarModuloTimelapses();

        mostrarEstado(
            $("estadoPanel"),
            "Datos administrativos actualizados.",
            "ok"
        );

        return true;

    }catch(error){

        mostrarEstado(
            $("estadoPanel"),
            error.message
            ||
            "No ha sido posible cargar los datos administrativos.",
            "error"
        );

        throw error;

    }

}


/* ==========================================================
   APERTURA DE SESIÓN
   ========================================================== */

async function alAbrirSesion(){

    await cargarDatosAdministracion();

    activarModulo(
        "resumen"
    );

}


/* ==========================================================
   CIERRE DE SESIÓN
   ========================================================== */

async function alCerrarSesion(){

    ocultarEditoresReglas();

    limpiarWeatherlink();

    limpiarEumetsat();

    limpiarSql();

    limpiarCamaras();

    /*
     * Limpiamos también las programaciones
     * cuando el módulo ya se haya cargado.
     *
     * No es necesario importar el módulo
     * únicamente para cerrar sesión.
     */

    if(
        moduloTimelapses
        &&
        typeof moduloTimelapses.limpiarTimelapses
        ===
        "function"
    ){

        moduloTimelapses.limpiarTimelapses();

    }

    activarModulo(
        "resumen"
    );

}


/* ==========================================================
   COORDINACIÓN ESTACIONES / SIMULACIÓN
   ========================================================== */

async function alSeleccionarEstacion(
    estacion
){

    await estacionSeleccionada(
        estacion
    );

}


async function alActualizarEstaciones(){

    estacionesActualizadas();

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
    );

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
    );

}


/* ==========================================================
   CONFIGURACIÓN DE TODOS LOS EVENTOS
   ========================================================== */

function configurarEventos(){

    configurarEventosGenerales();

    configurarEventosAcceso();

    configurarEventosEstaciones();

    configurarEventosCamaras();

    configurarEventosSimulacion();

    configurarEventosWeatherlink();

    configurarEventosEumetsat();

    configurarEventosSql();

    /*
     * Los eventos de Timelapses se configurarán
     * cuando se importe su módulo diferido.
     */

}


/* ==========================================================
   INICIALIZACIÓN
   ========================================================== */

export async function iniciarAdministracion(){

    configurarCallbacks();

    configurarEventos();

    try{

        await recuperarSesion();

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
        );

    }

}


/* ==========================================================
   ARRANQUE
   ========================================================== */

void iniciarAdministracion();


// Fin de fichero: js/administracion/principal.js
