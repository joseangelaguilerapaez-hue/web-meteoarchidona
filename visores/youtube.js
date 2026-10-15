
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

    boton.addEventListener('click', () => {

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
