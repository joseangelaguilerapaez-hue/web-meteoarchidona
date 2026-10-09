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
 * - mantener los controles y superposiciones fijos durante el zoom;
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
 * Solo se utiliza cuando el contenedor del visor está en
 * pantalla completa. La vista incrustada conserva el zoom
 * normal del navegador.
 */
let zoomVideo = ZOOM_VIDEO_MIN;

let desplazamientoZoomX = 0;

let desplazamientoZoomY = 0;

const punterosZoom =
    new Map();

let distanciaPinzaInicial = null;

let zoomPinzaInicial = ZOOM_VIDEO_MIN;

let ultimoPunteroArrastre = null;

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
     *
     * Es fundamental resolver este caso ANTES de aplicar
     * la cámara por defecto, porque una ficha sin cámara
     * nunca debe terminar mostrando Los Llanos.
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


    /*
     * En una portada de cámara pendiente no necesitamos
     * superponer nuevamente datos que ya muestra la ficha.
     */
    if (meteo) {

        meteo.hidden =
            true;

    }


    if (marca) {

        marca.hidden =
            true;

    }


    if (controles) {

        controles.hidden =
            true;

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


    /*
     * Mientras estamos en la portada todavía no existe
     * rectángulo real de vídeo porque no se ha cargado HLS.
     * La portada se posiciona íntegramente mediante CSS.
     */
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


    /*
     * En el visor incrustado de una ficha reducimos también
     * los márgenes internos. Al entrar en pantalla completa
     * recuperamos automáticamente la disposición normal.
     */
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


    /*
     * En navegadores que utilizan hls.js detenemos también
     * la solicitud de nuevos segmentos.
     *
     * El último fotograma permanece visible en el elemento
     * de vídeo.
     */
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


function marcarGestoZoom() {

    /*
     * Android genera en ocasiones un click justo después de
     * finalizar un gesto táctil.
     *
     * Como el visor puede utilizar click para pausar o reanudar,
     * bloqueamos brevemente ese click residual.
     */
    suprimirClickVisorHasta =
        Date.now()
        +
        500;

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
        documentoEnFullscreen()
        ===
        raiz
    ) {

        /*
         * touch-action se activa únicamente en fullscreen.
         *
         * Así el visor incrustado conserva el comportamiento
         * normal del navegador y puede seguir ampliándose con
         * el zoom general de la página.
         */
        raiz.style.touchAction =
            "none";

        video.style.transformOrigin =
            "center center";

        video.style.willChange =
            "transform";


    } else {

        raiz.style.touchAction =
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


    /*
     * El vídeo ocupa el contenedor completo y utiliza
     * object-fit: contain.
     *
     * Limitamos el desplazamiento a la superficie ampliada
     * del propio visor para impedir que la imagen pueda
     * perderse completamente fuera de pantalla.
     */
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
     * La transformación se aplica exclusivamente al elemento
     * de vídeo.
     *
     * Los datos meteorológicos, estado, logotipo y controles
     * permanecen fijos sobre la pantalla completa.
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

    punterosZoom.clear();

    distanciaPinzaInicial =
        null;

    zoomPinzaInicial =
        ZOOM_VIDEO_MIN;

    ultimoPunteroArrastre =
        null;


    aplicarZoomVideo();

}


function distanciaEntrePunteros() {

    const puntos =
        Array.from(
            punterosZoom.values()
        );


    if (
        puntos.length
        <
        2
    ) {

        return null;

    }


    return Math.hypot(
        puntos[1].x
        -
        puntos[0].x,

        puntos[1].y
        -
        puntos[0].y
    );

}


function prepararPinzaZoom() {

    if (
        punterosZoom.size
        <
        2
    ) {

        distanciaPinzaInicial =
            null;

        return;

    }


    distanciaPinzaInicial =
        distanciaEntrePunteros();


    zoomPinzaInicial =
        zoomVideo;


    ultimoPunteroArrastre =
        null;

}


function iniciarGestoZoom(evento) {

    const {
        raiz
    } =
        obtenerDom();


    if (
        !raiz
        ||
        documentoEnFullscreen()
        !==
        raiz
        ||
        !configuracionActual?.interactivo
        ||
        !configuracionActual?.disponible
    ) {

        return;

    }


    /*
     * El ratón conserva su comportamiento habitual.
     * Este mecanismo está pensado para pantalla táctil,
     * stylus y dispositivos equivalentes.
     */
    if (
        evento.pointerType
        ===
        "mouse"
    ) {

        return;

    }


    /*
     * Los botones deben seguir siendo botones aunque
     * estemos en pantalla completa.
     */
    if (
        evento.target.closest(
            ".visor-video-control"
        )
    ) {

        return;

    }


    punterosZoom.set(
        evento.pointerId,
        {
            x:
                evento.clientX,

            y:
                evento.clientY
        }
    );


    try {

        raiz.setPointerCapture(
            evento.pointerId
        );


    } catch (error) {

        console.debug(
            "No se pudo capturar el puntero del zoom.",
            error
        );

    }


    /*
     * Dos punteros:
     * comenzamos un gesto de pinza.
     */
    if (
        punterosZoom.size
        >=
        2
    ) {

        prepararPinzaZoom();

        marcarGestoZoom();

        return;

    }


    /*
     * Un único dedo solo desplaza cuando ya existe zoom.
     */
    if (
        zoomVideo
        >
        ZOOM_VIDEO_MIN
    ) {

        ultimoPunteroArrastre = {

            id:
                evento.pointerId,

            x:
                evento.clientX,

            y:
                evento.clientY

        };

    }

}


function moverGestoZoom(evento) {

    const {
        raiz
    } =
        obtenerDom();


    if (
        !raiz
        ||
        documentoEnFullscreen()
        !==
        raiz
        ||
        !punterosZoom.has(
            evento.pointerId
        )
    ) {

        return;

    }


    /*
     * touch-action:none ya impide el gesto nativo, pero
     * preventDefault añade protección en navegadores móviles
     * con implementaciones parciales de Pointer Events.
     */
    evento.preventDefault();


    punterosZoom.set(
        evento.pointerId,
        {
            x:
                evento.clientX,

            y:
                evento.clientY
        }
    );


    /*
     * PINZA
     * ------------------------------------------------------
     *
     * Conservamos el zoom existente cuando comienza la pinza
     * y aplicamos sobre él la relación entre la distancia
     * actual y la distancia inicial de los dos dedos.
     */
    if (
        punterosZoom.size
        >=
        2
    ) {

        if (
            !distanciaPinzaInicial
        ) {

            prepararPinzaZoom();

        }


        const distanciaActual =
            distanciaEntrePunteros();


        if (
            distanciaActual
            &&
            distanciaPinzaInicial
        ) {

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
             * Evitamos residuos minúsculos cerca de 1×.
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


            marcarGestoZoom();

            aplicarZoomVideo();

        }


        return;

    }


    /*
     * ARRASTRE
     * ------------------------------------------------------
     *
     * Con el vídeo ampliado, un dedo permite recorrer la
     * imagen sin alterar el nivel de zoom.
     */
    if (
        zoomVideo
        <=
        ZOOM_VIDEO_MIN
        ||
        !ultimoPunteroArrastre
        ||
        ultimoPunteroArrastre.id
        !==
        evento.pointerId
    ) {

        return;

    }


    const deltaX =
        evento.clientX
        -
        ultimoPunteroArrastre.x;


    const deltaY =
        evento.clientY
        -
        ultimoPunteroArrastre.y;


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


    ultimoPunteroArrastre = {

        id:
            evento.pointerId,

        x:
            evento.clientX,

        y:
            evento.clientY

    };

}


function finalizarGestoZoom(evento) {

    const {
        raiz
    } =
        obtenerDom();


    if (
        !punterosZoom.has(
            evento.pointerId
        )
    ) {

        return;

    }


    punterosZoom.delete(
        evento.pointerId
    );


    if (raiz) {

        try {

            if (
                raiz.hasPointerCapture(
                    evento.pointerId
                )
            ) {

                raiz.releasePointerCapture(
                    evento.pointerId
                );

            }


        } catch (error) {

            console.debug(
                "No se pudo liberar el puntero del zoom.",
                error
            );

        }

    }


    distanciaPinzaInicial =
        null;


    /*
     * Si aún quedan dos dedos, se establece un nuevo punto
     * de partida para continuar el gesto sin saltos.
     */
    if (
        punterosZoom.size
        >=
        2
    ) {

        prepararPinzaZoom();

        return;

    }


    /*
     * Si después de una pinza queda un dedo apoyado y el
     * vídeo continúa ampliado, ese dedo puede seguir
     * desplazando la imagen.
     */
    if (
        punterosZoom.size
        ===
        1
        &&
        zoomVideo
        >
        ZOOM_VIDEO_MIN
    ) {

        const [
            [
                id,
                punto
            ]
        ] =
            Array.from(
                punterosZoom.entries()
            );


        ultimoPunteroArrastre = {

            id:
                id,

            x:
                punto.x,

            y:
                punto.y

        };


        return;

    }


    ultimoPunteroArrastre =
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


    raiz.addEventListener(
        "pointerdown",
        iniciarGestoZoom
    );


    raiz.addEventListener(
        "pointermove",
        moverGestoZoom,
        {
            passive:
                false
        }
    );


    raiz.addEventListener(
        "pointerup",
        finalizarGestoZoom
    );


    raiz.addEventListener(
        "pointercancel",
        finalizarGestoZoom
    );


    raiz.addEventListener(
        "lostpointercapture",
        finalizarGestoZoom
    );

}


/* ==========================================================
   INTERACCIÓN
   ========================================================== */


function pulsacionSobreVisor(evento) {

    /*
     * Los botones propios tienen su comportamiento independiente.
     * Evitamos que una pulsación sobre ellos llegue también
     * al alternador general del visor.
     */
    if (
        evento.target.closest(
            ".visor-video-control"
        )
    ) {

        return;

    }


    /*
     * Un pellizco o arrastre puede producir un click sintético
     * al levantar los dedos. Ese click no debe pausar ni
     * reanudar accidentalmente el vídeo.
     */
    if (
        Date.now()
        <
        suprimirClickVisorHasta
    ) {

        evento.preventDefault();

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
     * Al salir evitamos que una transformación utilizada en
     * pantalla completa permanezca accidentalmente en la ficha
     * incrustada.
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


        /*
         * El modo compacto se utiliza al incrustar el visor dentro
         * de una ficha de estación. La hoja de estilos reduce ahí
         * superposiciones y controles, pero en fullscreen vuelve
         * a utilizar la escala normal.
         */
        raiz.classList.toggle(
            "compacto",
            Boolean(
                configuracionActual.compacto
            )
        );


        configurarInteractividad();


        configurarZoomPantallaCompleta();


        registrarEventosGlobales();


        /*
         * Este es un estado normal del componente.
         * Terminamos aquí deliberadamente:
         *
         * - no meteorología duplicada;
         * - no HLS;
         * - no peticiones a la cámara;
         * - no reproducción.
         */
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