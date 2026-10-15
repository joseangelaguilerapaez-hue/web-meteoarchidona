
/*
 * MeteoArchidona
 * Selector de emisiones YouTube para En vivo.
 *
 * Archivo:
 *     js/en-vivo-youtube.js
 *
 * Responsabilidades:
 *
 * - Mantener el catálogo de cámaras YouTube.
 * - Cambiar la emisión seleccionada.
 * - Actualizar nombre, ubicación y descripción.
 * - Actualizar el enlace a la emisión original.
 *
 * Utiliza el componente:
 *
 *     visores/youtube.html
 *
 * No modifica el visor HLS/MP4.
 */

(() => {
    'use strict';


    /* =====================================================
       CATÁLOGO DE DIRECTOS YOUTUBE
       ===================================================== */

    const CAMARAS = {

        murcia: {

            nombre:
                'Cámara meteorológica de Murcia',

            ubicacion:
                'Murcia · España',

            descripcion:
                'Emisión meteorológica en directo desde Murcia. ' +
                'La imagen conserva los datos meteorológicos, ' +
                'gráficos y rótulos originales de su autor.',

            url:
                'https://www.youtube.com/live/CGNR241h08Q'

        },


        nerja: {

            nombre:
                'Cámara en directo de Nerja',

            ubicacion:
                'Nerja · Málaga',

            descripcion:
                'Emisión en directo desde Nerja, Málaga. ' +
                'El vídeo se reproduce desde YouTube, ' +
                'conservando íntegramente la imagen ' +
                'y los elementos originales de su autor.',

            url:
                'https://www.youtube.com/live/liW4_fLCE5A'

        }

    };


    /* =====================================================
       ELEMENTOS DEL HTML
       ===================================================== */

    const selector = document.getElementById(
        'selector-directo-youtube'
    );

    const visor = document.getElementById(
        'visor-directo-youtube'
    );

    const titulo = document.getElementById(
        'titulo-camara-youtube'
    );

    const ubicacion = document.getElementById(
        'ubicacion-camara-youtube'
    );

    const descripcion = document.getElementById(
        'descripcion-camara-youtube'
    );

    const enlace = document.getElementById(
        'enlace-camara-youtube'
    );


    if (
        !selector ||
        !visor ||
        !titulo ||
        !ubicacion ||
        !descripcion ||
        !enlace
    ) {
        return;
    }


    /* =====================================================
       CAMBIAR CÁMARA
       ===================================================== */

    function mostrarCamara() {

        const codigo = selector.value;

        if (
            !Object.prototype.hasOwnProperty.call(
                CAMARAS,
                codigo
            )
        ) {
            return;
        }

        const camara = CAMARAS[codigo];


        /* Construcción de la URL del visor */

        const urlVisor = new URL(
            '/visores/youtube.html',
            window.location.origin
        );

        urlVisor.searchParams.set(
            'v',
            '20261015-youtube1'
        );

        urlVisor.searchParams.set(
            'url',
            camara.url
        );


        /* Cambiar la emisión solo si es necesario */

        if (visor.src !== urlVisor.href) {
            visor.src = urlVisor.href;
        }


        /* Actualizar los datos de la cámara */

        visor.title =
            camara.nombre + ' · YouTube';

        titulo.textContent =
            camara.nombre;

        ubicacion.textContent =
            camara.ubicacion;

        descripcion.textContent =
            camara.descripcion;

        enlace.href =
            camara.url;

    }


    /* =====================================================
       EVENTOS DEL SELECTOR
       ===================================================== */

    selector.addEventListener(
        'change',
        mostrarCamara
    );


    /* =====================================================
       INICIALIZACIÓN
       ===================================================== */

    mostrarCamara();

})();

/* Fin de fichero: js/en-vivo-youtube.js */
