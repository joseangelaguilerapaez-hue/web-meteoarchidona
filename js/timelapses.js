
"use strict";

/*
 * MeteoArchidona
 * Componente público Timelapses
 *
 * Módulo independiente y reutilizable.
 *
 * Estructura:
 *
 *     componentes/timelapses.html
 *     css/timelapses.css
 *     js/timelapses.js
 *
 * Reproductor:
 *
 *     visores/video.html?tipo=mp4
 *
 * Responsabilidades:
 *
 * - Consultar el catálogo público.
 * - Agrupar timelapses por cámara.
 * - Mostrar los últimos siete días disponibles.
 * - Priorizar COMPLETO sobre PARCIAL.
 * - Seleccionar inicialmente el día anterior.
 * - Permitir cambiar la fecha.
 * - Crear reproductores únicamente al pulsar.
 * - Admitir varias cámaras dinámicamente.
 *
 * El módulo NO genera vídeos.
 * El módulo NO modifica PostgreSQL.
 * El módulo NO publica archivos.
 *
 * El endpoint público se implementará en la API.
 */


/* ==========================================================
   CONFIGURACIÓN
   ========================================================== */


const RUTA_COMPONENTE =
    "/componentes/timelapses.html";

const RUTA_VISOR =
    "/visores/video.html";

const RUTA_PUBLICA_MP4 =
    "/multimedia/timelapses/";

const ENDPOINT_CATALOGO =
    "/timelapses/publicos";

const LIMITE_DIAS =
    7;

const ZONA_HORARIA =
    "Europe/Madrid";


let contadorInstancias = 0;


/* ==========================================================
   UTILIDADES
   ========================================================== */


function obtenerElemento(
    contenedor
) {

    if (
        typeof contenedor === "string"
    ) {

        return document.querySelector(
            contenedor
        );

    }

    return contenedor || null;

}


function obtenerApiBase() {

    const base = String(
        window.API_BASE || "/api"
    )
        .trim()
        .replace(/\/+$/, "");

    return base || "/api";

}


function texto(
    valor
) {

    return String(
        valor ?? ""
    ).trim();

}


function enteroPositivo(
    valor
) {

    const numero = Number(valor);

    if (
        !Number.isSafeInteger(numero)
        ||
        numero <= 0
    ) {

        return null;

    }

    return numero;

}


/* ==========================================================
   FECHAS
   ========================================================== */


function fechaLocalValida(
    valor
) {

    const fecha = texto(valor);

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ) {

        return false;

    }

    const instante = new Date(
        `${fecha}T12:00:00Z`
    );

    return (
        !Number.isNaN(instante.getTime())
        &&
        instante.toISOString().slice(0, 10)
        === fecha
    );

}


function obtenerAyerMadrid() {

    const partes =
        new Intl.DateTimeFormat(
            "en-GB",
            {
                timeZone: ZONA_HORARIA,
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }
        ).formatToParts(
            new Date()
        );

    const valores = {};

    for (
        const parte of partes
    ) {

        valores[parte.type] =
            parte.value;

    }

    const anio = Number(
        valores.year
    );

    const mes = Number(
        valores.month
    );

    const dia = Number(
        valores.day
    );

    const ayer = new Date(
        Date.UTC(
            anio,
            mes - 1,
            dia - 1,
            12
        )
    );

    return ayer
        .toISOString()
        .slice(0, 10);

}


function formatearFecha(
    fecha
) {

    if (
        !fechaLocalValida(fecha)
    ) {

        return fecha;

    }

    const instante = new Date(
        `${fecha}T12:00:00Z`
    );

    return new Intl.DateTimeFormat(
        "es-ES",
        {
            timeZone: "UTC",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    ).format(
        instante
    );

}


function formatearDuracion(
    valor
) {

    const segundos = Number(
        valor
    );

    if (
        !Number.isFinite(segundos)
        ||
        segundos <= 0
    ) {

        return "";

    }

    return (
        new Intl.NumberFormat(
            "es-ES",
            {
                maximumFractionDigits: 2
            }
        ).format(segundos)
        +
        " s"
    );

}


/* ==========================================================
   VALIDACIÓN DE ARCHIVOS PÚBLICOS
   ========================================================== */


function normalizarUrlMP4(
    valor
) {

    const ruta = texto(valor);

    if (
        !ruta.startsWith("/")
        ||
        ruta.startsWith("//")
    ) {

        return null;

    }

    let url;

    try {

        url = new URL(
            ruta,
            window.location.origin
        );

    } catch (error) {

        return null;

    }

    if (
        url.origin !== window.location.origin
        ||
        url.search
        ||
        url.hash
        ||
        !url.pathname.startsWith(
            RUTA_PUBLICA_MP4
        )
        ||
        !url.pathname.endsWith(".mp4")
    ) {

        return null;

    }

    return url.pathname;

}


/* ==========================================================
   NORMALIZACIÓN DEL CATÁLOGO
   ========================================================== */


/*
 * Contrato previsto con la API:
 *
 * {
 *     "timelapses": [
 *         {
 *             "id": 2,
 *             "camara_id": 1,
 *             "camara_nombre": "Los Llanos · Panorámica",
 *             "camara_ubicacion": "Villanueva del Trabuco",
 *             "fecha_local": "2026-10-13",
 *             "tipo": "PARCIAL",
 *             "fecha_generacion": "2026-10-13T12:51:54Z",
 *             "duracion_segundos": 31.88,
 *             "ancho": null,
 *             "alto": null,
 *             "url_publica":
 *                 "/multimedia/timelapses/archivo-unico.mp4"
 *         }
 *     ]
 * }
 *
 * La API deberá devolver exclusivamente vídeos
 * completados, publicados y autorizados.
 *
 * Esta estructura se implementará posteriormente
 * en el backend.
 */


function normalizarTimelapse(
    dato
) {

    if (
        !dato
        ||
        typeof dato !== "object"
    ) {

        return null;

    }

    const id = enteroPositivo(
        dato.id
    );

    const camaraId = enteroPositivo(
        dato.camara_id
    );

    const fecha = texto(
        dato.fecha_local
    );

    const tipo = texto(
        dato.tipo
    ).toUpperCase();

    const url = normalizarUrlMP4(
        dato.url_publica
    );

    if (
        !id
        ||
        !camaraId
        ||
        !fechaLocalValida(fecha)
        ||
        !["COMPLETO", "PARCIAL"].includes(tipo)
        ||
        !url
    ) {

        return null;

    }

    const ancho = enteroPositivo(
        dato.ancho
    );

    const alto = enteroPositivo(
        dato.alto
    );

    const instanteGeneracion =
        Date.parse(
            texto(
                dato.fecha_generacion
            )
        );

    return {

        id,

        camaraId,

        camaraNombre:
            texto(dato.camara_nombre)
            ||
            `Cámara ${camaraId}`,

        camaraUbicacion:
            texto(dato.camara_ubicacion),

        fecha,

        tipo,

        // Título propio de la programación que generó el vídeo; vacío
        // en los antiguos o manuales.
        programacionNombre:
            texto(dato.programacion_nombre),

        fechaEnNombre:
            dato.fecha_en_nombre === true,

        url,

        duracionSegundos:
            Number(dato.duracion_segundos),

        ancho,

        alto,

        instanteGeneracion:
            Number.isFinite(
                instanteGeneracion
            )
                ? instanteGeneracion
                : 0

    };

}


/* ==========================================================
   PRIORIZACIÓN
   ========================================================== */


function prioridadTipo(
    video
) {

    return video.tipo === "COMPLETO"
        ? 2
        : 1;

}


function compararPreferencia(
    primero,
    segundo
) {

    const diferenciaTipo =
        prioridadTipo(segundo)
        -
        prioridadTipo(primero);

    if (
        diferenciaTipo !== 0
    ) {

        return diferenciaTipo;

    }

    const diferenciaFecha =
        segundo.instanteGeneracion
        -
        primero.instanteGeneracion;

    if (
        diferenciaFecha !== 0
    ) {

        return diferenciaFecha;

    }

    return segundo.id - primero.id;

}


/*
 * Una fecha puede tener varios MP4.
 *
 * Conservamos:
 *
 * 1. COMPLETO, si existe.
 * 2. En otro caso, PARCIAL más reciente.
 *
 * El resto de registros no se borran.
 * Simplemente no ocupan posiciones adicionales
 * en el selector público.
 */


function seleccionarVideosPorDia(
    videos
) {

    const mejores = new Map();

    for (
        const video of videos
    ) {

        const anterior =
            mejores.get(
                video.fecha
            );

        if (
            !anterior
            ||
            compararPreferencia(
                video,
                anterior
            ) < 0
        ) {

            mejores.set(
                video.fecha,
                video
            );

        }

    }

    return Array.from(
        mejores.values()
    )
        .sort(
            (a, b) =>
                b.fecha.localeCompare(
                    a.fecha
                )
        )
        .slice(
            0,
            LIMITE_DIAS
        );

}


/* ==========================================================
   AGRUPACIÓN POR CÁMARA
   ========================================================== */


function agruparPorCamara(
    registros
) {

    const grupos = new Map();

    for (
        const registro of registros
    ) {

        const video =
            normalizarTimelapse(
                registro
            );

        if (
            !video
        ) {

            continue;

        }

        if (
            !grupos.has(
                video.camaraId
            )
        ) {

            grupos.set(
                video.camaraId,
                {
                    id: video.camaraId,
                    nombre: video.camaraNombre,
                    ubicacion: video.camaraUbicacion,
                    videos: []
                }
            );

        }

        grupos.get(
            video.camaraId
        ).videos.push(
            video
        );

    }

    const resultado = [];

    for (
        const grupo of grupos.values()
    ) {

        grupo.videos =
            seleccionarVideosPorDia(
                grupo.videos
            );

        if (
            grupo.videos.length > 0
        ) {

            resultado.push(
                grupo
            );

        }

    }

    return resultado.sort(
        (a, b) =>
            a.id - b.id
    );

}


/* ==========================================================
   CONSULTA PÚBLICA
   ========================================================== */


async function consultarCatalogo() {

    const url =
        `${obtenerApiBase()}${ENDPOINT_CATALOGO}`;

    const respuesta = await fetch(
        url,
        {
            method: "GET",
            cache: "no-store",
            headers: {
                Accept: "application/json"
            }
        }
    );

    if (
        !respuesta.ok
    ) {

        throw new Error(
            `No se pudo consultar el catálogo de timelapses: HTTP ${respuesta.status}.`
        );

    }

    const datos =
        await respuesta.json();

    if (
        !datos
        ||
        !Array.isArray(
            datos.timelapses
        )
    ) {

        throw new Error(
            "El catálogo público de timelapses no tiene el formato esperado."
        );

    }

    return datos.timelapses;

}


/* ==========================================================
   PLANTILLAS HTML
   ========================================================== */


async function cargarPlantillas() {

    const respuesta = await fetch(
        RUTA_COMPONENTE,
        {
            cache: "no-store"
        }
    );

    if (
        !respuesta.ok
    ) {

        throw new Error(
            "No se pudo cargar el componente HTML de Timelapses."
        );

    }

    const html =
        await respuesta.text();

    const documento =
        new DOMParser().parseFromString(
            html,
            "text/html"
        );

    const principal =
        documento.getElementById(
            "plantilla-timelapses"
        );

    const camara =
        documento.getElementById(
            "plantilla-timelapse-camara"
        );

    if (
        !principal
        ||
        !camara
        ||
        principal.tagName !== "TEMPLATE"
        ||
        camara.tagName !== "TEMPLATE"
    ) {

        throw new Error(
            "Las plantillas de Timelapses están incompletas."
        );

    }

    return {
        principal,
        camara
    };

}


/* ==========================================================
   CONSTRUCCIÓN DE LA URL DEL VISOR
   ========================================================== */


function construirUrlVisor(
    video,
    nombreCamara
) {

    const parametros =
        new URLSearchParams();

    parametros.set(
        "tipo",
        "mp4"
    );

    parametros.set(
        "archivo",
        video.url
    );

    parametros.set(
        "nombre",
        `Timelapse · ${nombreCamara}`
    );

    return (
        RUTA_VISOR
        +
        "?"
        +
        parametros.toString()
    );

}


/* ==========================================================
   REPRODUCTOR
   ========================================================== */


function detenerReproductor(
    articulo
) {

    const contenedor =
        articulo.querySelector(
            "[data-timelapses-visor]"
        );

    const portada =
        articulo.querySelector(
            "[data-timelapses-portada]"
        );

    if (
        contenedor
    ) {

        /*
         * Retirar el iframe libera el reproductor
         * anterior y detiene su reproducción.
         */

        contenedor.replaceChildren();

        contenedor.hidden = true;

    }

    if (
        portada
    ) {

        portada.hidden = false;

    }

}


function prepararProporcion(
    articulo,
    video
) {

    const visor =
        articulo.querySelector(
            ".timelapses-visor"
        );

    if (
        !visor
    ) {

        return;

    }

    const proporcion =
        video.ancho && video.alto
            ? video.ancho / video.alto
            : 0;

    if (
        Number.isFinite(proporcion)
        &&
        proporcion >= 1
        &&
        proporcion <= 4
    ) {

        visor.style.setProperty(
            "--timelapses-relacion-visor",
            `${video.ancho} / ${video.alto}`
        );

    } else {

        visor.style.removeProperty(
            "--timelapses-relacion-visor"
        );

    }

}


function abrirReproductor(
    articulo,
    video,
    nombreCamara
) {

    const contenedor =
        articulo.querySelector(
            "[data-timelapses-visor]"
        );

    const portada =
        articulo.querySelector(
            "[data-timelapses-portada]"
        );

    if (
        !contenedor
        ||
        !portada
    ) {

        return;

    }

    /*
     * Solo creamos el iframe tras una pulsación
     * explícita del visitante.
     *
     * El MP4 todavía no se había solicitado.
     */

    const iframe =
        document.createElement(
            "iframe"
        );

    iframe.src =
        construirUrlVisor(
            video,
            nombreCamara
        );

    iframe.title =
        `Timelapse ${nombreCamara} · ${formatearFecha(video.fecha)}`;

    iframe.loading =
        "eager";

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

    contenedor.replaceChildren(
        iframe
    );

    contenedor.hidden = false;

    portada.hidden = true;

}


/* ==========================================================
   INFORMACIÓN DEL VÍDEO
   ========================================================== */


/*
 * Título de un vídeo: el nombre de su programación y, si ella lo pide,
 * la fecha de la captura. Sin programación (vídeos antiguos o manuales)
 * se mantiene el de siempre: fecha y tipo.
 */
function tituloDelVideo(
    video
) {

    if (
        video.programacionNombre
    ) {

        return video.fechaEnNombre
            ? `${video.programacionNombre} · ${formatearFecha(video.fecha)}`
            : video.programacionNombre;

    }

    return `${formatearFecha(video.fecha)} · ${
        video.tipo === "COMPLETO"
            ? "Completo"
            : "Parcial"
    }`;

}


function actualizarInformacion(
    articulo,
    video
) {

    const fecha =
        articulo.querySelector(
            "[data-timelapses-fecha]"
        );

    const tipo =
        articulo.querySelector(
            "[data-timelapses-tipo]"
        );

    const duracion =
        articulo.querySelector(
            "[data-timelapses-duracion]"
        );

    const detalle =
        articulo.querySelector(
            "[data-timelapses-detalle]"
        );

    if (
        fecha
    ) {

        fecha.textContent =
            video.programacionNombre
                ? tituloDelVideo(video)
                : formatearFecha(
                    video.fecha
                );

        fecha.dateTime =
            video.fecha;

    }

    if (
        tipo
    ) {

        tipo.textContent =
            video.programacionNombre
                ? ""
                : video.tipo === "COMPLETO"
                    ? "Día completo"
                    : "Avance parcial";

    }

    if (
        duracion
    ) {

        duracion.textContent =
            formatearDuracion(
                video.duracionSegundos
            );

    }

    if (
        detalle
    ) {

        detalle.textContent =
            video.programacionNombre
                ? ""
                : video.tipo === "COMPLETO"
                    ? "Timelapse diario completo."
                    : "Timelapse parcial disponible para esta fecha.";

    }

    prepararProporcion(
        articulo,
        video
    );

}


/* ==========================================================
   CREACIÓN DE FICHA POR CÁMARA
   ========================================================== */


function crearFichaCamara(
    plantilla,
    grupo,
    instancia
) {

    const articulo =
        plantilla.content
            .firstElementChild
            .cloneNode(
                true
            );

    const nombre =
        articulo.querySelector(
            "[data-timelapses-camara-nombre]"
        );

    const ubicacion =
        articulo.querySelector(
            "[data-timelapses-camara-ubicacion]"
        );

    const selector =
        articulo.querySelector(
            "[data-timelapses-selector]"
        );

    const etiqueta =
        articulo.querySelector(
            ".timelapses-selector-etiqueta"
        );

    const boton =
        articulo.querySelector(
            "[data-timelapses-reproducir]"
        );

    if (
        !selector
        ||
        !boton
    ) {

        throw new Error(
            "La plantilla de cámara no contiene los controles necesarios."
        );

    }

    const idSelector =
        `selector-timelapse-${instancia}-${grupo.id}`;

    selector.id =
        idSelector;

    if (
        etiqueta
    ) {

        etiqueta.htmlFor =
            idSelector;

    }

    if (
        nombre
    ) {

        nombre.textContent =
            grupo.nombre;

    }

    if (
        ubicacion
    ) {

        ubicacion.textContent =
            grupo.ubicacion;

        ubicacion.hidden =
            !grupo.ubicacion;

    }

    selector.replaceChildren();

    for (
        const video of grupo.videos
    ) {

        const opcion =
            document.createElement(
                "option"
            );

        opcion.value =
            String(video.id);

        opcion.textContent =
            tituloDelVideo(
                video
            );

        selector.appendChild(
            opcion
        );

    }

    selector.disabled =
        grupo.videos.length === 0;

    boton.disabled =
        grupo.videos.length === 0;

    const ayer =
        obtenerAyerMadrid();

    let seleccionado =
        grupo.videos.find(
            video =>
                video.fecha === ayer
        );

    if (
        !seleccionado
    ) {

        seleccionado =
            grupo.videos[0];

    }

    if (
        !seleccionado
    ) {

        return articulo;

    }

    let videoActual =
        seleccionado;

    selector.value =
        String(
            videoActual.id
        );

    actualizarInformacion(
        articulo,
        videoActual
    );

    boton.setAttribute(
        "aria-label",
        `Abrir timelapse de ${grupo.nombre}, ${formatearFecha(videoActual.fecha)}`
    );

    /*
     * Cambiar de día detiene el vídeo anterior,
     * recupera la portada y no inicia
     * una nueva descarga automáticamente.
     */

    selector.addEventListener(
        "change",
        () => {

            const nuevo =
                grupo.videos.find(
                    video =>
                        String(video.id)
                        === selector.value
                );

            if (
                !nuevo
            ) {

                return;

            }

            videoActual =
                nuevo;

            detenerReproductor(
                articulo
            );

            actualizarInformacion(
                articulo,
                videoActual
            );

            boton.setAttribute(
                "aria-label",
                `Abrir timelapse de ${grupo.nombre}, ${formatearFecha(videoActual.fecha)}`
            );

        }
    );

    boton.addEventListener(
        "click",
        () => {

            abrirReproductor(
                articulo,
                videoActual,
                grupo.nombre
            );

        }
    );

    return articulo;

}


/* ==========================================================
   MONTAJE DEL COMPONENTE
   ========================================================== */


/*
 * Uso:
 *
 * import {
 *     montarTimelapses
 * } from "/js/timelapses.js?v=...";
 *
 * await montarTimelapses(
 *     document.getElementById("timelapses")
 * );
 *
 * El contenedor se muestra únicamente si
 * existen timelapses públicos válidos.
 *
 * Todavía no se invoca automáticamente:
 * el módulo de la página anfitriona realizará
 * esta llamada cuando terminemos la integración.
 */


export async function montarTimelapses(
    contenedor
) {

    const destino =
        obtenerElemento(
            contenedor
        );

    if (
        !destino
    ) {

        console.warn(
            "No se encontró el contenedor del componente Timelapses."
        );

        return false;

    }

    destino.hidden = true;

    try {

        const [
            plantillas,
            registros
        ] = await Promise.all([
            cargarPlantillas(),
            consultarCatalogo()
        ]);

        const grupos =
            agruparPorCamara(
                registros
            );

        if (
            grupos.length === 0
        ) {

            destino.replaceChildren();

            return false;

        }

        const instancia =
            ++contadorInstancias;

        const componente =
            plantillas.principal.content
                .firstElementChild
                .cloneNode(
                    true
                );

        const titulo =
            componente.querySelector(
                ".timelapses-titulo"
            );

        const lista =
            componente.querySelector(
                "[data-timelapses-lista]"
            );

        if (
            !titulo
            ||
            !lista
        ) {

            throw new Error(
                "La estructura del componente Timelapses está incompleta."
            );

        }

        titulo.id =
            `timelapses-titulo-${instancia}`;

        destino.setAttribute(
            "aria-labelledby",
            titulo.id
        );

        const fragmento =
            document.createDocumentFragment();

        for (
            const grupo of grupos
        ) {

            fragmento.appendChild(
                crearFichaCamara(
                    plantillas.camara,
                    grupo,
                    instancia
                )
            );

        }

        lista.replaceChildren(
            fragmento
        );

        destino.replaceChildren(
            componente
        );

        destino.hidden = false;

        return true;

    } catch (
        error
    ) {

        /*
         * Un fallo del catálogo no debe romper
         * Actualidad ni dejar una ficha vacía.
         */

        console.error(
            "No se pudo montar el componente público Timelapses.",
            error
        );

        destino.replaceChildren();

        destino.hidden = true;

        return false;

    }

}


// Fin de fichero: js/timelapses.js
