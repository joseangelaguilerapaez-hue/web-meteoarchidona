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
 * - cargar cámaras cuando exista su panel administrativo;
 * - coordinar estaciones y simulación;
 * - inicializar todos los manejadores de eventos;
 * - restaurar una sesión administrativa existente;
 * - limpiar los módulos al cerrar sesión;
 * - gestionar la navegación entre módulos administrativos.
 *
 * Este fichero constituye el punto de entrada utilizado por:
 *
 *     pages/administracion.html
 *
 * Los módulos se mantienen separados por responsabilidad.
 *
 * La incorporación de un módulo nuevo no debe alterar el
 * comportamiento de los módulos administrativos existentes.
 */

import {
    $,
    estadoAdministracion,
    mostrarEstado,
    establecerCatalogos
} from "./estado.js?v=20261010-cache1";

import {
    RUTA_CATALOGOS,
    peticionJson
} from "./api.js?v=20261010-cache1";

import {
    configurarCallbacksAcceso,
    configurarEventosAcceso,
    recuperarSesion
} from "./acceso.js?v=20261010-cache1";

import {
    configurarCallbacksEstaciones,
    configurarEventosEstaciones,
    cargarOpcionesEstaciones,
    cargarEstaciones,
    actualizarResumenEstaciones,
    renderizarEstaciones,
    actualizarSelectReferenciaGeneral,
    seleccionarEstacion
} from "./estaciones.js?v=20261010-cache1";

import {
    cargarCamaras,
    configurarEventosCamaras,
    limpiarCamaras
} from "./camaras.js?v=20261010-cache1";

import {
    configurarEventosSimulacion,
    cargarOpcionesSimulacion,
    estacionesActualizadas,
    estacionSeleccionada,
    ocultarEditoresReglas
} from "./simulacion.js?v=20261010-cache1";

import {
    configurarEventosWeatherlink,
    limpiarWeatherlink
} from "./weatherlink.js?v=20261010-cache1";

import {
    configurarEventosEumetsat,
    limpiarEumetsat
} from "./eumetsat.js?v=20261010-cache1";

import {
    configurarEventosSql,
    limpiarSql
} from "./sql.js?v=20261010-cache1";


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
   CÁMARAS
   ========================================================== */

async function cargarModuloCamaras(){
    /*
     * Durante la incorporación progresiva del subsistema,
     * el archivo JavaScript puede existir antes de que
     * se haya añadido su sección a administracion.html.
     *
     * En ese caso no se realiza ninguna petición.
     *
     * Cuando el panel exista, las cámaras se cargarán
     * utilizando la sesión administrativa común.
     *
     * Un problema específico del catálogo de cámaras
     * no debe impedir utilizar el resto de Administración.
     */

    if(
        !$("modulo-camaras")
    ){
        return
    }

    try{

        await cargarCamaras()

    }catch(error){

        console.error(
            "No se ha podido cargar Administración de Cámaras.",
            error
        )

        /*
         * cargarCamaras ya informa del error en
         * el panel específico de cámaras.
         *
         * No se propaga para evitar bloquear
         * la carga administrativa general.
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

        /*
         * Las cámaras se cargan después de las estaciones
         * para que el módulo pueda mostrar los nombres
         * públicos de sus estaciones asociadas.
         *
         * La carga es independiente y no impide utilizar
         * el resto del panel si falla.
         */
        await cargarModuloCamaras();

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

    limpiarCamaras();

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

    configurarEventosCamaras();

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