
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
 * Carga el reproductor oficial de YouTube nada más
 * abrirse y lo arranca en silencio (autoarranque).
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

    /*
     * Desde el 20 nov 2026 el directo arranca solo, sin pulsar
     * «Reproducir» (decisión de José). Arranca en silencio porque
     * los navegadores no dejan reproducir con sonido sin un toque
     * previo; el visitante activa el sonido con el altavoz del
     * propio reproductor. La portada queda solo para el caso de
     * URL incorrecta (más arriba).
     *
     * Arranque limpio (20 nov 2026, José): al empezar, YouTube
     * enseña unos segundos su capa de controles. Para no verla,
     * el reproductor se carga invisible sobre fondo negro con un
     * «Conectando con el directo…» y aparece con un fundido
     * ESPERA_CONTROLES_MS después de que YouTube avise de que ya
     * reproduce. No se pone nada encima del reproductor: solo se
     * retrasa su aparición. TOPE_MS garantiza que nunca se quede
     * en negro si el aviso no llega.
     *
     * Ajuste del 20 nov 2026 (José, medido en su móvil): con 3 s
     * los controles aún asomaban un segundo. Ahora se espera lo
     * que llegue más tarde: MINIMO_MS desde que se abre el visor
     * (7 s fijos, lo que pidió José) o ESPERA_CONTROLES_MS desde
     * que YouTube avisa de que reproduce (para conexiones lentas).
     *
     * El aviso llega por postMessage (enablejsapi=1), sin cargar
     * el script de la API de YouTube.
     */

    const ORIGEN_YOUTUBE = 'https://www.youtube-nocookie.com';
    const MINIMO_MS = 7000;
    const ESPERA_CONTROLES_MS = 4500;
    const TOPE_MS = 12000;
    const inicio = Date.now();
    const REPRODUCIENDO = 1;

    const reproductor = document.createElement(
        'iframe'
    );

    reproductor.title =
        'Reproductor oficial de YouTube';

    reproductor.className = 'visor-youtube-oculto';

    reproductor.src =
        `${ORIGEN_YOUTUBE}/embed/${id}` +
        '?autoplay=1&mute=1&playsinline=1&enablejsapi=1' +
        `&origin=${encodeURIComponent(window.location.origin)}`;

    reproductor.allow =
        'accelerometer; autoplay; encrypted-media; ' +
        'gyroscope; picture-in-picture; fullscreen';

    reproductor.allowFullscreen = true;

    reproductor.referrerPolicy =
        'strict-origin-when-cross-origin';


    const conectando = document.createElement('div');

    conectando.className = 'visor-youtube-conectando';
    conectando.setAttribute('role', 'status');

    const punto = document.createElement('span');
    punto.className = 'visor-youtube-punto';
    punto.setAttribute('aria-hidden', 'true');

    const textoConectando = document.createElement('span');
    textoConectando.className = 'visor-youtube-conectando-texto';
    textoConectando.textContent = 'Conectando con el directo…';

    conectando.append(punto, textoConectando);


    let mostrado = false;
    let escucha = null;
    let espera = null;


    /*
     * Aviso a la página que contiene el visor (Sala de cámaras,
     * José, 20-11-2026): «reproduciendo» cuando YouTube dice que
     * reproduce y «sin-emision» si da error o si, habiendo
     * contestado, no llega a reproducir antes del tope. Si YouTube
     * no contesta nunca no se sabe nada y no se avisa: así no se
     * da por caído un directo que sí funciona. Solo sale hacia el
     * mismo origen; En vivo no lo escucha y no cambia nada.
     */
    let youtubeContesta = false;
    let reproducido = false;
    let avisado = '';

    function avisarContenedor(estado) {

        if (avisado === estado || window.parent === window) {
            return;
        }

        avisado = estado;

        try {
            window.parent.postMessage(
                {
                    origen: 'meteoarchidona-visor-youtube',
                    estado
                },
                window.location.origin
            );
        } catch (error) {
            // Sin contenedor que escuche: no pasa nada.
        }
    }

    function mostrar() {

        if (mostrado) {
            return;
        }

        mostrado = true;

        clearInterval(escucha);
        clearTimeout(espera);
        clearTimeout(tope);
        window.removeEventListener('message', alRecibir);

        reproductor.classList.remove('visor-youtube-oculto');
        conectando.classList.add('visor-youtube-conectando-fuera');
        pantalla.classList.remove('visor-youtube-negro');

        setTimeout(() => conectando.remove(), 600);
    }

    function alRecibir(evento) {

        if (
            evento.origin !== ORIGEN_YOUTUBE ||
            evento.source !== reproductor.contentWindow
        ) {
            return;
        }

        let datos;

        try {
            datos = typeof evento.data === 'string'
                ? JSON.parse(evento.data)
                : evento.data;
        } catch (error) {
            return;
        }

        if (!datos || typeof datos !== 'object') {
            return;
        }

        // YouTube ya escucha: no hace falta seguir llamándole.
        clearInterval(escucha);

        youtubeContesta = true;

        if (datos.event === 'onError') {
            avisarContenedor('sin-emision');
            return;
        }

        let estado = null;

        if (datos.event === 'onStateChange') {
            estado = datos.info;
        } else if (
            datos.event === 'infoDelivery' &&
            datos.info &&
            typeof datos.info.playerState === 'number'
        ) {
            estado = datos.info.playerState;
        }

        if (estado === REPRODUCIENDO) {
            reproducido = true;
            avisarContenedor('reproduciendo');
        }

        if (estado === REPRODUCIENDO && !espera) {
            const hastaMinimo = MINIMO_MS - (Date.now() - inicio);
            espera = setTimeout(
                mostrar,
                Math.max(ESPERA_CONTROLES_MS, hastaMinimo)
            );
        }
    }

    window.addEventListener('message', alRecibir);

    reproductor.addEventListener('load', () => {

        const avisar = () => {
            try {
                reproductor.contentWindow?.postMessage(
                    JSON.stringify({
                        event: 'listening',
                        id: 1,
                        channel: 'widget'
                    }),
                    ORIGEN_YOUTUBE
                );
            } catch (error) {
                // Sin aviso: lo resuelve el tope.
            }
        };

        avisar();
        escucha = setInterval(avisar, 250);
    });

    const tope = setTimeout(() => {
        if (youtubeContesta && !reproducido) {
            avisarContenedor('sin-emision');
        }
        mostrar();
    }, TOPE_MS);


    pantalla.classList.add('visor-youtube-negro');

    // Incorporar primero el reproductor (invisible) y el aviso.
    pantalla.append(reproductor, conectando);

    // Retirar después la portada corporativa.
    portada.remove();

})();

/* Fin de fichero: visores/youtube.js */
