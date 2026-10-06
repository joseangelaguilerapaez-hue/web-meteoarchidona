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
 *     interactivo=0 | 1
 *
 * Ejemplos:
 *
 *     visor-video.html?camara=los-llanos&vista=panoramica&interactivo=0
 *
 *     visor-video.html?camara=los-llanos&vista=ptz&interactivo=1
 *
 * Responsabilidades:
 *
 * - resolver cámara y vista;
 * - reproducir HLS;
 * - gestionar recuperación y errores;
 * - mostrar datos meteorológicos de la estación asociada;
 * - mantener siempre la marca MeteoArchidona;
 * - ofrecer controles propios cuando el visor es interactivo;
 * - maximizar el contenedor completo del visor;
 * - mantener las superposiciones dentro del rectángulo real del vídeo;
 * - evitar solapamientos entre datos meteorológicos y estado.
 */


/* ==========================================================
   CONFIGURACIÓN
   ========================================================== */


const INTERVALO_METEO_MS = 60_000;


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


    const normalizado = String(
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


function obtenerConfiguracion() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );


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
        claveVistaSolicitada === "especifica"
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


    return {

        claveCamara:
            claveCamara,

        claveVista:
            claveVista,

        estacion:
            camara.estacion,

        nombre:
            vista.nombre,

        src:
            vista.src,

        interactivo:
            parametroBooleano(
                parametros.get(
                    "interactivo"
                ),
                false
            )

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


    /*
     * El ancho de la franja meteorológica cambia cuando llegan
     * los valores reales. Recalculamos la posición del estado
     * para evitar que "EN DIRECTO" pueda quedar encima.
     */
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


    const margen =
        movil
            ? 8
            : 12;


    const separacion =
        movil
            ? 6
            : 10;


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

        /*
         * La posición horizontal está centrada mediante CSS.
         *
         * Siempre comenzamos intentando colocar el estado en
         * la primera línea superior.
         */
        estado.style.top =
            arribaBase
            +
            "px";


        /*
         * En visores estrechos la franja de temperatura,
         * humedad y lluvia puede alcanzar el centro.
         *
         * Si realmente invade el espacio de "EN DIRECTO",
         * bajamos únicamente el estado una segunda línea.
         *
         * En cuanto vuelve a existir espacio suficiente
         * —por ejemplo al entrar en pantalla completa—
         * esta misma función lo devuelve automáticamente
         * a la primera línea.
         */
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

        /*
         * La posición horizontal de los controles también
         * está centrada por CSS. Aquí solo se mantiene
         * correctamente su distancia al borde real del vídeo.
         */
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
   CONTROLES
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


    if (video.paused) {

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


async function alternarReproduccion() {

    const {
        video
    } =
        obtenerDom();


    if (
        !video
        ||
        !configuracionActual?.interactivo
    ) {

        return;

    }


    if (video.paused) {

        try {

            await video.play();

        } catch (error) {

            console.debug(
                "No se pudo iniciar la reproducción.",
                error
            );

        }


    } else {

        video.pause();

    }


    actualizarBotonPlay();

}


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
   MODO INTERACTIVO
   ========================================================== */


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


    const interactivo =
        Boolean(
            configuracionActual?.interactivo
        );


    raiz.classList.toggle(
        "interactivo",
        interactivo
    );


    raiz.classList.toggle(
        "no-interactivo",
        !interactivo
    );


    video.controls =
        false;


    video.playsInline =
        true;


    video.autoplay =
        true;


    video.muted =
        true;


    video.disablePictureInPicture =
        true;


    video.setAttribute(
        "controlslist",
        "nodownload noplaybackrate noremoteplayback"
    );


    if (!interactivo) {

        video.tabIndex =
            -1;

    }


    if (controles) {

        controles.hidden =
            !interactivo;

    }


    if (
        interactivo
        &&
        botonPlay
    ) {

        botonPlay.addEventListener(
            "click",
            alternarReproduccion
        );

    }


    if (
        interactivo
        &&
        botonFullscreen
    ) {

        botonFullscreen.addEventListener(
            "click",
            alternarFullscreen
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
                    configuracionActual?.interactivo
                        ? "PULSA PLAY"
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
                            configuracionActual?.interactivo
                                ? "PULSA PLAY"
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

    const {
        video
    } =
        obtenerDom();


    if (!video) {

        throw new Error(
            "No existe el elemento de vídeo."
        );

    }


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


function registrarEventosGlobales() {

    window.addEventListener(
        "resize",
        posicionarSuperposiciones
    );


    window.addEventListener(
        "orientationchange",
        posicionarSuperposiciones
    );


    document.addEventListener(
        "fullscreenchange",
        () => {

            window.setTimeout(
                posicionarSuperposiciones,
                50
            );

        }
    );


    document.addEventListener(
        "webkitfullscreenchange",
        () => {

            window.setTimeout(
                posicionarSuperposiciones,
                50
            );

        }
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


        configurarInteractividad();


        registrarEventosGlobales();


        prepararReproduccion();


        iniciarActualizacionMeteo();


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