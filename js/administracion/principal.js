
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
 * - cargar productos timelapse y publicaciones;
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
 *
 * Timelapses:
 *
 *     timelapses.js
 *         -> programaciones
 *
 *     timelapses-productos.js
 *         -> productos MP4 y publicaciones
 *
 *     timelapses-pestanas.js
 *         -> navegación Configuración / Productos
 *
 * Los controladores son independientes.
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

import {
    configurarPestanasTimelapses
} from "./timelapses-pestanas.js?v=20261017-pestanas1";


/* ==========================================================
   ESTADO DEL MÓDULO DE PROGRAMACIONES TIMELAPSE
   ========================================================== */

/*
 * Las programaciones se cargan diferidamente.
 *
 * Mientras no exista el panel modulo-timelapses,
 * no se intenta importar timelapses.js.
 *
 * Conservamos la promesa para evitar importaciones
 * duplicadas durante recargas administrativas.
 */

let moduloTimelapses = null;

let promesaModuloTimelapses = null;


/* ==========================================================
   ESTADO DEL MÓDULO DE PRODUCTOS TIMELAPSE
   ========================================================== */

/*
 * Los productos MP4 y sus publicaciones utilizan
 * un componente administrativo independiente.
 *
 * No reutilizan el controlador de programaciones.
 *
 * El componente HTML se obtiene dinámicamente:
 *
 *     /componentes/admin-timelapses-productos.html
 *
 * Su JavaScript se importa únicamente cuando
 * existe el módulo administrativo de timelapses.
 */

let moduloProductosTimelapse = null;

let promesaModuloProductosTimelapse = null;


/* ==========================================================
   ESTADO DEL MÓDULO DE PATRULLAS
   ========================================================== */

/*
 * Mismo esquema que las programaciones de timelapse:
 * patrullas.js solo se importa si existe modulo-patrullas.
 */

let moduloPatrullas = null;

let promesaModuloPatrullas = null;


/* ==========================================================
   NAVEGACIÓN ENTRE MÓDULOS
   ========================================================== */

/*
 * Cada apartado ocupa la pantalla entera y tiene su propia dirección
 * (administracion#patrullas, #sql...). El índice (resumen) muestra el
 * menú; dentro de un apartado se oculta el menú y aparece la barra
 * «← Administración». Así funcionan «atrás», los favoritos y abrir un
 * apartado en otra pestaña.
 */

function moduloExiste(
    nombre
){
    return Boolean(
        nombre
        &&
        /^[a-z-]+$/.test(nombre)
        &&
        $(`modulo-${nombre}`)
    );
}


function moduloDesdeDireccion(){

    const nombre =
        window.location.hash.replace("#", "");

    return moduloExiste(nombre)
        ? nombre
        : "resumen";

}


function tituloModulo(
    nombre
){

    const enlace =
        document.querySelector(
            `.modulo-boton[data-modulo="${nombre}"]`
        );

    return (enlace?.textContent || nombre).trim();

}


export function activarModulo(
    nombre,
    {actualizarDireccion = true} = {}
){

    if(!moduloExiste(nombre)){
        nombre = "resumen";
    }

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

    const enApartado =
        nombre !== "resumen";

    $("panelAdministracion")
        ?.classList.toggle("en-modulo", enApartado);

    const barra =
        $("barraModulo");

    if(barra){
        barra.hidden = !enApartado;
        barra.classList.toggle("oculto", !enApartado);
    }

    const titulo =
        $("tituloModuloActual");

    if(titulo){
        titulo.textContent = enApartado ? tituloModulo(nombre) : "";
    }

    if(actualizarDireccion){

        const deseado =
            enApartado ? `#${nombre}` : "";

        if(window.location.hash !== deseado){
            history.pushState(
                null,
                "",
                `${window.location.pathname}${window.location.search}${deseado}`
            );
        }

    }

    window.scrollTo(0, 0);

}


function seguirDireccion(){

    activarModulo(
        moduloDesdeDireccion(),
        {actualizarDireccion: false}
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
   IMPORTACIÓN DIFERIDA DE PROGRAMACIONES
   ========================================================== */

async function obtenerModuloTimelapses(){

    /*
     * No importamos el módulo si la página
     * no contiene su sección administrativa.
     */

    if(
        !$("modulo-timelapses")
    ){
        return null;
    }

    if(
        promesaModuloTimelapses === null
    ){

        promesaModuloTimelapses = import(
            "./timelapses.js?v=20261025-zoom1"
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
   CARGA ADMINISTRATIVA DE PROGRAMACIONES
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
         * La configuración es idempotente para evitar
         * registrar eventos duplicados durante recargas.
         */

        modulo.configurarEventosTimelapses();

        /*
         * Consulta:
         *
         * GET /admin/timelapses/programaciones
         *
         * La carga de cámaras y presets específicos
         * corresponde a timelapses.js.
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
            "No se han podido cargar las programaciones de timelapse.",
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
   PATRULLAS
   ========================================================== */

async function obtenerModuloPatrullas(){

    if(!$("modulo-patrullas")){
        return null;
    }

    if(promesaModuloPatrullas === null){
        promesaModuloPatrullas = import(
            "./patrullas.js?v=20261025-patrullas1"
        );
    }

    try{
        moduloPatrullas = await promesaModuloPatrullas;
        return moduloPatrullas;
    }catch(error){
        promesaModuloPatrullas = null;
        moduloPatrullas = null;
        throw error;
    }

}


async function cargarModuloPatrullas(){

    if(!$("modulo-patrullas")){
        return;
    }

    try{
        const modulo = await obtenerModuloPatrullas();
        if(!modulo){
            return;
        }
        modulo.configurarEventosPatrullas();
        await modulo.cargarPatrullas();
    }catch(error){
        console.error(
            "No se ha podido cargar Administración de Patrullas.",
            error
        );
        mostrarEstado(
            $("estadoPatrullas"),
            error.message
            ||
            "No se han podido cargar las patrullas.",
            "error"
        );
    }

}


/* ==========================================================
   IMPORTACIÓN DIFERIDA DE PRODUCTOS TIMELAPSE
   ========================================================== */

async function obtenerModuloProductosTimelapse(){

    /*
     * Los productos utilizan el módulo administrativo
     * de Timelapses, con su propia pestaña y
     * un controlador independiente.
     */

    if(
        !$("modulo-timelapses")
    ){
        return null;
    }

    /*
     * Se reutiliza la importación cuando ya
     * exista una carga anterior del módulo.
     */

    if(
        promesaModuloProductosTimelapse === null
    ){

        promesaModuloProductosTimelapse = import(
            "./timelapses-productos.js?v=20261017-productos1"
        );

    }

    try{

        moduloProductosTimelapse =
            await promesaModuloProductosTimelapse;

        return moduloProductosTimelapse;

    }catch(error){

        promesaModuloProductosTimelapse = null;

        moduloProductosTimelapse = null;

        throw error;

    }

}


/* ==========================================================
   CARGA ADMINISTRATIVA DE PRODUCTOS TIMELAPSE
   ========================================================== */

async function cargarModuloProductosTimelapse(){

    if(
        !$("modulo-timelapses")
    ){
        return;
    }

    try{

        const modulo =
            await obtenerModuloProductosTimelapse();

        if(!modulo){
            return;
        }

        /*
         * Detectamos si el componente estaba
         * montado antes de iniciar la operación.
         *
         * El propio montaje realiza la primera
         * consulta de productos y cámaras.
         *
         * En las recargas posteriores solamente
         * actualizamos los productos, sin volver
         * a crear el HTML ni los eventos.
         */

        const estabaMontado = Boolean(
            $("panelProductosTimelapse")
        );

        /*
         * El componente se monta exclusivamente
         * dentro de la pestaña Productos.
         *
         * No se inserta directamente dentro
         * del módulo general de Timelapses.
         */

        const montado =
            await modulo.montarProductosTimelapse(
                "contenedorProductosTimelapses"
            );

        if(!montado){
            return;
        }

        if(estabaMontado){

            /*
             * Consulta:
             *
             * GET /admin/timelapses/productos
             *
             * Los filtros y la paginación
             * pertenecen al módulo de productos.
             */

            await modulo.cargarProductosTimelapse();

        }

    }catch(error){

        console.error(
            "No se pudo cargar Administración "
            + "de productos timelapse.",
            error
        );

        /*
         * Un error en los productos MP4 no debe
         * bloquear la administración de cámaras,
         * estaciones ni programaciones.
         */

        mostrarEstado(
            $("estadoTimelapses"),
            error.message
            ||
            "No se pudo cargar la gestión de productos timelapse.",
            "error"
        );

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
         * Preparar las dos pestañas de Timelapses
         * antes de cargar sus controladores.
         *
         * La operación es idempotente:
         * no duplica pestañas durante recargas.
         */

        configurarPestanasTimelapses();

        /*
         * Programaciones de timelapse.
         *
         * Conservamos íntegramente su controlador
         * y sus operaciones administrativas.
         *
         * Se muestran en Configuración.
         */

        await cargarModuloTimelapses();

        /*
         * Productos timelapse.
         *
         * Componente independiente dentro de
         * la pestaña Productos.
         *
         * El módulo monta su propia sección HTML,
         * consulta los MP4 y configura sus botones
         * de publicación y retirada.
         *
         * Los errores permanecen aislados.
         */

        await cargarModuloProductosTimelapse();

        await cargarModuloPatrullas();

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

    // Respeta el apartado pedido en la dirección (#patrullas...).
    seguirDireccion();

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
     * Limpiamos las programaciones cuando
     * su módulo ya se haya cargado.
     *
     * No importamos el módulo únicamente
     * para cerrar sesión.
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

    /*
     * Limpiamos también el componente de
     * productos y publicaciones.
     *
     * Esta operación:
     *
     * - invalida las consultas pendientes;
     * - elimina el listado del DOM;
     * - descarta el estado de los productos;
     * - conserva el módulo de programaciones;
     * - no borra ni modifica MP4 reales.
     */

    if(
        moduloProductosTimelapse
        &&
        typeof moduloProductosTimelapse
            .limpiarProductosTimelapse
        ===
        "function"
    ){

        moduloProductosTimelapse
            .limpiarProductosTimelapse();

    }

    if(
        moduloPatrullas
        &&
        typeof moduloPatrullas.limpiarPatrullas
        ===
        "function"
    ){
        moduloPatrullas.limpiarPatrullas();
    }

    history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`
    );

    activarModulo(
        "resumen",
        {actualizarDireccion: false}
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

    // Los apartados son enlaces (#patrullas...): el cambio de dirección
    // activa el apartado. «Atrás» y «adelante» también.
    window.addEventListener("hashchange", seguirDireccion);
    window.addEventListener("popstate", seguirDireccion);

    // «Resumen» del menú y «← Administración» vuelven al índice.
    document.querySelectorAll(
        'button.modulo-boton[data-modulo="resumen"], #botonVolverAdministracion'
    ).forEach(
        boton=>
            boton.addEventListener(
                "click",
                evento=>{
                    evento.preventDefault();
                    activarModulo("resumen");
                }
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
     * Los eventos de programaciones se configuran
     * cuando se importa timelapses.js.
     *
     * Los eventos de productos se configuran
     * durante el montaje de su componente HTML.
     *
     * Ambos controladores son independientes.
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
