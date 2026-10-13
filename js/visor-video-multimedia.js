
"use strict";

/*
 * MeteoArchidona
 * Entrada multimedia del visor de vídeo.
 *
 * Modalidades iniciales:
 *
 * - Directo HLS:
 *     conserva el controlador visor-video.js.
 *
 * - MP4:
 *     reproduce un archivo propio mediante HTML5.
 *
 * Ambos modos comparten visores/video.html y visor-video.css.
 *
 * Ejemplo MP4:
 *
 * video.html?tipo=mp4
 *     &archivo=/timelapse-los-llanos-prueba.mp4
 *
 * Los JPEG y las fuentes externas se incorporarán después.
 *
 * No se permiten URLs MP4 arbitrarias ni dominios externos.
 * Los MP4 definitivos se servirán mediante rutas públicas
 * controladas por MeteoArchidona.
 */

(() => {

    const parametros = new URLSearchParams(
        window.location.search
    );

    const tipo = parametros.get("tipo");

    /*
     * Mantener intacto el controlador del vídeo en directo.
     */
    if (tipo !== "mp4") {

        const script = document.createElement("script");

        script.src =
            "../js/visor-video.js?v=20261009-video9";

        document.head.appendChild(script);

        return;
    }

    const ZOOM_MIN = 1;
    const ZOOM_MAX = 4;

    let zoom = 1;
    let desplazamientoX = 0;
    let desplazamientoY = 0;

    let distanciaInicial = null;
    let zoomInicial = 1;
    let ultimoToque = null;
    let gestoRealizado = false;
    let suprimirClickHasta = 0;

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
            )
        };
    }

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

    function resolverFuenteMP4() {
        const archivo = parametros.get("archivo");

        if (!archivo || !archivo.startsWith("/")) {
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
         * Ruta provisional del primer timelapse.
         *
         * /multimedia/timelapses/ quedará reservada
         * para futuras publicaciones controladas.
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
            Math.min(maximo, valor)
        );
    }

    function aplicarZoom() {
        const { raiz, video } = elementos();

        if (!raiz || !video) {
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

        video.style.transformOrigin = "center center";
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
        const { raiz, video } = elementos();

        if (!raiz || !video) {
            return;
        }

        function actualizarModo() {
            reiniciarZoom();

            const tactil = estaEnFullscreen();

            raiz.style.touchAction =
                tactil ? "none" : "";

            video.style.touchAction =
                tactil ? "none" : "";
        }

        raiz.addEventListener(
            "touchstart",
            (evento) => {
                if (
                    !estaEnFullscreen() ||
                    evento.target.closest(
                        ".visor-video-control"
                    )
                ) {
                    return;
                }

                gestoRealizado = false;

                if (evento.touches.length >= 2) {
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
                if (!estaEnFullscreen()) {
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
                    const toque = evento.touches[0];

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
                suprimirClickHasta = Date.now() + 500;
            }

            if (evento.touches.length < 2) {
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

            } else if (raiz.requestFullscreen) {
                await raiz.requestFullscreen();

            } else if (raiz.webkitRequestFullscreen) {
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

    async function alternarReproduccion() {
        const { raiz, video } = elementos();

        if (!raiz || !video) {
            return;
        }

        if (!video.paused && !video.ended) {
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
        }
    }

    function inicializar() {
        const {
            raiz,
            video,
            meteo,
            controles,
            botonPlay,
            botonFullscreen
        } = elementos();

        if (!raiz || !video) {
            return;
        }

        try {
            const fuente = resolverFuenteMP4();

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
                "interactivo",
                "click-alterna",
                "portada-activa"
            );

            raiz.classList.remove(
                "no-interactivo",
                "no-disponible"
            );

            /*
             * Los datos meteorológicos en directo
             * no corresponden necesariamente al
             * momento histórico del MP4.
             */
            if (meteo) {
                meteo.style.display = "none";
            }

            /*
             * Mismos controles corporativos:
             * pulsación para play/pausa y
             * botón de pantalla completa.
             */
            if (controles) {
                controles.hidden = false;
            }

            if (botonPlay) {
                botonPlay.hidden = true;
                botonPlay.style.display = "none";
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

            video.controls = false;
            video.autoplay = false;
            video.removeAttribute("autoplay");
            video.playsInline = true;
            video.preload = "metadata";
            video.muted = false;
            video.disablePictureInPicture = true;

            video.setAttribute(
                "controlslist",
                "nodownload noplaybackrate noremoteplayback"
            );

            video.src = fuente;

            establecerEstado(
                "PULSA PARA REPRODUCIR"
            );

            video.addEventListener(
                "playing",
                () => {
                    establecerEstado("TIMELAPSE");
                }
            );

            video.addEventListener(
                "pause",
                () => {
                    if (!video.ended) {
                        establecerEstado("PAUSADO");
                    }
                }
            );

            video.addEventListener(
                "waiting",
                () => {
                    establecerEstado("CARGANDO");
                }
            );

            video.addEventListener(
                "ended",
                () => {
                    establecerEstado(
                        "FINALIZADO · PULSA PARA REPETIR"
                    );
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

            raiz.addEventListener(
                "click",
                (evento) => {
                    if (
                        evento.target.closest(
                            ".visor-video-control"
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

    if (document.readyState === "loading") {
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
