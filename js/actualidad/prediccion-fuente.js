/*
 * MeteoArchidona · Actualidad
 * La predicción de AEMET, pedida una sola vez
 *
 * En la portada la usan dos cosas: el adelanto de tres días y el icono
 * del tiempo de «Condiciones actuales». Es la misma respuesta de
 * GET /prediccion/archidona, así que se pide una vez y se guarda un
 * rato; AEMET publica unas pocas veces al día.
 *
 * Si la petición falla no se guarda nada: el error no debe quedarse
 * pegado durante toda la vigencia.
 */

const MUNICIPIO = "archidona";

const VIGENCIA_MS = 10 * 60 * 1000;


let guardada = null;

let pendiente = null;


function obtenerApiBase() {

    const apiBase =
        String(window.API_BASE || "")
            .trim()
            .replace(/\/+$/, "");


    if (!apiBase) {

        throw new Error(
            "window.API_BASE no está definido. Debe cargarse js/api.js antes de Actualidad."
        );

    }


    return apiBase;

}


async function pedir() {

    const respuesta = await fetch(
        `${
            obtenerApiBase()
        }/prediccion/${
            encodeURIComponent(MUNICIPIO)
        }`,
        {
            cache: "no-store"
        }
    );


    if (!respuesta.ok) {

        throw new Error(`HTTP ${respuesta.status}`);

    }


    return respuesta.json();

}


/*
 * Devuelve la predicción. Lanza si no se ha podido traer, que es lo que
 * esperan quienes la piden para decidir si enseñan su bloque.
 *
 * Dos peticiones a la vez comparten la misma espera: al cargar la
 * página las dos partes la piden casi al mismo tiempo.
 */
export async function obtenerPrediccion(ahora) {

    const instante = (ahora || new Date()).valueOf();


    if (
        guardada
        &&
        instante - guardada.momento < VIGENCIA_MS
    ) {

        return guardada.prediccion;

    }


    if (!pendiente) {

        pendiente = pedir()
            .then(prediccion => {

                guardada = {
                    momento: Date.now(),
                    prediccion: prediccion
                };


                return prediccion;

            })
            .finally(() => {

                pendiente = null;

            });

    }


    return pendiente;

}


/*
 * La hora de la predicción que corresponde a este momento.
 *
 * La tira horaria empieza en la hora en curso, así que vale la primera
 * que no haya pasado todavía; si la respuesta viene retrasada, no se
 * devuelve nada antes que dar por buena una hora vieja.
 */
export function horaDeAhora(prediccion, ahora) {

    const instante = (ahora || new Date()).valueOf();

    const horas = prediccion?.horaria || [];


    for (const hora of horas) {

        const empieza = Date.parse(hora?.instante);


        if (Number.isNaN(empieza)) {

            continue;

        }


        const acaba = empieza + 3600000;


        if (instante >= empieza && instante < acaba) {

            return hora;

        }

    }


    return null;

}


/* Fin de fichero: js/actualidad/prediccion-fuente.js */
