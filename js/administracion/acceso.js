/*
 * MeteoArchidona
 * Administración
 *
 * Acceso administrativo y control de sesión.
 *
 * Este módulo concentra:
 *
 * - teclado y PIN administrativo,
 * - solicitud de acceso,
 * - apertura y cierre visual del panel,
 * - reloj de caducidad,
 * - cierre de sesión,
 * - recuperación de una sesión todavía válida.
 *
 * De momento este fichero se incorpora sin sustituir todavía al
 * código equivalente de js/administracion.js. La conexión definitiva
 * se hará cuando estén preparados todos los módulos.
 */


import {
    $,
    estadoAdministracion,
    mostrarEstado,
    reiniciarEstadoAdministracion
} from "./estado.js";

import {
    LONGITUD_PIN,
    URL_API,
    RUTA_ACCESO,
    comprobar,
    sesionEsValida,
    guardarSesion,
    eliminarSesion,
    obtenerExpiracion
} from "./api.js";


/* ==========================================================
   CALLBACKS DE INTEGRACIÓN
   ========================================================== */

/*
 * acceso.js no debe conocer cómo se cargan estaciones, reglas,
 * WeatherLink, EUMETSAT o SQL.
 *
 * principal.js podrá registrar aquí las acciones que deban
 * ejecutarse cuando se abra o se cierre una sesión.
 */

let callbackSesionAbierta=null;
let callbackSesionCerrada=null;


/* ==========================================================
   ELEMENTOS DEL DOM
   ========================================================== */

function contenidoAcceso(){

    return $("contenidoAcceso")
}


function panelAdministracion(){

    return $("panelAdministracion")
}


function indicadorPin(){

    return $("indicadorPin")
}


function estadoAcceso(){

    return $("estadoAcceso")
}


function tiempoSesion(){

    return $("tiempoSesion")
}


function botonCerrarSesionCabecera(){

    return $("botonCerrarSesionCabecera")
}


function puntosPin(){

    const indicador=
        indicadorPin();

    if(!indicador){
        return []
    }

    return Array.from(
        indicador.querySelectorAll(
            ".punto-pin"
        )
    )
}


function teclas(){

    return Array.from(
        document.querySelectorAll(
            ".tecla"
        )
    )
}


/* ==========================================================
   CONFIGURACIÓN DE CALLBACKS
   ========================================================== */

export function configurarCallbacksAcceso({
    alAbrirSesion=null,
    alCerrarSesion=null
}={}){

    callbackSesionAbierta=
        typeof alAbrirSesion
        ===
        "function"
        ?
        alAbrirSesion
        :
        null;

    callbackSesionCerrada=
        typeof alCerrarSesion
        ===
        "function"
        ?
        alCerrarSesion
        :
        null
}


/* ==========================================================
   PIN
   ========================================================== */

export function actualizarPin(){

    puntosPin().forEach(
        (
            punto,
            indice
        )=>
            punto.classList.toggle(
                "activo",
                indice
                <
                estadoAdministracion
                    .pinIntroducido
                    .length
            )
    )
}


export function bloquearTeclado(
    bloqueado
){

    teclas().forEach(
        tecla=>
            tecla.disabled=
                bloqueado
    )
}


export function agregarNumero(
    numero
){

    if(
        estadoAdministracion.solicitudEnCurso
        ||
        estadoAdministracion.pinIntroducido.length
        >=
        LONGITUD_PIN
    ){
        return
    }

    mostrarEstado(
        estadoAcceso(),
        ""
    );

    estadoAdministracion.pinIntroducido+=
        String(
            numero
        );

    actualizarPin();

    if(
        estadoAdministracion.pinIntroducido.length
        ===
        LONGITUD_PIN
    ){
        void solicitarAcceso()
    }
}


export function borrarPin(){

    if(
        estadoAdministracion.solicitudEnCurso
        ||
        !estadoAdministracion.pinIntroducido
    ){
        return
    }

    estadoAdministracion.pinIntroducido=
        estadoAdministracion.pinIntroducido.slice(
            0,
            -1
        );

    actualizarPin()
}


export function limpiarPin(){

    if(
        estadoAdministracion.solicitudEnCurso
    ){
        return
    }

    estadoAdministracion.pinIntroducido=
        "";

    mostrarEstado(
        estadoAcceso(),
        ""
    );

    actualizarPin()
}


/* ==========================================================
   RELOJ DE SESIÓN
   ========================================================== */

export function detenerReloj(){

    if(
        estadoAdministracion.intervaloSesion
        !==
        null
    ){
        clearInterval(
            estadoAdministracion.intervaloSesion
        );

        estadoAdministracion.intervaloSesion=
            null
    }
}


export function actualizarReloj(){

    const elemento=
        tiempoSesion();

    if(!elemento){
        return
    }

    const expiracion=
        obtenerExpiracion();

    if(!expiracion){

        elemento.textContent=
            "Sesión · --:--";

        return
    }

    const restante=
        expiracion
        -
        Math.floor(
            Date.now()/1000
        );

    if(restante<=0){

        void cerrarSesion(
            "La sesión administrativa ha caducado."
        );

        return
    }

    elemento.textContent=
        `Sesión · ${
            String(
                Math.floor(
                    restante/60
                )
            ).padStart(
                2,
                "0"
            )
        }:${
            String(
                restante%60
            ).padStart(
                2,
                "0"
            )
        }`
}


export function iniciarReloj(){

    detenerReloj();

    actualizarReloj();

    estadoAdministracion.intervaloSesion=
        setInterval(
            actualizarReloj,
            1000
        )
}


/* ==========================================================
   PRESENTACIÓN DE ACCESO Y PANEL
   ========================================================== */

export function abrirPanel(){

    contenidoAcceso()
        ?.classList
        .add(
            "oculto"
        );

    panelAdministracion()
        ?.classList
        .remove(
            "oculto"
        );

    botonCerrarSesionCabecera()
        ?.classList
        .remove(
            "oculto"
        );

    iniciarReloj()
}


export function mostrarAcceso(
    mensaje=""
){

    detenerReloj();

    panelAdministracion()
        ?.classList
        .add(
            "oculto"
        );

    contenidoAcceso()
        ?.classList
        .remove(
            "oculto"
        );

    botonCerrarSesionCabecera()
        ?.classList
        .add(
            "oculto"
        );

    estadoAdministracion.pinIntroducido=
        "";

    estadoAdministracion.solicitudEnCurso=
        false;

    bloquearTeclado(
        false
    );

    actualizarPin();

    mostrarEstado(
        estadoAcceso(),
        mensaje,
        mensaje
        ?
        "info"
        :
        ""
    )
}


/* ==========================================================
   CIERRE DE SESIÓN
   ========================================================== */

export async function cerrarSesion(
    mensaje=""
){

    eliminarSesion();

    detenerReloj();

    reiniciarEstadoAdministracion();

    mostrarAcceso(
        mensaje
    );

    if(callbackSesionCerrada){

        try{

            await callbackSesionCerrada()

        }catch(error){

            console.error(
                "Error al cerrar el estado administrativo.",
                error
            )
        }
    }
}


/* ==========================================================
   SOLICITUD DE ACCESO
   ========================================================== */

export async function solicitarAcceso(){

    if(
        estadoAdministracion.solicitudEnCurso
        ||
        estadoAdministracion.pinIntroducido.length
        !==
        LONGITUD_PIN
    ){
        return
    }

    const pin=
        estadoAdministracion.pinIntroducido;

    estadoAdministracion.solicitudEnCurso=
        true;

    bloquearTeclado(
        true
    );

    mostrarEstado(
        estadoAcceso(),
        "Comprobando acceso con la API...",
        "info"
    );

    try{

        const respuesta=
            await fetch(
                URL_API
                +
                RUTA_ACCESO,
                {
                    method:"POST",

                    headers:{
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            {
                                pin
                            }
                        ),

                    cache:"no-store"
                }
            );

        await comprobar(
            respuesta
        );

        const datos=
            await respuesta.json();

        if(
            !datos?.token
            ||
            !datos?.expira_en
        ){
            throw new Error(
                "La API no devolvió una sesión válida."
            )
        }

        guardarSesion(
            datos
        );

        estadoAdministracion.pinIntroducido=
            "";

        actualizarPin();

        abrirPanel();

        if(callbackSesionAbierta){

            await callbackSesionAbierta()
        }

    }catch(error){

        eliminarSesion();

        estadoAdministracion.pinIntroducido=
            "";

        actualizarPin();

        let mensaje=
            error.message
            ||
            "No ha sido posible validar el acceso.";

        if(
            error.codigoHttp
            ===
            429
            &&
            error.retryAfter
        ){
            mensaje+=
                ` Espera ${
                    error.retryAfter
                } segundos.`
        }

        mostrarEstado(
            estadoAcceso(),
            mensaje,
            "error"
        );

    }finally{

        estadoAdministracion.solicitudEnCurso=
            false;

        bloquearTeclado(
            false
        )
    }
}


/* ==========================================================
   RECUPERACIÓN DE SESIÓN EXISTENTE
   ========================================================== */

export async function recuperarSesion(){

    actualizarPin();

    if(!sesionEsValida()){

        eliminarSesion();

        mostrarAcceso();

        return false
    }

    abrirPanel();

    if(callbackSesionAbierta){

        try{

            await callbackSesionAbierta()

        }catch(error){

            console.error(
                "Error al cargar la sesión administrativa existente.",
                error
            );

            await cerrarSesion(
                "No ha sido posible recuperar la sesión administrativa."
            );

            return false
        }
    }

    return true
}


/* ==========================================================
   EVENTOS DEL ACCESO
   ========================================================== */

export function configurarEventosAcceso(){

    document.querySelectorAll(
        "[data-numero]"
    ).forEach(
        boton=>
            boton.addEventListener(
                "click",
                ()=>
                    agregarNumero(
                        boton.dataset.numero
                    )
            )
    );

    $("botonBorrar")
        ?.addEventListener(
            "click",
            borrarPin
        );

    $("botonLimpiar")
        ?.addEventListener(
            "click",
            limpiarPin
        );

    $("botonCerrarSesion")
        ?.addEventListener(
            "click",
            ()=>
                void cerrarSesion()
        );

    botonCerrarSesionCabecera()
        ?.addEventListener(
            "click",
            ()=>
                void cerrarSesion()
        )
}


// Fin de fichero: js/administracion/acceso.js