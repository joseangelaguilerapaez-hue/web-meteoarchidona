/*
 * MeteoArchidona · Mi web · común
 *
 * Lo que comparten el menú, la gestión en Mi cuenta y la página de cada
 * pestaña «Mi web» (docs/dashboards.md de la API; José, 5 y 17-11-2026):
 * las llamadas a la API con la sesión del registrado y el aviso de que
 * las pestañas han cambiado, para que el menú se pinte otra vez.
 */


export const EVENTO_CAMBIO = "meteoarchidona:mi-web";

export const MAXIMO_PESTANAS = 3;


function urlApi(ruta) {
    return `${window.API_BASE || "/api"}${ruta}`;
}


/** Llamada a la API con la cookie de sesión; el error lleva el texto de la API. */
export async function llamar(metodo, ruta, cuerpo) {
    const opciones = {
        method: metodo,
        credentials: "same-origin",
        cache: "no-store",
        headers: {}
    };
    if (cuerpo !== undefined) {
        opciones.headers["Content-Type"] = "application/json";
        opciones.body = JSON.stringify(cuerpo);
    }

    const respuesta = await fetch(urlApi(ruta), opciones);
    if (respuesta.status === 204) {
        return null;
    }

    let datos = null;
    try {
        datos = await respuesta.json();
    } catch {
        datos = null;
    }

    if (!respuesta.ok) {
        let mensaje = "No se ha podido completar. Inténtalo de nuevo.";
        if (typeof datos?.detail === "string") {
            mensaje = datos.detail;
        } else if (Array.isArray(datos?.detail) && datos.detail[0]?.msg) {
            mensaje = datos.detail[0].msg;
        } else if (respuesta.status === 401) {
            mensaje = "Tu sesión ha terminado. Vuelve a iniciar sesión.";
        }
        const error = new Error(mensaje);
        error.codigoHttp = respuesta.status;
        throw error;
    }

    return datos;
}


/** Avisa de que las pestañas han cambiado (el menú se vuelve a pintar). */
export function avisarCambio() {
    document.dispatchEvent(new CustomEvent(EVENTO_CAMBIO));
}


/** Dirección de una pestaña por su número (1, 2 o 3). */
export function direccionPestana(orden) {
    return `/mi-web?pestana=${orden}`;
}


export function crear(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
}


/* Fin de fichero: js/mi-web/comun.js */
