
/*
 * MeteoArchidona
 * Selector dinámico de emisiones YouTube para En vivo.
 *
 * Archivo:
 *     js/en-vivo-youtube.js
 *
 * Responsabilidades:
 *
 * - Consultar las cámaras publicadas en PostgreSQL
 *   mediante el endpoint público de la API.
 * - Construir dinámicamente el selector.
 * - Cambiar la emisión seleccionada.
 * - Actualizar nombre, ubicación y descripción.
 * - Actualizar el enlace al vídeo original.
 * - Gestionar errores y catálogos vacíos.
 *
 * Endpoint público a través de Nginx:
 *
 *     GET /api/camaras/youtube
 *
 * Endpoint interno de FastAPI:
 *
 *     GET /camaras/youtube
 *
 * Utiliza el visor:
 *
 *     visores/youtube.html
 *
 * No contiene un catálogo fijo de cámaras.
 * No modifica el visor HLS/MP4.
 */

(() => {
    "use strict";

    // =====================================================
    // CONFIGURACIÓN
    // =====================================================

    const RUTA_API = "/api/camaras/youtube";

    const RUTA_VISOR = "/visores/youtube.html";

    const VERSION_VISOR = "20261015-youtube1";

    const PATRON_YOUTUBE = /^[A-Za-z0-9_-]{11}$/;

    const camaras = new Map();


    // =====================================================
    // ELEMENTOS HTML
    // =====================================================

    const selector = document.getElementById(
        "selector-directo-youtube"
    );

    const visor = document.getElementById(
        "visor-directo-youtube"
    );

    const titulo = document.getElementById(
        "titulo-camara-youtube"
    );

    const ubicacion = document.getElementById(
        "ubicacion-camara-youtube"
    );

    const descripcion = document.getElementById(
        "descripcion-camara-youtube"
    );

    const enlace = document.getElementById(
        "enlace-camara-youtube"
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


    // =====================================================
    // ESTADO DEL SELECTOR
    // =====================================================

    function mostrarEstado(mensaje, esError = false) {

        selector.replaceChildren();

        const opcion = document.createElement("option");

        opcion.value = "";
        opcion.textContent = mensaje;

        selector.appendChild(opcion);

        selector.disabled = true;

        visor.removeAttribute("src");
        visor.title = "Visor YouTube sin emisión";

        titulo.textContent = esError
            ? "Emisiones no disponibles"
            : mensaje;

        ubicacion.textContent = "";
        descripcion.textContent = esError
            ? "No se ha podido cargar el catálogo de cámaras."
            : "";

        enlace.removeAttribute("href");
        enlace.hidden = true;
    }


    // =====================================================
    // NORMALIZACIÓN
    // =====================================================

    function normalizarTexto(valor) {

        if (typeof valor !== "string") {
            return "";
        }

        return valor.trim();
    }


    // =====================================================
    // VALIDACIÓN DE CÁMARAS
    // =====================================================

    function normalizarCamara(registro) {

        if (!registro || typeof registro !== "object") {
            return null;
        }

        const codigo = normalizarTexto(
            registro.codigo
        );

        const youtubeId = normalizarTexto(
            registro.youtube_id
        );

        if (
            !codigo ||
            !PATRON_YOUTUBE.test(youtubeId)
        ) {
            return null;
        }

        const nombre = normalizarTexto(
            registro.nombre
        ) || `Cámara ${codigo}`;

        return {
            codigo,
            nombre,
            ubicacion: normalizarTexto(
                registro.ubicacion
            ),
            descripcion: normalizarTexto(
                registro.descripcion
            ),
            youtubeId,
            url: (
                "https://www.youtube.com/live/" +
                youtubeId
            )
        };
    }


    // =====================================================
    // CAMBIAR CÁMARA
    // =====================================================

    function mostrarCamara() {

        const codigo = selector.value;

        const camara = camaras.get(codigo);

        if (!camara) {
            return;
        }

        const urlVisor = new URL(
            RUTA_VISOR,
            window.location.origin
        );

        urlVisor.searchParams.set(
            "v",
            VERSION_VISOR
        );

        urlVisor.searchParams.set(
            "url",
            camara.url
        );

        if (visor.src !== urlVisor.href) {
            visor.src = urlVisor.href;
        }

        visor.title = camara.nombre + " · YouTube";

        titulo.textContent = camara.nombre;

        ubicacion.textContent = camara.ubicacion;

        descripcion.textContent = camara.descripcion;

        enlace.href = camara.url;
        enlace.hidden = false;
    }


    // =====================================================
    // CONSTRUIR SELECTOR DINÁMICO
    // =====================================================

    function construirSelector(registros) {

        camaras.clear();

        selector.replaceChildren();

        for (const registro of registros) {

            const camara = normalizarCamara(
                registro
            );

            if (
                !camara ||
                camaras.has(camara.codigo)
            ) {
                continue;
            }

            camaras.set(
                camara.codigo,
                camara
            );

            const opcion = document.createElement(
                "option"
            );

            opcion.value = camara.codigo;
            opcion.textContent = camara.nombre;

            selector.appendChild(opcion);
        }

        if (camaras.size === 0) {

            mostrarEstado(
                "No hay emisiones disponibles"
            );

            return;
        }

        selector.disabled = false;

        selector.selectedIndex = 0;

        mostrarCamara();
    }


    // =====================================================
    // CONSULTAR API
    // =====================================================

    async function cargarCamaras() {

        mostrarEstado(
            "Cargando cámaras..."
        );

        try {

            const respuesta = await fetch(
                RUTA_API,
                {
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    },
                    cache: "no-store",
                    credentials: "same-origin"
                }
            );

            if (!respuesta.ok) {

                throw new Error(
                    "Error HTTP " + respuesta.status
                );
            }

            const datos = await respuesta.json();

            if (!Array.isArray(datos)) {

                throw new Error(
                    "Respuesta de catálogo inválida"
                );
            }

            construirSelector(datos);

        } catch (error) {

            console.error(
                "MeteoArchidona: error cargando " +
                "el catálogo YouTube.",
                error
            );

            mostrarEstado(
                "No se pudieron cargar las cámaras",
                true
            );
        }
    }


    // =====================================================
    // EVENTOS
    // =====================================================

    selector.addEventListener(
        "change",
        mostrarCamara
    );


    // =====================================================
    // INICIALIZACIÓN
    // =====================================================

    void cargarCamaras();

})();

/* Fin de fichero: js/en-vivo-youtube.js */
