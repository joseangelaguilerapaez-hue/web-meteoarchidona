/*
 * MeteoArchidona
 * Administración
 *
 * Comunicación común con la API administrativa.
 *
 * Este módulo concentra:
 *
 * - rutas administrativas compartidas,
 * - lectura de la sesión administrativa,
 * - construcción de peticiones autenticadas,
 * - tratamiento uniforme de errores HTTP,
 * - lectura de respuestas JSON.
 *
 * Todavía no sustituye al código equivalente del antiguo
 * js/administracion.js. Se incorpora de forma aislada para poder
 * validar cada módulo antes de conectar toda la nueva arquitectura.
 */


import {
    estadoAdministracion
} from "./estado.js";


/* ==========================================================
   CONFIGURACIÓN
   ========================================================== */

export const LONGITUD_PIN=
    6;


/*
 * js/api.js debe haberse cargado antes en la página.
 *
 * En local:
 *     apunta al proxy de servidor.py.
 *
 * En producción:
 *     apunta a la API de MeteoArchidona en Render.
 */
export const URL_API=
    window.API_BASE;


/* ==========================================================
   RUTAS ADMINISTRATIVAS
   ========================================================== */

export const RUTA_ACCESO=
    "/admin/acceso";

export const RUTA_ESTACIONES=
    "/admin/estaciones";

export const RUTA_CATALOGOS=
    "/admin/estaciones/catalogos";

export const RUTA_WEATHERLINK=
    "/admin/weatherlink";

export const RUTA_EUMETSAT=
    "/admin/eumetsat";

export const RUTA_SQL=
    "/admin/sql";


/* ==========================================================
   CLAVES DE SESIÓN
   ========================================================== */

export const CLAVE_TOKEN=
    "meteoarchidona_admin_token";

export const CLAVE_TIPO_TOKEN=
    "meteoarchidona_admin_tipo_token";

export const CLAVE_EXPIRACION=
    "meteoarchidona_admin_expira_en";


/* ==========================================================
   SESIÓN
   ========================================================== */

export function obtenerToken(){

    return sessionStorage.getItem(
        CLAVE_TOKEN
    )
}


export function obtenerTipoToken(){

    return (
        sessionStorage.getItem(
            CLAVE_TIPO_TOKEN
        )
        ||
        "bearer"
    )
}


export function obtenerExpiracion(){

    const numero=
        Number(
            sessionStorage.getItem(
                CLAVE_EXPIRACION
            )
        );

    return Number.isFinite(
        numero
    )
    ?
    numero
    :
    null
}


export function sesionEsValida(){

    const token=
        obtenerToken();

    const expiracion=
        obtenerExpiracion();

    return !!(
        token
        &&
        expiracion
        &&
        expiracion
        >
        Math.floor(
            Date.now()/1000
        )
    )
}


export function guardarSesion(
    datos
){

    sessionStorage.setItem(
        CLAVE_TOKEN,
        datos.token
    );

    sessionStorage.setItem(
        CLAVE_TIPO_TOKEN,
        datos.tipo_token
        ||
        "bearer"
    );

    sessionStorage.setItem(
        CLAVE_EXPIRACION,
        String(
            datos.expira_en
        )
    )
}


export function eliminarSesion(){

    sessionStorage.removeItem(
        CLAVE_TOKEN
    );

    sessionStorage.removeItem(
        CLAVE_TIPO_TOKEN
    );

    sessionStorage.removeItem(
        CLAVE_EXPIRACION
    )
}


/* ==========================================================
   TRATAMIENTO DE ERRORES HTTP
   ========================================================== */

export async function detalleError(
    respuesta
){

    try{

        const datos=
            await respuesta.clone().json();

        if(
            datos
            &&
            typeof datos.detail
            ===
            "string"
            &&
            datos.detail.trim()
        ){
            return datos.detail
        }

    }catch{
    }

    return (
        "La operación no pudo completarse. "
        +
        `HTTP ${respuesta.status}.`
    )
}


export async function comprobar(
    respuesta
){

    if(respuesta.ok){
        return respuesta
    }

    const error=
        new Error(
            await detalleError(
                respuesta
            )
        );

    error.codigoHttp=
        respuesta.status;

    error.retryAfter=
        respuesta.headers.get(
            "Retry-After"
        );

    throw error
}


/* ==========================================================
   PETICIONES ADMINISTRATIVAS
   ========================================================== */

export async function peticionAdministrativa(
    ruta,
    opciones={}
){

    if(!sesionEsValida()){

        const error=
            new Error(
                "Sesión administrativa no disponible."
            );

        error.codigoHttp=
            401;

        error.sesionCaducada=
            true;

        throw error
    }

    const cabeceras=
        new Headers(
            opciones.headers
            ||
            {}
        );

    cabeceras.set(
        "Authorization",
        `Bearer ${obtenerToken()}`
    );

    if(
        opciones.body
        &&
        !(
            opciones.body
            instanceof
            FormData
        )
        &&
        !cabeceras.has(
            "Content-Type"
        )
    ){
        cabeceras.set(
            "Content-Type",
            "application/json"
        )
    }

    const respuesta=
        await fetch(
            URL_API+ruta,
            {
                ...opciones,
                headers:cabeceras,
                cache:"no-store"
            }
        );

    try{

        return await comprobar(
            respuesta
        );

    }catch(error){

        if(
            error.codigoHttp
            ===
            401
        ){
            error.sesionCaducada=
                true
        }

        throw error
    }
}


export async function peticionJson(
    ruta,
    opciones={}
){

    return (
        await peticionAdministrativa(
            ruta,
            opciones
        )
    ).json()
}


/* ==========================================================
   LIMPIEZA DE ESTADO RELACIONADO CON SESIÓN
   ========================================================== */

export function marcarSesionCerrada(){

    estadoAdministracion.pinIntroducido=
        "";

    estadoAdministracion.solicitudEnCurso=
        false
}


// Fin de fichero: js/administracion/api.js