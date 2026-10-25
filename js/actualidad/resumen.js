/*
 * MeteoArchidona · Actualidad
 * Tarjeta «Condiciones actuales»
 *
 * La tarjeta que encabeza la portada se llamaba «Condiciones actuales» y
 * no daba ninguna: un sol con una nube dibujados y siempre iguales, el
 * nombre del pueblo y las horas del sol. La temperatura había que ir a
 * buscarla a las fichas de más abajo.
 *
 * Aquí se pinta una lectura real. La estación de referencia es El Silo,
 * la misma que usa Predicción para su «Ahora en Archidona». No es una
 * media de la comarca ni un cálculo nuestro, así que la tarjeta dice
 * siempre de qué estación es el dato y a qué hora se tomó.
 *
 * Si El Silo está parada se busca otra estación con lectura reciente,
 * porque la portada sin temperatura no sirve de nada; el nombre que se
 * lee bajo el título cambia con ella. Si no hay ninguna al día, no se
 * enseña una cifra vieja como si fuera de ahora: se dice desde cuándo
 * no hay datos.
 */

const ESTACION_REFERENCIA = "EL_SILO";

/*
 * A partir de esta edad, la lectura deja de presentarse como «ahora».
 * Las estaciones envían cada pocos minutos; una hora de silencio ya es
 * una avería, no un hueco.
 *
 * Nota: la ficha de estación hace esta misma cuenta en
 * js/actualidad/meteorologia.js. Cuando las dos estén en main, conviene
 * dejar una sola y que esta la importe.
 */
const MINUTOS_PARA_CONSIDERAR_PARADA = 60;

const RUMBOS = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSO", "SO", "OSO",
    "O", "ONO", "NO", "NNO"
];

let candidatas = null;

const MESES = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic"
];


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


function poner(id, texto) {

    const elemento = document.getElementById(id);


    if (elemento) {

        elemento.textContent = texto;

    }

}


function numero(valor, decimales, sufijo) {

    if (typeof valor !== "number" || !Number.isFinite(valor)) {

        return "--";

    }


    return valor.toLocaleString(
        "es-ES",
        {
            minimumFractionDigits: decimales,
            maximumFractionDigits: decimales
        }
    ) + (sufijo || "");

}


export function rumboDeGrados(grados) {

    if (typeof grados !== "number" || !Number.isFinite(grados)) {

        return null;

    }


    const indice = Math.round(
        ((grados % 360) + 360) % 360 / 22.5
    ) % 16;


    return RUMBOS[indice];

}


/* «25/10/2026» + «16:12» en la hora del navegador, que es la de aquí. */
export function instanteDeLaLectura(datos) {

    const fecha = String(datos?.fecha_observacion || "");
    const hora = String(datos?.hora_observacion || "");

    const partesFecha = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const partesHora = hora.match(/^(\d{1,2}):(\d{2})$/);


    if (!partesFecha || !partesHora) {

        return null;

    }


    return new Date(
        Number(partesFecha[3]),
        Number(partesFecha[2]) - 1,
        Number(partesFecha[1]),
        Number(partesHora[1]),
        Number(partesHora[2])
    );

}


export function minutosSinDatos(datos, ahora) {

    const instante = instanteDeLaLectura(datos);


    if (!instante || Number.isNaN(instante.valueOf())) {

        return null;

    }


    return (ahora.valueOf() - instante.valueOf()) / 60000;

}


/*
 * Lo que se lee bajo el título: de dónde es el dato y de cuándo, o desde
 * cuándo falta.
 */
export function textoEstadoResumen(datos, ahora) {

    const estacion = String(
        datos?.nombre_estacion || "MeteoArchidona"
    );

    const instante = instanteDeLaLectura(datos);
    const minutos = minutosSinDatos(datos, ahora);


    if (minutos === null) {

        return {
            texto: `Datos de ${estacion}`,
            sinDatos: false
        };

    }


    const hora = instante.toLocaleTimeString(
        "es-ES",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );


    if (minutos < MINUTOS_PARA_CONSIDERAR_PARADA) {

        return {
            texto: `${estacion} · ${hora}`,
            sinDatos: false
        };

    }


    const mismoDia =
        instante.toDateString() === ahora.toDateString();


    return {
        texto: mismoDia
            ? `${estacion} · sin datos desde las ${hora}`
            : `${estacion} · sin datos desde el ${
                instante.getDate()
            } ${
                MESES[instante.getMonth()]
            }`,
        sinDatos: true
    };

}


function pintar(datos, ahora) {

    const estado = textoEstadoResumen(datos, ahora);

    const linea = document.getElementById("resumen-estado");


    if (linea) {

        linea.classList.toggle("sin-datos", estado.sinDatos);

        linea.innerHTML =
            `<span class="punto"></span>${estado.texto}`;

    }


    /*
     * Con la estación parada no se enseña la última cifra como si fuera
     * de ahora: el hueco dice la verdad y la línea de arriba explica
     * desde cuándo.
     */
    if (estado.sinDatos) {

        vaciar();

        return;

    }


    poner(
        "resumen-temperatura",
        numero(datos?.temperatura_c, 1)
    );


    poner(
        "resumen-humedad",
        numero(datos?.humedad_pct, 0, " %")
    );


    const rumbo = rumboDeGrados(datos?.direccion_viento_grados);

    const viento = numero(
        datos?.viento_medio_10_min_kmh,
        0,
        " km/h"
    );


    poner(
        "resumen-viento",
        rumbo && viento !== "--"
            ? `${viento} del ${rumbo}`
            : viento
    );


    poner(
        "resumen-lluvia",
        numero(datos?.lluvia_dia_mm, 1, " mm")
    );

}


function vaciar() {

    poner("resumen-temperatura", "--");

    poner("resumen-humedad", "--");

    poner("resumen-viento", "--");

    poner("resumen-lluvia", "--");

}


async function pedir(ruta) {

    const respuesta = await fetch(
        `${obtenerApiBase()}${ruta}`,
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
 * El Silo primero y detrás las demás activas, por si está parada. El
 * catálogo se pide una vez: cambia muy de tarde en tarde, y quien lo
 * vigila es la parte de las fichas.
 */
async function obtenerCandidatas() {

    if (candidatas) {

        return candidatas;

    }


    try {

        const catalogo = await pedir("/estaciones");

        const activas = (catalogo?.estaciones || [])
            .filter(
                estacion => estacion?.estado === "ACTIVA"
            )
            .map(
                estacion => estacion.codigo
            );


        candidatas = [
            ESTACION_REFERENCIA,
            ...activas.filter(
                codigo => codigo !== ESTACION_REFERENCIA
            )
        ];


    } catch (error) {

        console.error(
            "No se ha podido leer el catálogo para el resumen:",
            error
        );


        candidatas = [
            ESTACION_REFERENCIA
        ];

    }


    return candidatas;

}


export async function actualizarResumen() {

    const tarjeta = document.getElementById("resumen-ahora");


    if (!tarjeta) {

        return false;

    }


    try {

        const ahora = new Date();

        let primera = null;


        for (const codigo of await obtenerCandidatas()) {

            const datos = await pedir(
                `/condiciones-actuales/${
                    encodeURIComponent(codigo)
                }`
            );


            if (primera === null) {

                primera = datos;

            }


            const minutos = minutosSinDatos(datos, ahora);


            if (
                minutos !== null
                &&
                minutos < MINUTOS_PARA_CONSIDERAR_PARADA
            ) {

                pintar(datos, ahora);


                return true;

            }

        }


        /* Ninguna al día: se cuenta lo que pasa con la de referencia. */
        pintar(primera || {}, ahora);


        return true;


    } catch (error) {

        console.error(
            "Error cargando el resumen de la portada:",
            error
        );


        vaciar();


        const linea = document.getElementById("resumen-estado");


        if (linea) {

            linea.classList.add("sin-datos");

            linea.innerHTML =
                '<span class="punto"></span>Sin conexión con la estación';

        }


        return false;

    }

}


/* Fin de fichero: js/actualidad/resumen.js */
