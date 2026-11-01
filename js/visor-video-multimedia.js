
"use strict";

/*
 * MeteoArchidona
 * Entrada multimedia del visor de vídeo.
 *
 * Archivo:
 *     js/visor-video-multimedia.js
 *
 * Modalidades:
 *
 * - Directo HLS:
 *     conserva el controlador visor-video.js.
 *
 * - MP4:
 *     reproduce archivos propios mediante HTML5.
 *
 * Ambos modos comparten:
 *
 *     visores/video.html
 *     css/visor-video.css
 *
 * El modo MP4 dispone de:
 *
 * - Reproducción y pausa.
 * - Barra de desplazamiento temporal.
 * - Tiempo transcurrido y duración total.
 * - Pantalla completa.
 * - Zoom y desplazamiento táctiles.
 *
 * Los controles temporales no se utilizan en HLS.
 *
 * No se permiten URLs MP4 arbitrarias
 * ni dominios externos.
 */

(() => {

    const parametros = new URLSearchParams(
        window.location.search
    );

    const tipo = parametros.get("tipo");

    /*
     * Mantener intacto el controlador
     * de las emisiones en directo.
     */
    if (tipo !== "mp4") {

        const script = document.createElement("script");

        script.src =
            "../js/visor-video.js?v=20261101-termometro1";

        document.head.appendChild(script);

        return;
    }

    const ZOOM_MIN = 1;
    const ZOOM_MAX = 4;

    const UNIDADES_PROGRESO = 1000;

    let zoom = 1;
    let desplazamientoX = 0;
    let desplazamientoY = 0;

    let distanciaInicial = null;
    let zoomInicial = 1;
    let ultimoToque = null;
    let gestoRealizado = false;
    let suprimirClickHasta = 0;

    let previsualizandoProgreso = false;


    /* ======================================================
       ELEMENTOS DEL VISOR
       ====================================================== */

    function elementos() {

        return {

            raiz: document.getElementById(
                "visor-video"
            ),

            video: document.getElementById(
                "visor-video-elemento"
            ),

            meteo: document.getElementById(
                "visor-video-meteo"
            ),

            marca: document.getElementById(
                "visor-video-marca"
            ),

            estado: document.getElementById(
                "visor-video-estado"
            ),

            error: document.getElementById(
                "visor-video-error"
            ),

            errorTexto: document.getElementById(
                "visor-video-error-texto"
            ),

            controles: document.getElementById(
                "visor-video-controles"
            ),

            botonPlay: document.getElementById(
                "visor-video-play"
            ),

            botonFullscreen: document.getElementById(
                "visor-video-fullscreen"
            ),

            progreso: document.getElementById(
                "visor-video-progreso"
            ),

            barra: document.getElementById(
                "visor-video-busqueda"
            ),

            tiempoActual: document.getElementById(
                "visor-video-tiempo-actual"
            ),

            tiempoTotal: document.getElementById(
                "visor-video-tiempo-total"
            )

        };

    }


    /* ======================================================
       ESTADO Y ERRORES
       ====================================================== */

    function establecerEstado(texto) {

        const { estado } = elementos();

        if (estado) {
            estado.textContent = texto;
        }

    }


    function mostrarError(mensaje) {

        const {
            error,
            errorTexto
        } = elementos();

        establecerEstado("ERROR");

        if (errorTexto) {
            errorTexto.textContent = mensaje;
        }

        if (error) {
            error.classList.add("visible");
        }

    }


    /* ======================================================
       VALIDACIÓN DE LA FUENTE MP4
       ====================================================== */

    function resolverFuenteMP4() {

        const archivo = parametros.get("archivo");

        if (
            !archivo ||
            !archivo.startsWith("/")
        ) {

            throw new Error(
                "No se ha indicado un archivo MP4 válido."
            );

        }

        const url = new URL(
            archivo,
            window.location.origin
        );

        if (
            url.origin !== window.location.origin ||
            url.username ||
            url.password ||
            url.search ||
            url.hash ||
            !url.pathname.endsWith(".mp4")
        ) {

            throw new Error(
                "La fuente de vídeo no está permitida."
            );

        }

        /*
         * Ruta provisional de pruebas y ruta
         * reservada para publicaciones definitivas.
         *
         * La validación de publicación y permisos
         * corresponde a la API.
         */
        const permitida =
            url.pathname ===
                "/timelapse-los-llanos-prueba.mp4" ||
            url.pathname.startsWith(
                "/multimedia/timelapses/"
            );

        if (!permitida) {

            throw new Error(
                "El archivo no pertenece al catálogo MP4."
            );

        }

        return url.pathname;

    }


    /* ======================================================
       DURACIÓN Y FORMATO DE TIEMPO
       ====================================================== */

    function obtenerDuracion() {

        const { video } = elementos();

        if (!video) {
            return null;
        }

        const duracion = Number(
            video.duration
        );

        if (
            !Number.isFinite(duracion) ||
            duracion <= 0
        ) {
            return null;
        }

        return duracion;

    }


    function formatearTiempo(segundos) {

        if (
            !Number.isFinite(segundos) ||
            segundos < 0
        ) {
            return "00:00";
        }

        const total = Math.floor(segundos);

        const horas = Math.floor(
            total / 3600
        );

        const minutos = Math.floor(
            (total % 3600) / 60
        );

        const segundosRestantes =
            total % 60;

        const minutosTexto =
            String(minutos).padStart(2, "0");

        const segundosTexto =
            String(segundosRestantes).padStart(2, "0");

        if (horas > 0) {

            return (
                String(horas).padStart(2, "0") +
                ":" +
                minutosTexto +
                ":" +
                segundosTexto
            );

        }

        return (
            minutosTexto +
            ":" +
            segundosTexto
        );

    }


    /* ======================================================
       CONTROLES DE REPRODUCCIÓN MP4
       ====================================================== */

    function actualizarBotonPlay() {

        const {
            video,
            botonPlay
        } = elementos();

        if (!video || !botonPlay) {
            return;
        }

        if (video.ended) {

            botonPlay.textContent = "↺";

            botonPlay.setAttribute(
                "aria-label",
                "Repetir timelapse"
            );

            botonPlay.title =
                "Repetir timelapse";

        } else if (video.paused) {

            botonPlay.textContent = "▶";

            botonPlay.setAttribute(
                "aria-label",
                "Reproducir timelapse"
            );

            botonPlay.title =
                "Reproducir timelapse";

        } else {

            botonPlay.textContent = "❚❚";

            botonPlay.setAttribute(
                "aria-label",
                "Pausar timelapse"
            );

            botonPlay.title =
                "Pausar timelapse";

        }

    }


    async function alternarReproduccion() {

        const {
            raiz,
            video
        } = elementos();

        if (!raiz || !video) {
            return;
        }

        if (
            !video.paused &&
            !video.ended
        ) {

            video.pause();

            return;

        }

        try {

            if (video.ended) {
                video.currentTime = 0;
            }

            raiz.classList.remove(
                "portada-activa"
            );

            await video.play();

        } catch (error) {

            console.error(
                "No se pudo iniciar el MP4.",
                error
            );

            establecerEstado(
                "PULSA PARA REPRODUCIR"
            );

            actualizarBotonPlay();

        }

    }


    /* ======================================================
       BARRA DE PROGRESO MP4
       ====================================================== */

    function actualizarProgreso() {

        const {
            video,
            barra,
            tiempoActual,
            tiempoTotal
        } = elementos();

        if (
            !video ||
            !barra
        ) {
            return;
        }

        const duracion =
            obtenerDuracion();

        if (duracion === null) {

            barra.disabled = true;
            barra.value = "0";

            barra.setAttribute(
                "aria-valuetext",
                "Duración no disponible"
            );

            if (tiempoActual) {
                tiempoActual.textContent = "00:00";
            }

            if (tiempoTotal) {
                tiempoTotal.textContent = "--:--";
            }

            return;
        }

        barra.disabled = false;

        if (tiempoTotal) {

            tiempoTotal.textContent =
                formatearTiempo(
                    duracion
                );

        }

        /*
         * No sobrescribir la posición que el
         * visitante está seleccionando.
         */
        if (previsualizandoProgreso) {
            return;
        }

        const posicion = Math.max(
            0,
            Math.min(
                duracion,
                Number.isFinite(video.currentTime)
                    ? video.currentTime
                    : 0
            )
        );

        const fraccion =
            posicion / duracion;

        barra.value = String(
            Math.round(
                fraccion * UNIDADES_PROGRESO
            )
        );

        const tiempoTexto =
            formatearTiempo(
                posicion
            );

        if (tiempoActual) {
            tiempoActual.textContent = tiempoTexto;
        }

        barra.setAttribute(
            "aria-valuetext",
            `${tiempoTexto} de ${formatearTiempo(duracion)}`
        );

    }


    function previsualizarProgreso() {

        const {
            barra,
            tiempoActual
        } = elementos();

        const duracion =
            obtenerDuracion();

        if (
            !barra ||
            barra.disabled ||
            duracion === null
        ) {
            return;
        }

        previsualizandoProgreso = true;

        const fraccion = Math.max(
            0,
            Math.min(
                1,
                Number(barra.value) /
                    UNIDADES_PROGRESO
            )
        );

        const posicion =
            fraccion * duracion;

        const tiempoTexto =
            formatearTiempo(
                posicion
            );

        if (tiempoActual) {

            tiempoActual.textContent =
                tiempoTexto;

        }

        barra.setAttribute(
            "aria-valuetext",
            `${tiempoTexto} de ${formatearTiempo(duracion)}`
        );

    }


    function confirmarProgreso() {

        const {
            video,
            barra
        } = elementos();

        const duracion =
            obtenerDuracion();

        if (
            !video ||
            !barra ||
            barra.disabled ||
            duracion === null
        ) {

            previsualizandoProgreso = false;
            actualizarProgreso();

            return;
        }

        const fraccion = Math.max(
            0,
            Math.min(
                1,
                Number(barra.value) /
                    UNIDADES_PROGRESO
            )
        );

        const posicion =
            fraccion * duracion;

        /*
         * La posición cambia cuando el visitante
         * confirma el movimiento de la barra.
         *
         * No lanzamos cientos de búsquedas
         * mientras arrastra el control.
         */
        try {

            video.currentTime = posicion;

        } catch (error) {

            console.error(
                "No se pudo cambiar la posición del MP4.",
                error
            );

        } finally {

            previsualizandoProgreso = false;

            actualizarProgreso();

        }

    }


    function configurarProgreso() {

        const {
            progreso,
            barra
        } = elementos();

        if (
            !progreso ||
            !barra
        ) {
            return;
        }

        /*
         * El control solo existe funcionalmente
         * para vídeos MP4.
         */
        progreso.hidden = false;

        barra.min = "0";
        barra.max = String(
            UNIDADES_PROGRESO
        );
        barra.step = "1";
        barra.value = "0";
        barra.disabled = true;

        barra.addEventListener(
            "input",
            previsualizarProgreso
        );

        barra.addEventListener(
            "change",
            confirmarProgreso
        );

        /*
         * Evitar que una pulsación sobre la barra
         * active también el play/pausa del visor.
         */
        progreso.addEventListener(
            "click",
            (evento) => {
                evento.stopPropagation();
            }
        );

        progreso.addEventListener(
            "dblclick",
            (evento) => {
                evento.stopPropagation();
            }
        );

        actualizarProgreso();

    }


    /* ======================================================
       PANTALLA COMPLETA
       ====================================================== */

    function estaEnFullscreen() {

        const { raiz } = elementos();

        return (
            document.fullscreenElement === raiz ||
            document.webkitFullscreenElement === raiz
        );

    }


    function limitar(valor, minimo, maximo) {

        return Math.max(
            minimo,
            Math.min(
                maximo,
                valor
            )
        );

    }


    async function alternarFullscreen() {

        const { raiz } = elementos();

        if (!raiz) {
            return;
        }

        try {

            if (estaEnFullscreen()) {

                if (document.exitFullscreen) {

                    await document.exitFullscreen();

                } else if (
                    document.webkitExitFullscreen
                ) {

                    document.webkitExitFullscreen();

                }

            } else if (
                raiz.requestFullscreen
            ) {

                await raiz.requestFullscreen();

            } else if (
                raiz.webkitRequestFullscreen
                ) {

                raiz.webkitRequestFullscreen();

            } else {

                throw new Error(
                    "Pantalla completa no disponible."
                );

            }

        } catch (error) {

            console.error(
                "No se pudo cambiar la pantalla completa.",
                error
            );

        }

    }


    /* ======================================================
       ZOOM MP4
       ====================================================== */

    function aplicarZoom() {

        const {
            raiz,
            video
        } = elementos();

        if (
            !raiz ||
            !video
        ) {
            return;
        }

        if (!estaEnFullscreen()) {

            zoom = 1;
            desplazamientoX = 0;
            desplazamientoY = 0;

        }

        const limiteX =
            raiz.clientWidth * (zoom - 1) / 2;

        const limiteY =
            raiz.clientHeight * (zoom - 1) / 2;

        desplazamientoX = limitar(
            desplazamientoX,
            -limiteX,
            limiteX
        );

        desplazamientoY = limitar(
            desplazamientoY,
            -limiteY,
            limiteY
        );

        video.style.transform =
            `translate(${desplazamientoX}px, ` +
            `${desplazamientoY}px) scale(${zoom})`;

        video.style.transformOrigin =
            "center center";

    }


    function reiniciarZoom() {

        zoom = 1;
        desplazamientoX = 0;
        desplazamientoY = 0;

        distanciaInicial = null;
        ultimoToque = null;

        aplicarZoom();

    }


    function distancia(t1, t2) {

        return Math.hypot(
            t2.clientX - t1.clientX,
            t2.clientY - t1.clientY
        );

    }


    function configurarZoomTactil() {

        const {
            raiz,
            video
        } = elementos();

        if (!raiz || !video) {
            return;
        }

        function actualizarModo() {

            reiniciarZoom();

            const tactil =
                estaEnFullscreen();

            raiz.style.touchAction =
                tactil ? "none" : "";

            video.style.touchAction =
                tactil ? "none" : "";

        }

        /*
         * No interpretar las interacciones con
         * los controles como gestos de zoom.
         */
        function esControl(interaccion) {

            return Boolean(
                interaccion.target.closest(
                    ".visor-video-control, .visor-video-progreso"
                )
            );

        }

        raiz.addEventListener(
            "touchstart",
            (evento) => {

                if (
                    !estaEnFullscreen() ||
                    esControl(evento)
                ) {
                    return;
                }

                gestoRealizado = false;

                if (
                    evento.touches.length >= 2
                ) {

                    distanciaInicial = distancia(
                        evento.touches[0],
                        evento.touches[1]
                    );

                    zoomInicial = zoom;
                    ultimoToque = null;

                    evento.preventDefault();

                } else if (
                    evento.touches.length === 1 &&
                    zoom > 1
                ) {

                    ultimoToque = {
                        x: evento.touches[0].clientX,
                        y: evento.touches[0].clientY
                    };

                }

            },
            { passive: false }
        );

        raiz.addEventListener(
            "touchmove",
            (evento) => {

                if (
                    !estaEnFullscreen() ||
                    esControl(evento)
                ) {
                    return;
                }

                if (
                    evento.touches.length >= 2 &&
                    distanciaInicial !== null &&
                    distanciaInicial > 0
                ) {

                    zoom = limitar(
                        zoomInicial *
                        distancia(
                            evento.touches[0],
                            evento.touches[1]
                        ) / distanciaInicial,
                        ZOOM_MIN,
                        ZOOM_MAX
                    );

                    gestoRealizado = true;

                    aplicarZoom();

                    evento.preventDefault();

                } else if (
                    evento.touches.length === 1 &&
                    ultimoToque &&
                    zoom > 1
                ) {

                    const toque =
                        evento.touches[0];

                    desplazamientoX +=
                        toque.clientX - ultimoToque.x;

                    desplazamientoY +=
                        toque.clientY - ultimoToque.y;

                    ultimoToque = {
                        x: toque.clientX,
                        y: toque.clientY
                    };

                    gestoRealizado = true;

                    aplicarZoom();

                    evento.preventDefault();

                }

            },
            { passive: false }
        );

        function terminarGesto(evento) {

            if (gestoRealizado) {

                suprimirClickHasta =
                    Date.now() + 500;

            }

            if (
                evento.touches.length < 2
            ) {

                distanciaInicial = null;

            }

            ultimoToque = null;

        }

        raiz.addEventListener(
            "touchend",
            terminarGesto
        );

        raiz.addEventListener(
            "touchcancel",
            terminarGesto
        );

        document.addEventListener(
            "fullscreenchange",
            actualizarModo
        );

        document.addEventListener(
            "webkitfullscreenchange",
            actualizarModo
        );

        window.addEventListener(
            "resize",
            aplicarZoom
        );

        actualizarModo();

    }


    /* ======================================================
       INICIALIZACIÓN MP4
       ====================================================== */

    function inicializar() {

        const {
            raiz,
            video,
            meteo,
            marca,
            controles,
            botonPlay,
            botonFullscreen
        } = elementos();

        if (
            !raiz ||
            !video
        ) {
            return;
        }

        try {

            const fuente =
                resolverFuenteMP4();

            const nombre =
                parametros.get("nombre") ||
                "Timelapse MeteoArchidona";

            raiz.setAttribute(
                "aria-label",
                nombre
            );

            video.setAttribute(
                "aria-label",
                nombre
            );

            raiz.classList.add(
                "modo-mp4",
                "interactivo",
                "click-alterna",
                "portada-activa"
            );

            raiz.classList.remove(
                "no-interactivo",
                "no-disponible"
            );

            /*
             * Los valores meteorológicos en
             * directo no corresponden al MP4.
             */
            if (meteo) {

                meteo.style.display =
                    "none";

            }

            /*
             * Parámetro opcional para MP4 que
             * ya llevan marca incrustada.
             *
             * Si no se indica, conservamos
             * la marca del visor para los
             * vídeos históricos anteriores.
             */
            if (
                marca &&
                parametros.get("marca") ===
                    "integrada"
            ) {

                marca.style.display =
                    "none";

            }

            /*
             * Controles propios del visor.
             */
            if (controles) {

                controles.hidden = false;

            }

            if (botonPlay) {

                botonPlay.hidden = false;
                botonPlay.style.display = "";

                botonPlay.addEventListener(
                    "click",
                    (evento) => {

                        evento.stopPropagation();

                        alternarReproduccion();

                    }
                );

            }

            if (botonFullscreen) {

                botonFullscreen.hidden = false;

                botonFullscreen.style.display = "";

                botonFullscreen.addEventListener(
                    "click",
                    (evento) => {

                        evento.stopPropagation();

                        alternarFullscreen();

                    }
                );

            }

            /*
             * El reproductor HTML5 mantiene
             * el control de la reproducción.
             *
             * La interfaz de progreso es
             * propiedad del visor.
             */
            video.controls = false;

            video.autoplay = false;

            video.removeAttribute(
                "autoplay"
            );

            video.playsInline = true;

            video.preload =
                "metadata";

            video.muted = false;

            video.disablePictureInPicture =
                true;

            video.setAttribute(
                "controlslist",
                "nodownload noplaybackrate noremoteplayback"
            );

            /*
             * Preparar la barra antes de
             * cargar la fuente.
             */
            configurarProgreso();

            video.addEventListener(
                "loadedmetadata",
                actualizarProgreso
            );

            video.addEventListener(
                "durationchange",
                actualizarProgreso
            );

            video.addEventListener(
                "timeupdate",
                actualizarProgreso
            );

            video.addEventListener(
                "seeked",
                actualizarProgreso
            );

            video.addEventListener(
                "play",
                actualizarBotonPlay
            );

            video.addEventListener(
                "playing",
                () => {

                    establecerEstado(
                        "TIMELAPSE"
                    );

                    actualizarBotonPlay();

                }
            );

            video.addEventListener(
                "pause",
                () => {

                    actualizarBotonPlay();

                    if (!video.ended) {

                        establecerEstado(
                            "PAUSADO"
                        );

                    }

                }
            );

            video.addEventListener(
                "waiting",
                () => {

                    establecerEstado(
                        "CARGANDO"
                    );

                }
            );

            video.addEventListener(
                "ended",
                () => {

                    establecerEstado(
                        "FINALIZADO · PULSA PARA REPETIR"
                    );

                    actualizarBotonPlay();
                    actualizarProgreso();

                }
            );

            video.addEventListener(
                "error",
                () => {

                    mostrarError(
                        "No se ha podido cargar el archivo MP4."
                    );

                }
            );

            /*
             * Pulsar sobre el vídeo permite
             * reproducirlo o pausarlo.
             *
             * No interferimos con los botones
             * ni con la barra temporal.
             */
            raiz.addEventListener(
                "click",
                (evento) => {

                    if (
                        evento.target.closest(
                            ".visor-video-control, .visor-video-progreso"
                        )
                    ) {
                        return;
                    }

                    if (
                        Date.now() <
                        suprimirClickHasta
                    ) {

                        evento.preventDefault();

                        return;
                    }

                    alternarReproduccion();

                }
            );

            configurarZoomTactil();

            video.src =
                fuente;

            establecerEstado(
                "PULSA PARA REPRODUCIR"
            );

            actualizarBotonPlay();
            actualizarProgreso();

            window.addEventListener(
                "pagehide",
                () => {

                    video.pause();

                }
            );

        } catch (error) {

            console.error(
                "No se pudo inicializar el visor MP4.",
                error
            );

            mostrarError(
                error.message ||
                "No se pudo iniciar la reproducción."
            );

        }

    }


    /* ======================================================
       ARRANQUE
       ====================================================== */

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            inicializar,
            { once: true }
        );

    } else {

        inicializar();

    }

})();


// Fin de fichero: js/visor-video-multimedia.js
