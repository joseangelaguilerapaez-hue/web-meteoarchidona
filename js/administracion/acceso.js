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
 * - recuperación de una sesión todavía válida,
 * - entrada sin PIN de los usuarios administradores.
 *
 * Usuarios administradores (docs/usuarios.md de la API, 2.7; José,
 * 4-11-2026): si el usuario ha iniciado sesión en la web y su cuenta es
 * administradora, POST /admin/acceso/cuenta entrega el mismo token de
 * 15 minutos que el PIN. La página lo pide sola al abrirse y al caducar
 * el token, así que el administrador no ve el teclado. Si cierra la
 * sesión de Administración a mano, no se vuelve a entrar sola en esa
 * pestaña: queda el botón «Entrar con mi cuenta».
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
} from "./estado.js?v=20261026-cache1";

import {
    LONGITUD_PIN,
    URL_API,
    RUTA_ACCESO,
    comprobar,
    sesionEsValida,
    guardarSesion,
    eliminarSesion,
    obtenerExpiracion
} from "./api.js?v=20261026-cache1";


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
   ENTRADA CON CUENTA DE ADMINISTRADOR
   ========================================================== */

const RUTA_ACCESO_CUENTA=
    "/admin/acceso/cuenta";

// Tras «Cerrar sesión», no entrar sola otra vez en esta pestaña.
const CLAVE_SIN_ENTRADA_AUTOMATICA=
    "meteoarchidona_admin_sin_cuenta";

let renovacionEnCurso=null;


function botonEntrarConCuenta(){

    return $("botonEntrarConCuenta")
}


function leerSinEntradaAutomatica(){

    try{
        return sessionStorage.getItem(
            CLAVE_SIN_ENTRADA_AUTOMATICA
        )==="1"
    }catch{
        return false
    }
}


function guardarSinEntradaAutomatica(
    valor
){

    try{
        if(valor){
            sessionStorage.setItem(
                CLAVE_SIN_ENTRADA_AUTOMATICA,
                "1"
            )
        }else{
            sessionStorage.removeItem(
                CLAVE_SIN_ENTRADA_AUTOMATICA
            )
        }
    }catch{
    }
}


/*
 * Pide el token con la cookie de la cuenta. Devuelve true si la cuenta
 * es administradora; false si no hay sesión o no lo es (401). Nunca
 * lanza: ante cualquier fallo se queda el PIN.
 */
async function pedirTokenConCuenta(){

    try{

        const respuesta=
            await fetch(
                URL_API
                +
                RUTA_ACCESO_CUENTA,
                {
                    method:"POST",
                    credentials:"same-origin",
                    cache:"no-store"
                }
            );

        if(!respuesta.ok){
            return false
        }

        const datos=
            await respuesta.json();

        if(
            !datos?.token
            ||
            !datos?.expira_en
        ){
            return false
        }

        guardarSesion(
            datos
        );

        return true

    }catch(error){

        console.warn(
            "No se ha podido entrar con la cuenta.",
            error
        );

        return false
    }
}


/*
 * Renueva el token cuando caduca. Varias llamadas a la vez comparten
 * la misma petición.
 */
function renovarConCuenta(){

    if(renovacionEnCurso===null){

        renovacionEnCurso=
            pedirTokenConCuenta()
                .finally(
                    ()=>{
                        renovacionEnCurso=null
                    }
                )
    }

    return renovacionEnCurso
}


async function entrarConCuenta(){

    const boton=
        botonEntrarConCuenta();

    if(boton){
        boton.disabled=true
    }

    mostrarEstado(
        estadoAcceso(),
        "Comprobando tu cuenta...",
        "info"
    );

    const correcto=
        await pedirTokenConCuenta();

    if(boton){
        boton.disabled=false
    }

    if(!correcto){

        mostrarEstado(
            estadoAcceso(),
            "Tu cuenta no es de administrador o no has iniciado sesión en la web.",
            "error"
        );

        return
    }

    guardarSinEntradaAutomatica(
        false
    );

    await abrirSesionConToken()
}


async function abrirSesionConToken(){

    mostrarEstado(
        estadoAcceso(),
        ""
    );

    abrirPanel();

    if(callbackSesionAbierta){
        await callbackSesionAbierta()
    }
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

        if(renovacionEnCurso!==null){
            return
        }

        // Un administrador con cuenta sigue dentro sin notarlo.
        void renovarConCuenta().then(
            renovado=>{
                if(renovado){
                    actualizarReloj()
                }else{
                    void cerrarSesion(
                        "La sesión administrativa ha caducado."
                    )
                }
            }
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


/*
 * «Cerrar sesión» pulsado por la persona: en esta pestaña ya no se
 * entra sola con la cuenta; se ofrece el botón «Entrar con mi cuenta».
 */
async function cerrarSesionAMano(){

    guardarSinEntradaAutomatica(
        true
    );

    await cerrarSesion();

    mostrarBotonCuenta()
}


async function mostrarBotonCuenta(){

    const boton=
        botonEntrarConCuenta();

    if(!boton){
        return
    }

    // Solo si la cuenta de la web es administradora.
    try{

        const respuesta=
            await fetch(
                `${URL_API}/usuarios/yo`,
                {
                    credentials:"same-origin",
                    cache:"no-store"
                }
            );

        const datos=
            respuesta.ok
            ?
            await respuesta.json()
            :
            null;

        boton.hidden=
            !datos?.es_administrador

    }catch{

        boton.hidden=true
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

        // Usuario administrador con sesión en la web: entra sin PIN.
        if(
            !leerSinEntradaAutomatica()
            &&
            await pedirTokenConCuenta()
        ){

            try{

                await abrirSesionConToken();

                return true

            }catch(error){

                console.error(
                    "Error al abrir Administración con la cuenta.",
                    error
                );

                await cerrarSesion(
                    "No ha sido posible abrir Administración."
                );

                return false
            }
        }

        mostrarAcceso();

        if(leerSinEntradaAutomatica()){
            void mostrarBotonCuenta()
        }

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
                void cerrarSesionAMano()
        );

    botonCerrarSesionCabecera()
        ?.addEventListener(
            "click",
            ()=>
                void cerrarSesionAMano()
        );

    botonEntrarConCuenta()
        ?.addEventListener(
            "click",
            ()=>
                void entrarConCuenta()
        )
}


// Fin de fichero: js/administracion/acceso.js