
/*
 * MeteoArchidona
 * Visor YouTube reutilizable.
 *
 * Parámetro de entrada:
 *   youtube.html?url=<URL_YOUTUBE_CODIFICADA>
 *
 * Admite:
 * - youtube.com/watch?v=...
 * - youtube.com/live/...
 * - youtu.be/...
 * - youtube.com/embed/...
 * - youtube.com/shorts/...
 * - identificador directo del vídeo.
 *
 * Carga el reproductor oficial de YouTube
 * únicamente cuando el usuario pulsa Reproducir.
 *
 * No modifica ni interfiere con el visor HLS/MP4.
 */

(() => {
    'use strict';

    const pantalla = document.getElementById(
        'visor-youtube-pantalla'
    );

    const portada = document.getElementById(
        'visor-youtube-portada'
    );

    const boton = document.getElementById(
        'visor-youtube-reproducir'
    );

    const titulo = document.getElementById(
        'visor-youtube-titulo'
    );

    const mensaje = document.getElementById(
        'visor-youtube-mensaje'
    );

    const enlace = document.getElementById(
        'visor-youtube-enlace'
    );

    if (
        !pantalla ||
        !portada ||
        !boton ||
        !titulo ||
        !mensaje ||
        !enlace
    ) {
        return;
    }


    /* =====================================================
       PANTALLA COMPLETA EN HORIZONTAL
       =====================================================
     *
     * La web instalada como aplicación fija la orientación
     * vertical (manifest.webmanifest: portrait-primary), así
     * que en Android la pantalla completa de YouTube se quedaba
     * en vertical y no llenaba la pantalla. Igual que los
     * visores de vídeo (PR #63): al entrar se pide horizontal y
     * al salir se libera.
     *
     * El botón es del reproductor de YouTube (otro dominio), así
     * que no se puede escuchar; lo que sí llega a este documento
     * es el cambio de pantalla completa. Se intenta primero desde
     * aquí y, si el navegador no deja girar desde un iframe,
     * desde la página que contiene el visor (mismo dominio).
     *
     * Ordenador, iPhone o navegador sin bloqueo de orientación:
     * el intento falla en silencio y la pantalla completa sigue
     * funcionando como siempre.
     */

    function pantallasDeOrientacion() {

        const lista = [window.screen];

        try {
            if (
                window.top &&
                window.top !== window &&
                window.top.screen
            ) {
                lista.push(window.top.screen);
            }
        } catch (error) {
            // Página contenedora de otro dominio: solo la propia.
        }

        return lista;
    }


    async function bloquearHorizontal() {

        for (const pantallaDispositivo of pantallasDeOrientacion()) {

            try {

                const orientacion =
                    pantallaDispositivo.orientation;

                if (
                    orientacion &&
                    typeof orientacion.lock === 'function'
                ) {
                    await orientacion.lock('landscape');
                    return;
                }

            } catch (error) {
                console.debug(
                    'No se pudo girar a horizontal.',
                    error
                );
            }
        }
    }


    function liberarOrientacion() {

        for (const pantallaDispositivo of pantallasDeOrientacion()) {

            try {

                const orientacion =
                    pantallaDispositivo.orientation;

                if (
                    orientacion &&
                    typeof orientacion.unlock === 'function'
                ) {
                    orientacion.unlock();
                }

            } catch (error) {
                console.debug(
                    'No se pudo liberar la orientación.',
                    error
                );
            }
        }
    }


    function documentoEnPantallaCompleta() {

        return Boolean(
            document.fullscreenElement ||
            document.webkitFullscreenElement
        );
    }


    function cambioPantallaCompleta() {

        if (documentoEnPantallaCompleta()) {
            bloquearHorizontal();
        } else {
            liberarOrientacion();
        }
    }

    document.addEventListener(
        'fullscreenchange',
        cambioPantallaCompleta
    );

    document.addEventListener(
        'webkitfullscreenchange',
        cambioPantallaCompleta
    );


    /* =====================================================
       VALIDACIÓN DEL IDENTIFICADOR
       ===================================================== */

    function idValido(id) {
        return /^[a-zA-Z0-9_-]{11}$/.test(id || '');
    }


    /* =====================================================
       OBTENER IDENTIFICADOR DESDE UNA URL
       ===================================================== */

    function obtenerIdYoutube(entrada) {

        if (!entrada) {
            return null;
        }

        const valor = entrada.trim();

        // Permite recibir directamente el identificador.
        if (idValido(valor)) {
            return valor;
        }

        let url;

        try {
            url = new URL(valor);
        } catch (_) {
            return null;
        }

        // Solo se admiten enlaces HTTPS.
        if (url.protocol !== 'https:') {
            return null;
        }

        const host = url.hostname.toLowerCase();

        const partes = url.pathname
            .split('/')
            .filter(Boolean);

        let id = null;


        /* Enlaces cortos de YouTube */

        if (
            host === 'youtu.be' ||
            host === 'www.youtu.be'
        ) {

            id = partes.length === 1
                ? partes[0]
                : null;

        }


        /* Enlaces de YouTube */

        else if (
            host === 'youtube.com' ||
            host === 'www.youtube.com' ||
            host === 'm.youtube.com' ||
            host === 'youtube-nocookie.com' ||
            host === 'www.youtube-nocookie.com'
        ) {

            if (
                partes.length === 1 &&
                partes[0] === 'watch'
            ) {

                id = url.searchParams.get('v');

            }

            else if (
                partes.length === 2 &&
                [
                    'live',
                    'embed',
                    'shorts',
                    'v'
                ].includes(partes[0])
            ) {

                id = partes[1];

            }

        }

        return idValido(id) ? id : null;
    }


    /* =====================================================
       LEER PARÁMETROS DEL VISOR
       ===================================================== */

    const parametros = new URLSearchParams(
        window.location.search
    );

    const id = obtenerIdYoutube(
        parametros.get('url')
    );


    /* =====================================================
       CONTROL DE URL INCORRECTA
       ===================================================== */

    if (!id) {

        titulo.textContent = 'Vídeo no disponible';

        mensaje.textContent =
            'No se ha indicado una URL válida de YouTube.';

        boton.hidden = true;

        return;
    }


    /* =====================================================
       ENLACE AL VÍDEO ORIGINAL
       ===================================================== */

    const urlOriginal =
        `https://www.youtube.com/watch?v=${id}`;

    enlace.href = urlOriginal;

    enlace.hidden = false;


    /* =====================================================
       REPRODUCCIÓN
       ===================================================== */

    boton.addEventListener('click', (evento) => {

        // Auditoría (docs/auditoria.md de la API, 11.7): sin la API de
        // YouTube, lo único que se registra es esta pulsación. La
        // auditoría vive en la página que contiene el visor.
        try {
            if (evento.isTrusted) {
                window.parent?.MeteoAuditoria?.registrar(
                    'VISOR_YOUTUBE',
                    'ACTIVACION_VISOR',
                    { video: id }
                );
            }
        } catch (error) {
            // La auditoría nunca debe impedir la reproducción.
        }

        const reproductor = document.createElement(
            'iframe'
        );

        reproductor.title =
            'Reproductor oficial de YouTube';

        reproductor.src =
            `https://www.youtube-nocookie.com/embed/${id}` +
            '?autoplay=1&playsinline=1';

        reproductor.allow =
            'accelerometer; autoplay; encrypted-media; ' +
            'gyroscope; picture-in-picture; fullscreen';

        reproductor.allowFullscreen = true;

        reproductor.referrerPolicy =
            'strict-origin-when-cross-origin';


        // Incorporar primero el reproductor.
        pantalla.appendChild(reproductor);

        // Retirar después la portada corporativa.
        portada.remove();

    }, { once: true });

})();

/* Fin de fichero: visores/youtube.js */
