/*
 * MeteoArchidona
 * Administración
 *
 * Diagnóstico administrativo de EUMETSAT.
 *
 * Responsabilidades:
 *
 * - solicitar la imagen LI AFA;
 * - seleccionar la zona de consulta;
 * - mostrar el PNG devuelto por la API;
 * - presentar metadatos expuestos en cabeceras HTTP;
 * - liberar correctamente las URL temporales creadas con Blob;
 * - limpiar el estado visual del diagnóstico.
 *
 * Este módulo todavía no sustituye al código equivalente de
 * js/administracion.js. La conexión definitiva se realizará desde
 * principal.js cuando todos los módulos estén preparados.
 */


import {
    $,
    estadoAdministracion,
    mostrarEstado
} from "./estado.js";

import {
    URL_API,
    RUTA_EUMETSAT,
    comprobar
} from "./api.js";


/* ==========================================================
   LIMPIEZA
   ========================================================== */

export function limpiarEumetsat(){

    if(
        estadoAdministracion
            .urlImagenEumetsat
    ){

        URL.revokeObjectURL(
            estadoAdministracion
                .urlImagenEumetsat
        );

        estadoAdministracion
            .urlImagenEumetsat=
                null
    }

    const imagen=
        $("imagenEumetsat");

    if(imagen){

        imagen.hidden=
            true;

        imagen.removeAttribute(
            "src"
        )
    }

    if($("metaEumetsat")){

        $("metaEumetsat").textContent=
            "Todavía no se ha realizado ninguna consulta."
    }

    mostrarEstado(
        $("estadoEumetsat"),
        ""
    )
}


/* ==========================================================
   CONSULTA DE IMAGEN
   ========================================================== */

export async function cargarEumetsat(){

    const boton=
        $("botonEumetsatCargar");

    const estadoElemento=
        $("estadoEumetsat");

    const zona=
        $("eumetsatZona")
            ?.value
        ||
        "";

    if(!zona){

        mostrarEstado(
            estadoElemento,
            "Selecciona una zona de consulta.",
            "error"
        );

        return
    }

    if(boton){

        boton.disabled=
            true
    }

    mostrarEstado(
        estadoElemento,
        "Solicitando PNG LI AFA...",
        "info"
    );

    try{

        const respuesta=
            await fetch(
                `${
                    URL_API
                }${
                    RUTA_EUMETSAT
                }/imagen?zona=${
                    encodeURIComponent(
                        zona
                    )
                }`,
                {
                    cache:"no-store"
                }
            );

        await comprobar(
            respuesta
        );

        const blob=
            await respuesta.blob();

        if(
            estadoAdministracion
                .urlImagenEumetsat
        ){

            URL.revokeObjectURL(
                estadoAdministracion
                    .urlImagenEumetsat
            )
        }

        estadoAdministracion
            .urlImagenEumetsat=
                URL.createObjectURL(
                    blob
                );

        const imagen=
            $("imagenEumetsat");

        if(imagen){

            imagen.src=
                estadoAdministracion
                    .urlImagenEumetsat;

            imagen.hidden=
                false
        }

        const zonaTexto=
            $("eumetsatZona")
                ?.selectedOptions
                ?.[0]
                ?.textContent
            ||
            zona;

        const tiempo=
            respuesta.headers.get(
                "X-MeteoArchidona-Eumetsat-Tiempo"
            )
            ||
            "no expuesto por CORS";

        const bbox=
            respuesta.headers.get(
                "X-MeteoArchidona-Eumetsat-Bbox"
            )
            ||
            "no expuesto por CORS";

        const dimensiones=
            respuesta.headers.get(
                "X-MeteoArchidona-Eumetsat-Dimensiones"
            )
            ||
            "no expuestas por CORS";

        if($("metaEumetsat")){

            $("metaEumetsat").textContent=
                `Zona: ${
                    zonaTexto
                } · timestamp: ${
                    tiempo
                } · BBOX: ${
                    bbox
                } · dimensiones: ${
                    dimensiones
                } · ${
                    blob.size
                } bytes`
        }

        mostrarEstado(
            estadoElemento,
            "PNG LI AFA obtenido correctamente.",
            "ok"
        );

        return {
            zona,
            zonaTexto,
            tiempo,
            bbox,
            dimensiones,
            bytes:blob.size
        }

    }catch(error){

        mostrarEstado(
            estadoElemento,
            error.message,
            "error"
        );

        throw error

    }finally{

        if(boton){

            boton.disabled=
                false
        }
    }
}


/* ==========================================================
   EVENTOS
   ========================================================== */

export function configurarEventosEumetsat(){

    $("botonEumetsatCargar")
        ?.addEventListener(
            "click",
            ()=>
                void cargarEumetsat()
        );

    $("botonEumetsatLimpiar")
        ?.addEventListener(
            "click",
            limpiarEumetsat
        )
}


// Fin de fichero: js/administracion/eumetsat.js