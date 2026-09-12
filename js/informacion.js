/*
 * MeteoArchidona
 * Información
 *
 * Lógica exclusiva de:
 *
 *     pages/informacion.html
 *
 * Rellena la lista de estaciones con lo que devuelve /estaciones de la
 * API, para que una estación nueva aparezca sin tocar la página.
 *
 * La API no da ni la altitud ni, en algún caso, la localidad. Esos
 * datos van a mano en DATOS_A_MANO: las altitudes las facilitó el
 * usuario y la localidad de Los Llanos es la que usa el propio sitio
 * (js/en-vivo.js). No se inventa ninguno: si una estación no está en
 * esa tabla, simplemente no se muestra ese dato.
 *
 * La región tampoco se muestra: hoy la API la devuelve mal codificada
 * ("MÃ¡laga").
 */

(function () {

"use strict";


const DATOS_A_MANO = {
    EL_SILO: {
        altitud: 680
    },
    LOS_LLANOS: {
        altitud: 720,
        localidad: "Villanueva del Trabuco"
    }
};


/*
 * Cómo se lee cada estado del catálogo. Los que no estén aquí se
 * muestran con su nombre, pasado a algo legible, en vez de ocultarlos.
 */
const ESTADOS = {
    ACTIVA: {
        texto: "Activa",
        clase: "activa"
    },
    DATOS_SIMULADOS: {
        texto: "En pruebas",
        clase: "pruebas"
    }
};


// Primero las que funcionan: son las que interesan a quien llega aquí.
const ORDEN_ESTADOS = ["ACTIVA", "DATOS_SIMULADOS"];

const ESPERA_MAXIMA_MS = 60000;


function limpiar(texto) {

    return String(texto || "").replace(/\s+/g, " ").trim();

}


function estadoLegible(estado) {

    if (ESTADOS[estado]) {

        return ESTADOS[estado];

    }

    const texto = limpiar(String(estado || "Desconocido").replace(/_/g, " ").toLowerCase());

    return {
        texto: texto.charAt(0).toUpperCase() + texto.slice(1),
        clase: ""
    };

}


function crear(etiqueta, clase, texto) {

    const elemento = document.createElement(etiqueta);

    if (clase) {

        elemento.className = clase;

    }

    if (texto !== undefined) {

        // textContent y no innerHTML: lo que llega de la API no se
        // interpreta nunca como HTML.
        elemento.textContent = texto;

    }

    return elemento;

}


function fichaEstacion(estacion) {

    const codigo = estacion.codigo;

    const aMano = DATOS_A_MANO[codigo] || {};

    const ficha = crear("article", "estacion-info");

    ficha.appendChild(
        crear("div", "estacion-info-nombre", limpiar(estacion.nombre_publico) || codigo)
    );

    const lugar = [
        limpiar(estacion.ciudad) || aMano.localidad,
        aMano.altitud ? `${aMano.altitud} m` : null
    ].filter(Boolean).join(" · ");

    if (lugar) {

        ficha.appendChild(crear("div", "estacion-info-lugar", lugar));

    }

    const estado = estadoLegible(estacion.estado);

    ficha.appendChild(
        crear("div", `estacion-info-estado ${estado.clase}`.trim(), estado.texto)
    );

    return ficha;

}


function mostrarAviso(lista, texto) {

    lista.replaceChildren(crear("p", "estaciones-aviso", texto));

}


async function cargarEstaciones() {

    const lista = document.getElementById("estaciones-lista");

    if (!lista) {

        return;

    }


    const controlador = new AbortController();

    const temporizador = setTimeout(() => controlador.abort(), ESPERA_MAXIMA_MS);


    try {

        const respuesta = await fetch(`${window.API_BASE}/estaciones`, {
            signal: controlador.signal
        });

        if (!respuesta.ok) {

            throw new Error(`La API respondió ${respuesta.status}`);

        }

        const datos = await respuesta.json();

        const estaciones = Array.isArray(datos?.estaciones) ? datos.estaciones : [];

        if (!estaciones.length) {

            mostrarAviso(lista, "Ahora mismo no hay estaciones publicadas.");

            return;

        }

        const posicion = (estado) => {

            const i = ORDEN_ESTADOS.indexOf(estado);

            return i === -1 ? ORDEN_ESTADOS.length : i;

        };

        const ordenadas = estaciones
            .map((estacion, indice) => ({ estacion, indice }))
            .sort((a, b) => posicion(a.estacion.estado) - posicion(b.estacion.estado) || a.indice - b.indice)
            .map(({ estacion }) => estacion);

        lista.replaceChildren(...ordenadas.map(fichaEstacion));

    } catch (error) {

        console.error("No se ha podido cargar la lista de estaciones:", error);

        mostrarAviso(
            lista,
            "No se ha podido cargar la lista de estaciones. Vuelve a intentarlo en un momento."
        );

    } finally {

        clearTimeout(temporizador);

    }

}


cargarEstaciones();

})();


// Fin de fichero: js/informacion.js
