"use strict";

/*
 * MeteoArchidona
 * Visor de vídeo reutilizable
 *
 * Componente autónomo para reproducir cámaras meteorológicas.
 *
 * Parámetros admitidos:
 *
 *     camara=los-llanos
 *     vista=panoramica | ptz
 *     estacion=LOS_LLANOS
 *     disponible=0 | 1
 *     compacto=0 | 1
 *     interactivo=0 | 1
 *     autoplay=0 | 1
 *     controles=0 | 1
 *     click=0 | 1
 *
 * Valores por defecto:
 *
 *     disponible=1
 *     compacto=0
 *     interactivo=0
 *     autoplay=1
 *     controles=interactivo
 *     click=0
 *
 * Ejemplos:
 *
 * Visor interactivo con reproducción automática:
 *
 *     video.html?camara=los-llanos&vista=panoramica&interactivo=1
 *
 * Visor compacto para ficha de estación:
 *
 *     video.html?camara=los-llanos&vista=panoramica
 *         &estacion=LOS_LLANOS
 *         &compacto=1
 *         &disponible=1
 *         &interactivo=1
 *         &autoplay=0
 *         &controles=1
 *         &click=1
 *
 * Visor de estación todavía sin cámara:
 *
 *     video.html?estacion=EL_SILO&disponible=0
 *
 * Cuando disponible=0:
 *
 * - no se resuelve ninguna cámara;
 * - no se carga ningún manifiesto HLS;
 * - no se realiza ningún intento de conexión;
 * - no se habilitan controles ni interacción;
 * - se mantiene la portada corporativa de Cámaras;
 * - se muestra que esa estación todavía no dispone de vídeo.
 *
 * Responsabilidades:
 *
 * - resolver cámara y vista;
 * - admitir estaciones todavía sin vídeo;
 * - reproducir HLS;
 * - poder retrasar completamente la carga del stream;
 * - iniciar la emisión mediante pulsación;
 * - pausar y reanudar mediante pulsación;
 * - detener la descarga HLS.js mientras está pausado;
 * - gestionar recuperación y errores;
 * - mostrar datos meteorológicos de la estación asociada;
 * - mantener siempre la marca MeteoArchidona;
 * - ofrecer controles propios cuando se soliciten;
 * - ocultar el botón play cuando click=1, porque el visor ya alterna la reproducción;
 * - conservar fullscreen como único control visible en ese modo;
 * - maximizar el contenedor completo del visor;
 * - permitir zoom táctil y desplazamiento en pantalla completa;
 * - mantener controles y superposiciones fijos durante el zoom;
 * - mantener las superposiciones dentro del rectángulo real del vídeo;
 * - evitar solapamientos entre datos meteorológicos y estado.
 */


/* ==========================================================
   CONFIGURACIÓN
   ========================================================== */


const INTERVALO_METEO_MS = 60_000;

const ZOOM_VIDEO_MIN = 1;

const ZOOM_VIDEO_MAX = 4;


const CAMARAS = {

    "los-llanos": {

        estacion:
            "LOS_LLANOS",

        vistas: {

            panoramica: {

                nombre:
                    "Los Llanos · Panorámica",

                src:
                    "/live/los-llanos/panoramica/index.m3u8"

            },

            ptz: {

                nombre:
                    "Los Llanos · PTZ",

                src:
                    "/live/los-llanos/ptz/index.m3u8"

            }

        }

    }

};


let reproductorHls = null;

let temporizadorMeteo = null;

let configuracionActual = null;

let reproduccionPreparada = false;

let cargaHlsDetenida = false;


/*
 * Estado del zoom táctil.
 *
 * Solo se utiliza cuando el contenedor del visor está
 * realmente en pantalla completa.
 */
let zoomVideo =
    ZOOM_VIDEO_MIN;

let desplazamientoZoomX = 0;

let desplazamientoZoomY = 0;

let distanciaPinzaInicial = null;

let zoomPinzaInicial =
    ZOOM_VIDEO_MIN;

let ultimoToqueArrastre = null;

let suprimirClickVisorHasta = 0;


/* ==========================================================
   DOM
   ========================================================== */


function obtenerDom() {

    return {

        raiz:
            document.getElementById(
                "visor-video"
            ),

        video:
            document.getElementById(
                "visor-video-elemento"
            ),

        estado:
            document.getElementById(
                "visor-video-estado"
            ),

        meteo:
            document.getElementById(
                "visor-video-meteo"
            ),

        temperatura:
            document.getElementById(
                "visor-video-temperatura"
            ),

        humedad:
            document.getElementById(
                "visor-video-humedad"
            ),

        lluvia:
            document.getElementById(
                "visor-video-lluvia"
            ),

        marca:
            document.getElementById(
                "visor-video-marca"
            ),

        error:
            document.getElementById(
                "visor-video-error"
            ),

        errorTexto:
            document.getElementById(
                "visor-video-error-texto"
            ),

        controles:
            document.getElementById(
                "visor-video-controles"
            ),

        botonPlay:
            document.getElementById(
                "visor-video-play"
            ),

        botonFullscreen:
            document.getElementById(
                "visor-video-fullscreen"
            )

    };

}


/* ==========================================================
   PARÁMETROS
   ========================================================== */


function parametroBooleano(
    valor,
    valorDefecto = false
) {

    if (valor === null) {
        return valorDefecto;
    }


    const normalizado =
        String(
            valor
        )
            .trim()
            .toLowerCase();


    return [
        "1",
        "true",
        "si",
        "sí",
        "yes",
        "on"
    ].includes(
        normalizado
    );

}


function normalizarCodigoEstacion(
    valor
) {

    const codigo =
        String(
            valor
            ??
            ""
        )
            .trim()
            .toUpperCase();


    return codigo || null;

}


function obtenerConfiguracion() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );


    const disponible =
        parametroBooleano(
            parametros.get(
                "disponible"
            ),
            true
        );


    const compacto =
        parametroBooleano(
            parametros.get(
                "compacto"
            ),
            false
        );


    const estacionSolicitada =
        normalizarCodigoEstacion(
            parametros.get(
                "estacion"
            )
        );


    /*
     * Una estación sin cámara constituye un estado válido
     * del visor, no un error.
     */
    if (!disponible) {

        return {

            disponible:
                false,

            compacto:
                compacto,

            claveCamara:
                null,

            claveVista:
                null,

            estacion:
                estacionSolicitada,

            nombre:
                "Vídeo en directo no disponible",

            src:
                null,

            interactivo:
                false,

            autoplay:
                false,

            controles:
                false,

            clickAlterna:
                false

        };

    }


    const claveCamara =
        parametros.get(
            "camara"
        )
        ||
        "los-llanos";


    const claveVistaSolicitada =
        parametros.get(
            "vista"
        )
        ||
        "panoramica";


    const claveVista =
        claveVistaSolicitada
        ===
        "especifica"
            ? "ptz"
            : claveVistaSolicitada;


    const camara =
        CAMARAS[
            claveCamara
        ];


    if (!camara) {

        throw new Error(
            `Cámara desconocida: ${claveCamara}`
        );

    }


    const vista =
        camara.vistas[
            claveVista
        ];


    if (!vista) {

        throw new Error(
            `Vista desconocida: ${claveVista}`
        );

    }


    const interactivo =
        parametroBooleano(
            parametros.get(
                "interactivo"
            ),
            false
        );


    const autoplay =
        parametroBooleano(
            parametros.get(
                "autoplay"
            ),
            true
        );


    const controles =
        parametroBooleano(
            parametros.get(
                "controles"
            ),
            interactivo
        );


    const clickAlterna =
        parametroBooleano(
            parametros.get(
                "click"
            ),
            false
        );


    return {

        disponible:
            true,

        compacto:
            compacto,

        claveCamara:
            claveCamara,

        claveVista:
            claveVista,

        estacion:
            estacionSolicitada
            ||
            camara.estacion,

        nombre:
            vista.nombre,

        src:
            vista.src,

        interactivo:
            interactivo,

        autoplay:
            autoplay,

        controles:
            controles,

        clickAlterna:
            clickAlterna

    };

}


/* ==========================================================
   API
   ========================================================== */


function obtenerApiBase() {

    return String(
        window.API_BASE || "/api"
    )
        .trim()
        .replace(
            /\/+$/,
            ""
        );

}


/* ==========================================================
   FORMATO
   ========================================================== */


function numeroValido(valor) {

    return (
        valor !== null
        &&
        valor !== undefined
        &&
        valor !== ""
        &&
        Number.isFinite(
            Number(
                valor
            )
        )
    );

}


function formatearNumero(
    valor,
    decimales = 1
) {

    if (!numeroValido(valor)) {
        return "—";
    }


    return Number(
        valor
    ).toFixed(
        decimales
    );

}


/* ==========================================================
   ESTADO
   ========================================================== */


function establecerEstado(texto) {

    const {
        estado
    } =
        obtenerDom();


    if (!estado) {
        return;
    }


    estado.textContent =
        texto;


    window.requestAnimationFrame(
        posicionarSuperposiciones
    );

}


function mostrarError(mensaje) {

    const {
        error,
        errorTexto
    } =
        obtenerDom();


    if (errorTexto) {

        errorTexto.textContent =
            mensaje;

    }


    if (error) {

        error.classList.add(
            "visible"
        );

    }

}


function ocultarError() {

    const {
        error
    } =
        obtenerDom();


    if (error) {

        error.classList.remove(
            "visible"
        );

    }

}


/* ==========================================================
   PORTADA
   ========================================================== */


function mostrarPortada() {

    const {
        raiz,
        video
    } =
        obtenerDom();


    if (raiz) {

        raiz.classList.remove(
            "no-disponible"
        );


        raiz.classList.add(
            "portada-activa"
        );

    }


    if (video) {

        video.autoplay =
            false;

        video.preload =
            "none";

    }


    establecerEstado(
        "PULSA PARA VER EN DIRECTO"
    );

}


function mostrarPortadaNoDisponible() {

    const {
        raiz,
        video,
        meteo,
        marca,
        controles
    } =
        obtenerDom();


    if (raiz) {

        raiz.classList.add(
            "portada-activa",
            "no-disponible"
        );

    }


    if (video) {

        video.autoplay =
            false;

        video.preload =
            "none";

        video.pause();

        video.removeAttribute(
            "src"
        );

    }


    if (meteo) {
        meteo.hidden = true;
    }


    if (marca) {
        marca.hidden = true;
    }


    if (controles) {
        controles.hidden = true;
    }


    establecerEstado(
        "VÍDEO EN DIRECTO NO DISPONIBLE"
    );

}


function ocultarPortada() {

    const {
        raiz
    } =
        obtenerDom();


    if (!raiz) {
        return;
    }


    raiz.classList.remove(
        "portada-activa",
        "no-disponible"
    );

}


/* ==========================================================
   METEOROLOGÍA
   ========================================================== */


function mostrarMeteo(datos) {

    const {
        temperatura,
        humedad,
        lluvia
    } =
        obtenerDom();


    if (temperatura) {

        temperatura.textContent =
            `${formatearNumero(
                datos?.temperatura_c
            )} °C`;

    }


    if (humedad) {

        humedad.textContent =
            `${formatearNumero(
                datos?.humedad_pct
            )} %`;

    }


    if (lluvia) {

        lluvia.textContent =
            `${formatearNumero(
                datos?.lluvia_dia_mm
            )} mm`;

    }


    window.requestAnimationFrame(
        posicionarSuperposiciones
    );

}


function mostrarMeteoSinDatos() {

    const {
        temperatura,
        humedad,
        lluvia
    } =
        obtenerDom();


    if (temperatura) {
        temperatura.textContent = "— °C";
    }


    if (humedad) {
        humedad.textContent = "— %";
    }


    if (lluvia) {
        lluvia.textContent = "— mm";
    }


    window.requestAnimationFrame(
        posicionarSuperposiciones
    );

}


async function actualizarMeteo() {

    if (
        !configuracionActual
        ||
        !configuracionActual.estacion
        ||
        !configuracionActual.disponible
    ) {

        mostrarMeteoSinDatos();

        return;

    }


    try {

        const respuesta =
            await fetch(
                `${obtenerApiBase()}/condiciones-actuales/${
                    encodeURIComponent(
                        configuracionActual.estacion
                    )
                }`,
                {
                    cache:
                        "no-store"
                }
            );


        if (!respuesta.ok) {

            throw new Error(
                `HTTP ${respuesta.status}`
            );

        }


        const datos =
            await respuesta.json();


        mostrarMeteo(
            datos
        );


    } catch (error) {

        console.debug(
            "No se pudieron actualizar los datos meteorológicos del visor.",
            error
        );


        mostrarMeteoSinDatos();

    }

}


function iniciarActualizacionMeteo() {

    detenerActualizacionMeteo();


    if (
        !configuracionActual?.disponible
    ) {

        return;

    }


    actualizarMeteo();


    temporizadorMeteo =
        window.setInterval(
            actualizarMeteo,
            INTERVALO_METEO_MS
        );

}


function detenerActualizacionMeteo() {

    if (!temporizadorMeteo) {
        return;
    }


    window.clearInterval(
        temporizadorMeteo
    );


    temporizadorMeteo = null;

}


/* ==========================================================
   RECTÁNGULO REAL DEL VÍDEO
   ========================================================== */


function obtenerRectanguloVideo(video) {

    const anchoContenedor =
        video.clientWidth;


    const altoContenedor =
        video.clientHeight;


    if (
        !anchoContenedor
        ||
        !altoContenedor
        ||
        !video.videoWidth
        ||
        !video.videoHeight
    ) {

        return null;

    }


    const proporcionContenedor =
        anchoContenedor
        /
        altoContenedor;


    const proporcionVideo =
        video.videoWidth
        /
        video.videoHeight;


    let anchoVideo;
    let altoVideo;
    let izquierda;
    let arriba;


    if (
        proporcionVideo
        >
        proporcionContenedor
    ) {

        anchoVideo =
            anchoContenedor;


        altoVideo =
            anchoContenedor
            /
            proporcionVideo;


        izquierda =
            0;


        arriba =
            (
                altoContenedor
                -
                altoVideo
            )
            /
            2;


    } else {

        altoVideo =
            altoContenedor;


        anchoVideo =
            altoContenedor
            *
            proporcionVideo;


        arriba =
            0;


        izquierda =
            (
                anchoContenedor
                -
                anchoVideo
            )
            /
            2;

    }


    return {

        izquierda:
            izquierda,

        arriba:
            arriba,

        derecha:
            anchoContenedor
            -
            izquierda
            -
            anchoVideo,

        abajo:
            altoContenedor
            -
            arriba
            -
            altoVideo

    };

}


/* ==========================================================
   SOLAPAMIENTOS
   ========================================================== */


function seSolapanHorizontalmente(
    elementoA,
    elementoB,
    separacion = 0
) {

    if (
        !elementoA
        ||
        !elementoB
    ) {

        return false;

    }


    const a =
        elementoA.getBoundingClientRect();


    const b =
        elementoB.getBoundingClientRect();


    return (
        a.right
        +
        separacion
        >
        b.left
        &&
        b.right
        +
        separacion
        >
        a.left
    );

}


/* ==========================================================
   SUPERPOSICIONES
   ========================================================== */


function posicionarSuperposiciones() {

    const {
        video,
        estado,
        meteo,
        marca,
        controles
    } =
        obtenerDom();


    if (!video) {
        return;
    }


    if (
        !reproduccionPreparada
    ) {

        return;

    }


    const rectangulo =
        obtenerRectanguloVideo(
            video
        );


    if (!rectangulo) {
        return;
    }


    const movil =
        window.matchMedia(
            "(max-width:640px)"
        ).matches;


    const compacto =
        Boolean(
            configuracionActual?.compacto
        )
        &&
        !documentoEnFullscreen();


    const margen =
        compacto
            ? 5
            : (
                movil
                    ? 8
                    : 12
            );


    const separacion =
        compacto
            ? 4
            : (
                movil
                    ? 6
                    : 10
            );


    const arribaBase =
        rectangulo.arriba
        +
        margen;


    if (meteo) {

        meteo.style.left =
            (
                rectangulo.izquierda
                +
                margen
            )
            +
            "px";


        meteo.style.top =
            arribaBase
            +
            "px";

    }


    if (estado) {

        estado.style.top =
            arribaBase
            +
            "px";


        if (
            meteo
            &&
            seSolapanHorizontalmente(
                meteo,
                estado,
                separacion
            )
        ) {

            estado.style.top =
                (
                    arribaBase
                    +
                    meteo.offsetHeight
                    +
                    separacion
                )
                +
                "px";

        }

    }


    if (marca) {

        marca.style.left =
            (
                rectangulo.izquierda
                +
                margen
            )
            +
            "px";


        marca.style.bottom =
            (
                rectangulo.abajo
                +
                margen
            )
            +
            "px";

    }


    if (controles) {

        controles.style.bottom =
            (
                rectangulo.abajo
                +
                margen
            )
            +
            "px";

    }

}


/* ==========================================================
   BOTÓN PLAY
   ========================================================== */


function actualizarBotonPlay() {

    const {
        video,
        botonPlay
    } =
        obtenerDom();


    if (
        !video
        ||
        !botonPlay
    ) {

        return;

    }


    if (
        !reproduccionPreparada
        ||
        video.paused
    ) {

        botonPlay.textContent =
            "▶";

        botonPlay.setAttribute(
            "aria-label",
            "Reproducir vídeo"
        );


    } else {

        botonPlay.textContent =
            "❚❚";

        botonPlay.setAttribute(
            "aria-label",
            "Pausar vídeo"
        );

    }

}


/* ==========================================================
   PAUSA Y REANUDACIÓN
   ========================================================== */


function detenerCargaHls() {

    if (
        !reproductorHls
        ||
        typeof reproductorHls.stopLoad
        !==
        "function"
    ) {

        return;

    }


    try {

        reproductorHls.stopLoad();

        cargaHlsDetenida =
            true;


    } catch (error) {

        console.debug(
            "No se pudo detener temporalmente la carga HLS.",
            error
        );

    }

}


function reanudarCargaHls() {

    if (
        !reproductorHls
        ||
        !cargaHlsDetenida
        ||
        typeof reproductorHls.startLoad
        !==
        "function"
    ) {

        return;

    }


    try {

        reproductorHls.startLoad(
            -1
        );

        cargaHlsDetenida =
            false;


    } catch (error) {

        console.debug(
            "No se pudo reanudar la carga HLS.",
            error
        );

    }

}


function pausarReproduccion() {

    const {
        video
    } =
        obtenerDom();


    if (
        !video
        ||
        !reproduccionPreparada
        ||
        !configuracionActual?.disponible
    ) {

        return;

    }


    video.pause();


    detenerCargaHls();


    establecerEstado(
        "PAUSADO"
    );


    actualizarBotonPlay();

}


async function reanudarReproduccion() {

    const {
        video
    } =
        obtenerDom();


    if (
        !video
        ||
        !configuracionActual?.disponible
    ) {

        return;

    }


    if (!reproduccionPreparada) {

        ocultarPortada();

        prepararReproduccion();

        return;

    }


    reanudarCargaHls();


    try {

        await video.play();


    } catch (error) {

        console.debug(
            "No se pudo reanudar la reproducción.",
            error
        );


        establecerEstado(
            "PULSA PARA REPRODUCIR"
        );

    }


    actualizarBotonPlay();

}


async function alternarReproduccion() {

    const {
        video
    } =
        obtenerDom();


    if (
        !video
        ||
        !configuracionActual?.disponible
    ) {

        return;

    }


    const puedeAlternar =
        Boolean(
            configuracionActual?.interactivo
            ||
            configuracionActual?.clickAlterna
        );


    if (!puedeAlternar) {
        return;
    }


    if (!reproduccionPreparada) {

        await reanudarReproduccion();

        return;

    }


    if (video.paused) {

        await reanudarReproduccion();


    } else {

        pausarReproduccion();

    }

}


/* ==========================================================
   PANTALLA COMPLETA
   ========================================================== */


function documentoEnFullscreen() {

    return (
        document.fullscreenElement
        ||
        document.webkitFullscreenElement
        ||
        null
    );

}


async function alternarFullscreen() {

    if (
        !configuracionActual?.interactivo
        ||
        !configuracionActual?.disponible
    ) {

        return;

    }


    const {
        raiz
    } =
        obtenerDom();


    if (!raiz) {
        return;
    }


    try {

        if (
            documentoEnFullscreen()
        ) {

            if (
                document.exitFullscreen
            ) {

                await document.exitFullscreen();


            } else if (
                document.webkitExitFullscreen
            ) {

                document.webkitExitFullscreen();

            }


            return;

        }


        if (
            raiz.requestFullscreen
        ) {

            await raiz.requestFullscreen();


        } else if (
            raiz.webkitRequestFullscreen
        ) {

            raiz.webkitRequestFullscreen();

        }


    } catch (error) {

        console.debug(
            "No se pudo cambiar el modo de pantalla completa.",
            error
        );

    }

}


/* ==========================================================
   ZOOM TÁCTIL EN PANTALLA COMPLETA
   ========================================================== */


function limitarValor(
    valor,
    minimo,
    maximo
) {

    return Math.min(
        maximo,
        Math.max(
            minimo,
            valor
        )
    );

}


function visorEstaEnFullscreen() {

    const {
        raiz
    } =
        obtenerDom();


    return (
        Boolean(
            raiz
        )
        &&
        documentoEnFullscreen()
        ===
        raiz
    );

}


function marcarGestoZoom() {

    /*
     * Algunos navegadores móviles generan un click sintético
     * después de terminar un gesto táctil.
     *
     * Ese click no debe pausar ni reanudar el vídeo.
     */
    suprimirClickVisorHasta =
        Date.now()
        +
        700;

}


function configurarEstiloZoomFullscreen() {

    const {
        raiz,
        video
    } =
        obtenerDom();


    if (
        !raiz
        ||
        !video
    ) {

        return;
    }


    if (
        visorEstaEnFullscreen()
    ) {

        /*
         * Muy importante en Android:
         *
         * aplicamos touch-action tanto al contenedor como al
         * propio <video>, porque el vídeo es normalmente el
         * elemento que recibe el primer contacto del gesto.
         */
        raiz.style.touchAction =
            "none";

        video.style.touchAction =
            "none";

        raiz.style.userSelect =
            "none";

        video.style.userSelect =
            "none";

        video.style.webkitUserSelect =
            "none";

        video.style.transformOrigin =
            "center center";

        video.style.willChange =
            "transform";


    } else {

        raiz.style.touchAction =
            "";

        video.style.touchAction =
            "";

        raiz.style.userSelect =
            "";

        video.style.userSelect =
            "";

        video.style.webkitUserSelect =
            "";

        video.style.transformOrigin =
            "";

        video.style.willChange =
            "";

    }

}


function limitarDesplazamientoZoom() {

    const {
        raiz
    } =
        obtenerDom();


    if (!raiz) {
        return;
    }


    if (
        zoomVideo
        <=
        ZOOM_VIDEO_MIN
    ) {

        desplazamientoZoomX = 0;

        desplazamientoZoomY = 0;

        return;

    }


    const maximoX =
        (
            raiz.clientWidth
            *
            (
                zoomVideo
                -
                ZOOM_VIDEO_MIN
            )
        )
        /
        2;


    const maximoY =
        (
            raiz.clientHeight
            *
            (
                zoomVideo
                -
                ZOOM_VIDEO_MIN
            )
        )
        /
        2;


    desplazamientoZoomX =
        limitarValor(
            desplazamientoZoomX,
            -maximoX,
            maximoX
        );


    desplazamientoZoomY =
        limitarValor(
            desplazamientoZoomY,
            -maximoY,
            maximoY
        );

}


function aplicarZoomVideo() {

    const {
        video
    } =
        obtenerDom();


    if (!video) {
        return;
    }


    limitarDesplazamientoZoom();


    if (
        zoomVideo
        <=
        ZOOM_VIDEO_MIN
    ) {

        video.style.transform =
            "";

        return;

    }


    /*
     * Solo transformamos el vídeo.
     *
     * Los controles, datos meteorológicos, estado y logotipo
     * permanecen en su tamaño y posición normales.
     */
    video.style.transform =
        `translate3d(${
            desplazamientoZoomX
        }px, ${
            desplazamientoZoomY
        }px, 0) scale(${
            zoomVideo
        })`;

}


function reiniciarZoomVideo() {

    zoomVideo =
        ZOOM_VIDEO_MIN;

    desplazamientoZoomX = 0;

    desplazamientoZoomY = 0;

    distanciaPinzaInicial =
        null;

    zoomPinzaInicial =
        ZOOM_VIDEO_MIN;

    ultimoToqueArrastre =
        null;


    aplicarZoomVideo();

}


/* ==========================================================
   UTILIDADES DE TOUCH
   ========================================================== */


function distanciaEntreToques(
    toqueA,
    toqueB
) {

    return Math.hypot(
        toqueB.clientX
        -
        toqueA.clientX,

        toqueB.clientY
        -
        toqueA.clientY
    );

}


function iniciarPinza(
    evento
) {

    if (
        evento.touches.length
        <
        2
    ) {

        distanciaPinzaInicial =
            null;

        return;

    }


    distanciaPinzaInicial =
        distanciaEntreToques(
            evento.touches[0],
            evento.touches[1]
        );


    zoomPinzaInicial =
        zoomVideo;


    ultimoToqueArrastre =
        null;

}


/* ==========================================================
   EVENTOS TÁCTILES DEL ZOOM
   ========================================================== */


function iniciarGestoZoomTactil(
    evento
) {

    if (
        !visorEstaEnFullscreen()
        ||
        !configuracionActual?.interactivo
        ||
        !configuracionActual?.disponible
    ) {

        return;

    }


    /*
     * Los controles propios siguen funcionando normalmente.
     *
     * Un dedo sobre el botón fullscreen no debe iniciar
     * desplazamiento de la imagen.
     */
    if (
        evento.touches.length
        ===
        1
        &&
        evento.target.closest(
            ".visor-video-control"
        )
    ) {

        return;

    }


    if (
        evento.touches.length
        >=
        2
    ) {

        /*
         * Desde el segundo dedo el gesto pertenece al visor,
         * no al navegador.
         */
        evento.preventDefault();

        iniciarPinza(
            evento
        );

        marcarGestoZoom();

        return;

    }


    /*
     * Con un solo dedo únicamente empezamos un arrastre si
     * el vídeo ya está ampliado.
     *
     * A 1× dejamos que un toque normal pueda seguir
     * pausando/reanudando el visor.
     */
    if (
        evento.touches.length
        ===
        1
        &&
        zoomVideo
        >
        ZOOM_VIDEO_MIN
    ) {

        ultimoToqueArrastre = {

            x:
                evento.touches[0].clientX,

            y:
                evento.touches[0].clientY

        };

    }

}


function moverGestoZoomTactil(
    evento
) {

    if (
        !visorEstaEnFullscreen()
    ) {

        return;

    }


    /*
     * PINZA
     * ------------------------------------------------------
     */
    if (
        evento.touches.length
        >=
        2
    ) {

        evento.preventDefault();

        marcarGestoZoom();


        if (
            !distanciaPinzaInicial
        ) {

            iniciarPinza(
                evento
            );

        }


        const distanciaActual =
            distanciaEntreToques(
                evento.touches[0],
                evento.touches[1]
            );


        if (
            !distanciaActual
            ||
            !distanciaPinzaInicial
        ) {

            return;

        }


        zoomVideo =
            limitarValor(
                zoomPinzaInicial
                *
                (
                    distanciaActual
                    /
                    distanciaPinzaInicial
                ),
                ZOOM_VIDEO_MIN,
                ZOOM_VIDEO_MAX
            );


        /*
         * Cerca de 1× volvemos exactamente al estado inicial.
         */
        if (
            zoomVideo
            <=
            ZOOM_VIDEO_MIN
            +
            0.01
        ) {

            zoomVideo =
                ZOOM_VIDEO_MIN;

            desplazamientoZoomX = 0;

            desplazamientoZoomY = 0;

        }


        aplicarZoomVideo();

        return;

    }


    /*
     * ARRASTRE CON UN DEDO
     * ------------------------------------------------------
     */
    if (
        evento.touches.length
        !==
        1
        ||
        zoomVideo
        <=
        ZOOM_VIDEO_MIN
        ||
        !ultimoToqueArrastre
    ) {

        return;

    }


    evento.preventDefault();


    const toque =
        evento.touches[0];


    const deltaX =
        toque.clientX
        -
        ultimoToqueArrastre.x;


    const deltaY =
        toque.clientY
        -
        ultimoToqueArrastre.y;


    if (
        Math.abs(
            deltaX
        )
        +
        Math.abs(
            deltaY
        )
        >
        1
    ) {

        desplazamientoZoomX +=
            deltaX;

        desplazamientoZoomY +=
            deltaY;


        marcarGestoZoom();

        aplicarZoomVideo();

    }


    ultimoToqueArrastre = {

        x:
            toque.clientX,

        y:
            toque.clientY

    };

}


function finalizarGestoZoomTactil(
    evento
) {

    if (
        !visorEstaEnFullscreen()
    ) {

        return;

    }


    /*
     * Si queda todavía un dedo después de una pinza,
     * ese mismo dedo puede continuar desplazando la imagen.
     */
    if (
        evento.touches.length
        ===
        1
        &&
        zoomVideo
        >
        ZOOM_VIDEO_MIN
    ) {

        marcarGestoZoom();


        ultimoToqueArrastre = {

            x:
                evento.touches[0].clientX,

            y:
                evento.touches[0].clientY

        };


        distanciaPinzaInicial =
            null;

        zoomPinzaInicial =
            zoomVideo;


        return;

    }


    if (
        evento.touches.length
        ===
        0
    ) {

        distanciaPinzaInicial =
            null;

        zoomPinzaInicial =
            zoomVideo;

        ultimoToqueArrastre =
            null;

    }

}


function cancelarGestoZoomTactil() {

    distanciaPinzaInicial =
        null;

    zoomPinzaInicial =
        zoomVideo;

    ultimoToqueArrastre =
        null;

}


function configurarZoomPantallaCompleta() {

    const {
        raiz
    } =
        obtenerDom();


    if (!raiz) {
        return;
    }


    /*
     * Utilizamos Touch Events de forma deliberada.
     *
     * En Chrome/Android el fullscreen del elemento <video>
     * puede comportarse de forma diferente con Pointer Events.
     * Touch Events nos permite leer directamente los dos dedos
     * que forman la pinza.
     */
    raiz.addEventListener(
        "touchstart",
        iniciarGestoZoomTactil,
        {
            passive:
                false
        }
    );


    raiz.addEventListener(
        "touchmove",
        moverGestoZoomTactil,
        {
            passive:
                false
        }
    );


    raiz.addEventListener(
        "touchend",
        finalizarGestoZoomTactil,
        {
            passive:
                false
        }
    );


    raiz.addEventListener(
        "touchcancel",
        cancelarGestoZoomTactil,
        {
            passive:
                false
        }
    );

}


/* ==========================================================
   INTERACCIÓN
   ========================================================== */


function pulsacionSobreVisor(evento) {

    /*
     * Los botones propios tienen comportamiento independiente.
     */
    if (
        evento.target.closest(
            ".visor-video-control"
        )
    ) {

        return;

    }


    /*
     * Después de una pinza o un arrastre Android puede generar
     * un click sintético.
     *
     * No permitimos que ese click pause/reanude el vídeo.
     */
    if (
        Date.now()
        <
        suprimirClickVisorHasta
    ) {

        evento.preventDefault();

        evento.stopPropagation();

        return;

    }


    if (
        !configuracionActual?.clickAlterna
        ||
        !configuracionActual?.disponible
    ) {

        return;

    }


    alternarReproduccion();

}


function configurarInteractividad() {

    const {
        raiz,
        video,
        controles,
        botonPlay,
        botonFullscreen
    } =
        obtenerDom();


    if (
        !raiz
        ||
        !video
    ) {

        return;

    }


    const disponible =
        Boolean(
            configuracionActual?.disponible
        );


    const interactivo =
        disponible
        &&
        Boolean(
            configuracionActual?.interactivo
        );


    const clickAlterna =
        disponible
        &&
        Boolean(
            configuracionActual?.clickAlterna
        );


    const mostrarControles =
        disponible
        &&
        Boolean(
            configuracionActual?.controles
        );


    raiz.classList.toggle(
        "interactivo",
        interactivo
        ||
        clickAlterna
    );


    raiz.classList.toggle(
        "no-interactivo",
        !interactivo
        &&
        !clickAlterna
    );


    raiz.classList.toggle(
        "click-alterna",
        clickAlterna
    );


    video.controls =
        false;


    video.playsInline =
        true;


    video.autoplay =
        disponible
        &&
        Boolean(
            configuracionActual?.autoplay
        );


    video.preload =
        video.autoplay
            ? "auto"
            : "none";


    video.muted =
        true;


    video.disablePictureInPicture =
        true;


    video.setAttribute(
        "controlslist",
        "nodownload noplaybackrate noremoteplayback"
    );


    if (
        !interactivo
        &&
        !clickAlterna
    ) {

        video.tabIndex =
            -1;

    }


    const mostrarBotonPlay =
        mostrarControles
        &&
        !clickAlterna;


    const mostrarBotonFullscreen =
        mostrarControles
        &&
        interactivo;


    if (controles) {

        controles.hidden =
            !(
                mostrarBotonPlay
                ||
                mostrarBotonFullscreen
            );

    }


    if (botonPlay) {

        botonPlay.hidden =
            !mostrarBotonPlay;


        botonPlay.style.display =
            mostrarBotonPlay
                ? ""
                : "none";

    }


    if (botonFullscreen) {

        botonFullscreen.hidden =
            !mostrarBotonFullscreen;


        botonFullscreen.style.display =
            mostrarBotonFullscreen
                ? ""
                : "none";

    }


    if (
        mostrarBotonPlay
        &&
        botonPlay
    ) {

        botonPlay.addEventListener(
            "click",
            alternarReproduccion
        );

    }


    if (
        mostrarBotonFullscreen
        &&
        botonFullscreen
    ) {

        botonFullscreen.addEventListener(
            "click",
            alternarFullscreen
        );

    }


    if (clickAlterna) {

        raiz.addEventListener(
            "click",
            pulsacionSobreVisor
        );

    }

}


/* ==========================================================
   HLS NATIVO
   ========================================================== */


function prepararHlsNativo(
    video,
    src
) {

    establecerEstado(
        "CONECTANDO"
    );


    video.src =
        src;


    reproductorHls =
        null;

    cargaHlsDetenida =
        false;


    video.addEventListener(
        "loadedmetadata",
        () => {

            ocultarError();

            posicionarSuperposiciones();

        }
    );


    video.addEventListener(
        "playing",
        () => {

            ocultarError();

            establecerEstado(
                "EN DIRECTO"
            );

            actualizarBotonPlay();

            posicionarSuperposiciones();

        }
    );


    video.addEventListener(
        "pause",
        actualizarBotonPlay
    );


    video.addEventListener(
        "error",
        () => {

            establecerEstado(
                "SIN EMISIÓN"
            );


            mostrarError(
                "La emisión no está disponible en este momento."
            );

        }
    );


    video.play()
        .catch(
            () => {

                establecerEstado(
                    (
                        configuracionActual?.interactivo
                        ||
                        configuracionActual?.clickAlterna
                    )
                        ? "PULSA PARA REPRODUCIR"
                        : "CONECTANDO"
                );

            }
        );

}


/* ==========================================================
   HLS.JS
   ========================================================== */


function prepararHlsJs(
    video,
    src
) {

    const hls =
        new window.Hls({

            liveSyncDurationCount:
                2,

            liveMaxLatencyDurationCount:
                5,

            enableWorker:
                true

        });


    reproductorHls =
        hls;


    cargaHlsDetenida =
        false;


    establecerEstado(
        "CONECTANDO"
    );


    hls.loadSource(
        src
    );


    hls.attachMedia(
        video
    );


    hls.on(
        window.Hls.Events.MANIFEST_PARSED,
        () => {

            ocultarError();


            video.play()
                .catch(
                    () => {

                        establecerEstado(
                            (
                                configuracionActual?.interactivo
                                ||
                                configuracionActual?.clickAlterna
                            )
                                ? "PULSA PARA REPRODUCIR"
                                : "CONECTANDO"
                        );

                    }
                );

        }
    );


    hls.on(
        window.Hls.Events.ERROR,
        (
            event,
            data
        ) => {

            if (!data.fatal) {
                return;
            }


            if (
                data.type
                ===
                window.Hls.ErrorTypes.NETWORK_ERROR
            ) {

                establecerEstado(
                    "RECONECTANDO"
                );


                try {

                    hls.startLoad();

                    cargaHlsDetenida =
                        false;


                } catch (error) {

                    console.debug(
                        "No se pudo reiniciar la carga HLS.",
                        error
                    );

                }


                return;

            }


            if (
                data.type
                ===
                window.Hls.ErrorTypes.MEDIA_ERROR
            ) {

                establecerEstado(
                    "RECUPERANDO"
                );


                try {

                    hls.recoverMediaError();

                } catch (error) {

                    console.debug(
                        "No se pudo recuperar el error multimedia.",
                        error
                    );

                }


                return;

            }


            establecerEstado(
                "SIN EMISIÓN"
            );


            mostrarError(
                "La emisión no puede reproducirse en este momento."
            );

        }
    );


    video.addEventListener(
        "playing",
        () => {

            ocultarError();

            establecerEstado(
                "EN DIRECTO"
            );

            actualizarBotonPlay();

            posicionarSuperposiciones();

        }
    );


    video.addEventListener(
        "pause",
        actualizarBotonPlay
    );


    video.addEventListener(
        "loadedmetadata",
        posicionarSuperposiciones
    );


    video.addEventListener(
        "resize",
        posicionarSuperposiciones
    );

}


/* ==========================================================
   REPRODUCCIÓN
   ========================================================== */


function prepararReproduccion() {

    if (
        reproduccionPreparada
        ||
        !configuracionActual?.disponible
    ) {

        return;

    }


    const {
        video
    } =
        obtenerDom();


    if (!video) {

        throw new Error(
            "No existe el elemento de vídeo."
        );

    }


    if (
        !configuracionActual.src
    ) {

        throw new Error(
            "La cámara no tiene una fuente de vídeo configurada."
        );

    }


    reproduccionPreparada =
        true;


    ocultarPortada();

    ocultarError();


    video.preload =
        "auto";


    const src =
        configuracionActual.src;


    if (
        video.canPlayType(
            "application/vnd.apple.mpegurl"
        )
    ) {

        prepararHlsNativo(
            video,
            src
        );


        return;

    }


    if (
        window.Hls
        &&
        window.Hls.isSupported()
    ) {

        prepararHlsJs(
            video,
            src
        );


        return;

    }


    establecerEstado(
        "NO COMPATIBLE"
    );


    mostrarError(
        "Este navegador no permite reproducir emisiones HLS."
    );

}


/* ==========================================================
   LIMPIEZA
   ========================================================== */


function destruirReproductor() {

    detenerActualizacionMeteo();


    reiniciarZoomVideo();

    configurarEstiloZoomFullscreen();


    if (reproductorHls) {

        try {

            reproductorHls.destroy();

        } catch (error) {

            console.debug(
                "No se pudo destruir el reproductor HLS.",
                error
            );

        }


        reproductorHls =
            null;

    }


    cargaHlsDetenida =
        false;


    reproduccionPreparada =
        false;


    const {
        video
    } =
        obtenerDom();


    if (video) {

        try {

            video.pause();

            video.removeAttribute(
                "src"
            );

            video.load();

        } catch (error) {

            console.debug(
                "No se pudo liberar el elemento de vídeo.",
                error
            );

        }

    }

}


/* ==========================================================
   EVENTOS GLOBALES
   ========================================================== */


function actualizarTrasCambioTamano() {

    aplicarZoomVideo();

    posicionarSuperposiciones();

}


function cambioEstadoFullscreen() {

    /*
     * Cada entrada o salida de fullscreen comienza en 1×.
     *
     * También volvemos a configurar touch-action en este punto,
     * porque ahora ya sabemos con certeza si el visor está
     * dentro o fuera de Fullscreen API.
     */
    reiniciarZoomVideo();

    configurarEstiloZoomFullscreen();


    window.setTimeout(
        posicionarSuperposiciones,
        50
    );

}


function registrarEventosGlobales() {

    window.addEventListener(
        "resize",
        actualizarTrasCambioTamano
    );


    window.addEventListener(
        "orientationchange",
        actualizarTrasCambioTamano
    );


    document.addEventListener(
        "fullscreenchange",
        cambioEstadoFullscreen
    );


    document.addEventListener(
        "webkitfullscreenchange",
        cambioEstadoFullscreen
    );


    window.addEventListener(
        "pagehide",
        destruirReproductor
    );

}


/* ==========================================================
   INICIALIZACIÓN
   ========================================================== */


function inicializarVisorVideo() {

    try {

        configuracionActual =
            obtenerConfiguracion();


        const {
            raiz
        } =
            obtenerDom();


        if (!raiz) {

            throw new Error(
                "No existe el contenedor principal del visor."
            );

        }


        raiz.setAttribute(
            "aria-label",
            configuracionActual.nombre
        );


        raiz.classList.toggle(
            "compacto",
            Boolean(
                configuracionActual.compacto
            )
        );


        configurarInteractividad();


        configurarZoomPantallaCompleta();


        registrarEventosGlobales();


        if (
            !configuracionActual.disponible
        ) {

            mostrarPortadaNoDisponible();

            return;

        }


        iniciarActualizacionMeteo();


        if (
            configuracionActual.autoplay
        ) {

            prepararReproduccion();


        } else {

            mostrarPortada();

            actualizarBotonPlay();

        }


    } catch (error) {

        console.error(
            "No se pudo iniciar el visor de vídeo:",
            error
        );


        establecerEstado(
            "ERROR"
        );


        mostrarError(
            error.message
            ||
            "No se ha podido iniciar el visor."
        );

    }

}


if (
    document.readyState
    ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        inicializarVisorVideo,
        {
            once:
                true
        }
    );


} else {

    inicializarVisorVideo();

}


// Fin de fichero: js/visor-video.js