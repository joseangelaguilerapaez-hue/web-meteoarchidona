/*
 * MeteoArchidona · Actualidad
 * Adelanto de la predicción
 *
 * La portada no decía nada de mañana: quien entraba a ver si mañana
 * llueve tenía que adivinar que eso está en otra página. Aquí van tres
 * días en corto, con enlace a Predicción, que es donde está todo.
 *
 * La predicción es de AEMET y se dice. MeteoArchidona no predice: lo
 * que se publica aquí es lo que manda GET /prediccion/archidona, tal
 * cual (formato en docs/prediccion-endpoint.md). La petición la hace
 * prediccion-fuente.js, que la comparte con el icono del tiempo.
 *
 * Si la petición falla, el bloque no aparece. Es un adelanto: la
 * portada se sostiene sin él, y vale más eso que un hueco con guiones.
 */

import {
    obtenerPrediccion
} from "./prediccion-fuente.js?v=20261025-icono1";


const DIAS_QUE_SE_ADELANTAN = 3;

/* AEMET publica unas pocas veces al día. */
const REFRESCO_MS = 30 * 60 * 1000;


function crear(etiqueta, clase, texto) {

    const elemento = document.createElement(etiqueta);


    if (clase) {

        elemento.className = clase;

    }


    if (texto !== undefined && texto !== null) {

        elemento.textContent = texto;

    }


    return elemento;

}


function grados(valor) {

    return typeof valor === "number" && Number.isFinite(valor)
        ? `${Math.round(valor)}°`
        : "--";

}


/* «2026-10-25» a su día de la semana, sin pasar por UTC. */
export function nombreDelDia(fecha, hoy) {

    const partes = String(fecha || "").match(
        /^(\d{4})-(\d{2})-(\d{2})$/
    );


    if (!partes) {

        return null;

    }


    const dia = new Date(
        Number(partes[1]),
        Number(partes[2]) - 1,
        Number(partes[3])
    );


    if (dia.toDateString() === hoy.toDateString()) {

        return "Hoy";

    }


    const manana = new Date(hoy.valueOf());

    manana.setDate(manana.getDate() + 1);


    if (dia.toDateString() === manana.toDateString()) {

        return "Mañana";

    }


    const nombre = dia.toLocaleDateString(
        "es-ES",
        {
            weekday: "long"
        }
    );


    return nombre.charAt(0).toUpperCase() + nombre.slice(1);

}


function pintarDia(dia, hoy) {

    const tarjeta = crear("article", "pred-breve-dia");


    tarjeta.append(
        crear(
            "div",
            "pred-breve-cuando",
            nombreDelDia(dia?.fecha, hoy) || "--"
        )
    );


    tarjeta.append(
        crear(
            "div",
            "pred-breve-descripcion",
            dia?.descripcion || "Sin descripción"
        )
    );


    const temperaturas = crear("div", "pred-breve-temperaturas");

    temperaturas.append(
        crear(
            "span",
            "pred-breve-max",
            grados(dia?.temperatura_max_c)
        )
    );

    temperaturas.append(
        crear(
            "span",
            "pred-breve-min",
            grados(dia?.temperatura_min_c)
        )
    );

    tarjeta.append(temperaturas);


    const probabilidad = dia?.prob_precipitacion_pct;


    if (
        typeof probabilidad === "number"
        &&
        Number.isFinite(probabilidad)
    ) {

        tarjeta.append(
            crear(
                "div",
                "pred-breve-lluvia",
                `Probabilidad de lluvia ${Math.round(probabilidad)} %`
            )
        );

    }


    return tarjeta;

}


function pintar(prediccion) {

    const seccion = document.getElementById("prediccion-breve");

    const lista = document.getElementById("prediccion-breve-dias");


    if (!seccion || !lista) {

        return false;

    }


    const dias = (prediccion?.diaria || []).slice(
        0,
        DIAS_QUE_SE_ADELANTAN
    );


    if (dias.length === 0) {

        seccion.hidden = true;


        return false;

    }


    const hoy = new Date();

    lista.replaceChildren(
        ...dias.map(
            dia => pintarDia(dia, hoy)
        )
    );


    /*
     * Si AEMET lleva sin publicar más de lo normal, la API lo marca y
     * aquí se dice: la predicción sigue sirviendo, pero con su edad a
     * la vista.
     */
    const aviso = document.getElementById("prediccion-breve-vieja");


    if (aviso) {

        aviso.hidden = prediccion?.desactualizada !== true;

    }


    seccion.hidden = false;


    return true;

}


export async function actualizarPrediccionBreve() {

    const seccion = document.getElementById("prediccion-breve");


    if (!seccion) {

        return false;

    }


    try {

        return pintar(
            await obtenerPrediccion()
        );


    } catch (error) {

        console.error(
            "No se ha podido cargar el adelanto de la predicción:",
            error
        );


        /*
         * Si ya había una predicción pintada se conserva: es de hace un
         * rato, pero no es falsa. Solo se esconde si nunca llegó.
         */
        if (!seccion.querySelector(".pred-breve-dia")) {

            seccion.hidden = true;

        }


        return false;

    }

}


export function iniciarPrediccionBreve() {

    actualizarPrediccionBreve();


    window.setInterval(
        actualizarPrediccionBreve,
        REFRESCO_MS
    );

}


/* Fin de fichero: js/actualidad/prediccion-breve.js */
