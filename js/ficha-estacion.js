"use strict";

/*
 * MeteoArchidona
 * Componente · Ficha de estación
 *
 * Responsabilidades:
 *
 * - cargar una única vez la plantilla HTML de ficha de estación;
 * - crear instancias independientes de la ficha;
 * - sustituir PLANTILLA por el código real de estación;
 * - aplicar modo vertical u horizontal;
 * - montar siempre el visor de cámara;
 * - utilizar la cámara real cuando exista;
 * - mostrar mediante el mismo visor el estado "no disponible"
 *   cuando la estación todavía no disponga de cámara.
 *
 * La geometría de la ficha depende únicamente de:
 *
 *     vertical
 *     horizontal
 *
 * La existencia o no de cámara NO crea variantes adicionales
 * de diseño.
 */


/* ==========================================================
   CONFIGURACIÓN
   ========================================================== */


const RUTA_COMPONENTE =
    "/componentes/ficha-estacion.html?v=20261007-ficha2";


const MODOS_VALIDOS =
    new Set([
        "vertical",
        "horizontal"
    ]);


/*
 * Cámara provisional de Los Llanos.
 *
 * Esta asociación permanece cableada únicamente hasta que la API
 * exponga la relación real:
 *
 *     estación 1:N cámaras
 *
 * Los Llanos utiliza como vista principal de la ficha la cámara PTZ.
 */
const CAMARAS_ESTACION = {

    LOS_LLANOS: {
        camara:
            "los-llanos",

        vista:
            "ptz"
    }

};


let promesaPlantilla =
    null;


/* ==========================================================
   NORMALIZACIÓN
   ========================================================== */


function normalizarCodigoEstacion(
    codigo
) {

    return String(
        codigo
        ??
        ""
    )
        .trim()
        .toUpperCase();

}


function normalizarModo(
    modo
) {

    const valor =
        String(
            modo
            ??
            ""
        )
            .trim()
            .toLowerCase();


    if (
        MODOS_VALIDOS.has(
            valor
        )
    ) {

        return valor;

    }


    return "vertical";

}


/* ==========================================================
   PLANTILLA
   ========================================================== */


async function descargarPlantilla() {

    const respuesta =
        await fetch(
            RUTA_COMPONENTE,
            {
                cache:
                    "no-store"
            }
        );


    if (
        !respuesta.ok
    ) {

        throw new Error(
            `No se pudo cargar la ficha de estación: HTTP ${respuesta.status}`
        );

    }


    const html =
        await respuesta.text();


    const documento =
        new DOMParser()
            .parseFromString(
                html,
                "text/html"
            );


    const plantilla =
        documento.getElementById(
            "plantilla-estacion"
        );


    if (
        !plantilla
        ||
        plantilla.tagName
        !==
        "TEMPLATE"
    ) {

        throw new Error(
            "El componente ficha-estacion.html no contiene una plantilla válida."
        );

    }


    const ficha =
        plantilla.content
            .querySelector(
                ".ficha-estacion"
            );


    if (!ficha) {

        throw new Error(
            "La plantilla no contiene el elemento .ficha-estacion."
        );

    }


    return plantilla;

}


export async function obtenerPlantillaFichaEstacion() {

    if (
        !promesaPlantilla
    ) {

        promesaPlantilla =
            descargarPlantilla()
                .catch(
                    error => {

                        /*
                         * Permitimos reintentar en una llamada posterior
                         * si la descarga falla temporalmente.
                         */
                        promesaPlantilla =
                            null;

                        throw error;

                    }
                );

    }


    return promesaPlantilla;

}


/* ==========================================================
   SUSTITUCIÓN DE IDENTIFICADORES
   ========================================================== */


function sustituirTextoPlantilla(
    valor,
    codigo
) {

    if (
        typeof valor
        !==
        "string"
        ||
        !valor.includes(
            "PLANTILLA"
        )
    ) {

        return valor;

    }


    return valor.replaceAll(
        "PLANTILLA",
        codigo
    );

}


function sustituirAtributosPlantilla(
    elemento,
    codigo
) {

    Array.from(
        elemento.attributes
        ??
        []
    ).forEach(
        atributo => {

            const valorNuevo =
                sustituirTextoPlantilla(
                    atributo.value,
                    codigo
                );


            if (
                valorNuevo
                ===
                atributo.value
            ) {

                return;

            }


            elemento.setAttribute(
                atributo.name,
                valorNuevo
            );

        }
    );

}


function sustituirCodigoPlantilla(
    ficha,
    codigo
) {

    const elementos = [
        ficha,
        ...ficha.querySelectorAll(
            "*"
        )
    ];


    elementos.forEach(
        elemento => {

            sustituirAtributosPlantilla(
                elemento,
                codigo
            );


            delete elemento.dataset
                .gotasLluviaInicializadas;

            delete elemento.dataset
                .controlLluviaConfigurado;

            delete elemento.dataset
                .patrocinioConfigurado;

        }
    );

}


/* ==========================================================
   MODO DE FICHA
   ========================================================== */


export function establecerModoFicha(
    ficha,
    modo
) {

    if (!ficha) {
        return "vertical";
    }


    const modoNormalizado =
        normalizarModo(
            modo
        );


    ficha.classList.remove(
        "ficha-estacion--vertical",
        "ficha-estacion--horizontal"
    );


    ficha.classList.add(
        `ficha-estacion--${modoNormalizado}`
    );


    ficha.dataset
        .modoFicha =
        modoNormalizado;


    return modoNormalizado;

}


export function obtenerModoFicha(
    ficha
) {

    return normalizarModo(
        ficha?.dataset
            ?.modoFicha
    );

}


/* ==========================================================
   CÁMARAS
   ========================================================== */


export function obtenerCamaraEstacion(
    codigo
) {

    const codigoNormalizado =
        normalizarCodigoEstacion(
            codigo
        );


    return (
        CAMARAS_ESTACION[
            codigoNormalizado
        ]
        ??
        null
    );

}


export function estacionDisponeCamara(
    codigo
) {

    return Boolean(
        obtenerCamaraEstacion(
            codigo
        )
    );

}


/* ==========================================================
   URL DEL VISOR
   ========================================================== */


function crearParametrosVisorBase() {

    const parametros =
        new URLSearchParams();


    parametros.set(
        "interactivo",
        "1"
    );


    /*
     * Nunca se carga una emisión al crear la ficha.
     * El usuario debe solicitarla expresamente.
     */
    parametros.set(
        "autoplay",
        "0"
    );


    parametros.set(
        "controles",
        "1"
    );


    /*
     * Toda la superficie del visor alterna reproducción/pausa.
     * Por ello el visor solo mostrará como control propio
     * el botón de pantalla completa.
     */
    parametros.set(
        "click",
        "1"
    );


    return parametros;

}


export function crearUrlVisorEstacion(
    codigo
) {

    const codigoNormalizado =
        normalizarCodigoEstacion(
            codigo
        );


    const camara =
        obtenerCamaraEstacion(
            codigoNormalizado
        );


    const parametros =
        crearParametrosVisorBase();


    parametros.set(
        "estacion",
        codigoNormalizado
    );


    if (camara) {

        parametros.set(
            "camara",
            camara.camara
        );


        parametros.set(
            "vista",
            camara.vista
        );


        parametros.set(
            "disponible",
            "1"
        );


    } else {

        /*
         * El visor sigue existiendo aunque no haya cámara.
         *
         * visor-video.js interpretará disponible=0 como un estado
         * corporativo estático:
         *
         *     VÍDEO EN DIRECTO
         *     NO DISPONIBLE EN ESTA ESTACIÓN
         *
         * sin crear HLS ni realizar intentos de conexión.
         */
        parametros.set(
            "disponible",
            "0"
        );


        parametros.set(
            "controles",
            "0"
        );


        parametros.set(
            "click",
            "0"
        );

    }


    return (
        `/visores/video.html?${
            parametros.toString()
        }`
    );

}


/* ==========================================================
   MONTAJE DEL VISOR
   ========================================================== */


export function montarVisorFicha(
    ficha,
    codigo
) {

    if (!ficha) {
        return null;
    }


    const codigoNormalizado =
        normalizarCodigoEstacion(
            codigo
        );


    const contenedor =
        ficha.querySelector(
            ".estacion-visor-contenedor"
        );


    const zonaVisor =
        ficha.querySelector(
            ".estacion-visor"
        );


    if (
        !contenedor
        ||
        !zonaVisor
    ) {

        return null;

    }


    const iframeExistente =
        contenedor.querySelector(
            "iframe"
        );


    const url =
        crearUrlVisorEstacion(
            codigoNormalizado
        );


    if (
        iframeExistente
        &&
        iframeExistente.dataset
            .visorSrc
        ===
        url
    ) {

        return iframeExistente;

    }


    contenedor.replaceChildren();


    const iframe =
        document.createElement(
            "iframe"
        );


    iframe.className =
        "estacion-visor-iframe";


    iframe.src =
        url;


    iframe.dataset
        .visorSrc =
        url;


    iframe.title =
        estacionDisponeCamara(
            codigoNormalizado
        )
            ? "Vídeo en directo de la estación"
            : "Vídeo en directo no disponible en esta estación";


    iframe.loading =
        "lazy";


    iframe.setAttribute(
        "allow",
        "autoplay; fullscreen"
    );


    iframe.setAttribute(
        "allowfullscreen",
        ""
    );


    iframe.setAttribute(
        "referrerpolicy",
        "same-origin"
    );


    zonaVisor.dataset
        .camaraDisponible =
        estacionDisponeCamara(
            codigoNormalizado
        )
            ? "1"
            : "0";


    contenedor.appendChild(
        iframe
    );


    return iframe;

}


/* ==========================================================
   METADATOS BÁSICOS
   ========================================================== */


function obtenerLocalidad(
    estacion
) {

    if (
        estacion?.ciudad
    ) {

        return String(
            estacion.ciudad
        );

    }


    return [
        estacion?.region,
        estacion?.pais
    ]
        .filter(
            Boolean
        )
        .join(
            " · "
        );

}


export function actualizarIdentidadFicha(
    ficha,
    estacion
) {

    if (
        !ficha
        ||
        !estacion
    ) {

        return;

    }


    const codigo =
        normalizarCodigoEstacion(
            estacion.codigo
        );


    const nombre =
        estacion.nombre_publico
        ||
        codigo;


    const localidad =
        obtenerLocalidad(
            estacion
        );


    const nombreElemento =
        ficha.querySelector(
            ".estacion-nombre"
        );


    const localidadElemento =
        ficha.querySelector(
            ".estacion-localidad"
        );


    const veleta =
        ficha.querySelector(
            ".veleta"
        );


    const patrocinio =
        ficha.querySelector(
            ".patrocinio-estacion"
        );


    if (nombreElemento) {

        nombreElemento.textContent =
            nombre;

    }


    if (localidadElemento) {

        localidadElemento.textContent =
            localidad;

    }


    if (veleta) {

        veleta.setAttribute(
            "aria-label",
            `Veleta de ${nombre}`
        );


        veleta.setAttribute(
            "title",
            `Veleta de ${nombre}`
        );

    }


    if (patrocinio) {

        patrocinio.setAttribute(
            "aria-label",
            `Patrocinadores de los datos de lluvia de ${nombre}`
        );

    }

}


/* ==========================================================
   CREACIÓN
   ========================================================== */


export async function crearFichaEstacion(
    estacion,
    opciones = {}
) {

    const codigo =
        normalizarCodigoEstacion(
            estacion?.codigo
        );


    if (!codigo) {

        throw new Error(
            "No se puede crear una ficha sin código de estación."
        );

    }


    const plantilla =
        await obtenerPlantillaFichaEstacion();


    const fragmento =
        plantilla.content
            .cloneNode(
                true
            );


    const ficha =
        fragmento.querySelector(
            ".ficha-estacion"
        );


    if (!ficha) {

        throw new Error(
            "No se pudo crear la instancia de ficha de estación."
        );

    }


    sustituirCodigoPlantilla(
        ficha,
        codigo
    );


    ficha.dataset
        .estacionDinamica =
        "1";


    ficha.dataset
        .codigoEstacion =
        codigo;


    establecerModoFicha(
        ficha,
        opciones.modo
        ??
        "vertical"
    );


    actualizarIdentidadFicha(
        ficha,
        {
            ...estacion,
            codigo
        }
    );


    montarVisorFicha(
        ficha,
        codigo
    );


    return ficha;

}


/* ==========================================================
   DISTRIBUCIÓN DE REJILLA
   ========================================================== */


/*
 * La ficha horizontal solo tiene sentido cuando Actualidad está
 * mostrando realmente la rejilla en dos columnas.
 *
 * Por debajo de 851 px Actualidad pasa a una sola columna, por lo
 * que TODAS las fichas deben ser verticales, incluida la última.
 */
export function actualizarModosRejilla(
    rejilla
) {

    if (!rejilla) {
        return;
    }


    const fichas =
        Array.from(
            rejilla.querySelectorAll(
                ":scope > .ficha-estacion"
            )
        );


    /*
     * Estado base:
     * todas las fichas son siempre verticales.
     */
    fichas.forEach(
        ficha => {

            establecerModoFicha(
                ficha,
                "vertical"
            );

        }
    );


    /*
     * Actualidad solo utiliza dos columnas a partir de 851 px.
     *
     * En móvil y tableta estrecha nunca se fuerza una ficha
     * horizontal aunque el número de estaciones sea impar.
     */
    const rejillaDosColumnas =
        window.matchMedia(
            "(min-width: 851px)"
        ).matches;


    if (!rejillaDosColumnas) {

        return;

    }


    /*
     * En escritorio, si el número de estaciones es impar,
     * únicamente la última ocupa las dos columnas y utiliza
     * el diseño horizontal.
     */
    if (
        fichas.length
        %
        2
        ===
        1
    ) {

        establecerModoFicha(
            fichas[
                fichas.length
                -
                1
            ],
            "horizontal"
        );

    }

}


/* ==========================================================
   ACTUALIZACIÓN
   ========================================================== */


export function actualizarFichaEstacion(
    ficha,
    estacion
) {

    if (
        !ficha
        ||
        !estacion
    ) {

        return;

    }


    const codigo =
        normalizarCodigoEstacion(
            estacion.codigo
        );


    if (!codigo) {
        return;
    }


    ficha.dataset
        .codigoEstacion =
        codigo;


    actualizarIdentidadFicha(
        ficha,
        {
            ...estacion,
            codigo
        }
    );


    montarVisorFicha(
        ficha,
        codigo
    );

}


// Fin de fichero: js/ficha-estacion.js