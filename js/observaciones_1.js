    const API_BASE = "https://api-meteoarchidona.onrender.com";

    const RADAR_CODIGO = "AHR";

    const RADAR_PRODUCTO = "PPI";

    const CENTRO_ARCHIDONA = [37.094692, -4.3774514];

    const ESTACIONES = [
        {
            nombre: "El Silo · Archidona",

            latitud: 37.094692,

            longitud: -4.3774514,
        },
        {
            nombre: "Los Llanos · Villanueva del Trabuco",

            latitud: 37.05918,

            longitud: -4.361634,
        },
    ];

    let mapa = null;

    let capaRadar = null;

    let fotogramas = [];

    let indiceActual = 0;

    let temporizadorAnimacion = null;

    let reproduciendo = false;

    let opacidadRadar = 0.82;

    let observadorTamanoMapa = null;

    /*
============================================================
UTILIDADES
============================================================
*/

    function obtenerElemento(id) {
        return document.getElementById(id);
    }

    function asignarTexto(id, texto) {
        const elemento = obtenerElemento(id);

        if (elemento) {
            elemento.textContent = texto;
        }
    }

    function mostrarMensaje(texto, esError = false) {
        const mensaje = obtenerElemento("mensaje");

        if (!mensaje) {
            return;
        }

        if (!texto) {
            mensaje.textContent = "";

            mensaje.classList.remove("visible", "error");

            return;
        }

        mensaje.textContent = texto;

        mensaje.classList.toggle("error", esError);

        mensaje.classList.add("visible");
    }

    function establecerEstadoApi(texto, estado = null) {
        const elemento = obtenerElemento("estado-api");

        asignarTexto("estado-api-texto", texto);

        if (!elemento) {
            return;
        }

        elemento.classList.remove("correcto", "error");

        if (estado) {
            elemento.classList.add(estado);
        }
    }

    function normalizarUrl(url) {
        if (!url) {
            return null;
        }

        if (url.startsWith("http://") || url.startsWith("https://")) {
            return url;
        }

        if (url.startsWith("/")) {
            return API_BASE + url;
        }

        return `${API_BASE}/${url}`;
    }

    function obtenerFecha(valor) {
        if (!valor) {
            return null;
        }

        const fecha = new Date(valor);

        if (Number.isNaN(fecha.getTime())) {
            return null;
        }

        return fecha;
    }

    function formatearHora(valor) {
        const fecha = obtenerFecha(valor);

        if (!fecha) {
            return "--:--";
        }

        return fecha.toLocaleTimeString("es-ES", {
            hour: "2-digit",

            minute: "2-digit",
        });
    }

    function formatearFecha(valor) {
        const fecha = obtenerFecha(valor);

        if (!fecha) {
            return "--";
        }

        return fecha.toLocaleDateString("es-ES", {
            day: "2-digit",

            month: "2-digit",

            year: "numeric",
        });
    }

    /*
============================================================
CORRECCIÓN DE DIMENSIONADO LEAFLET

Chrome móvil modifica el viewport cuando muestra u oculta sus
barras superior e inferior.

Leaflet puede inicializarse antes de que el navegador haya
establecido el tamaño definitivo del panel.

Por eso usamos:

- requestAnimationFrame;
- varios invalidateSize diferidos;
- resize;
- orientationchange;
- visualViewport;
- ResizeObserver.

============================================================
*/

    function invalidarTamanoMapa() {
        if (!mapa) {
            return;
        }

        mapa.invalidateSize({
            animate: false,

            pan: false,
        });
    }

    function invalidarTamanoMapaDiferido() {
        requestAnimationFrame(() => {
            invalidarTamanoMapa();

            requestAnimationFrame(invalidarTamanoMapa);
        });

        setTimeout(invalidarTamanoMapa, 100);

        setTimeout(invalidarTamanoMapa, 300);

        setTimeout(invalidarTamanoMapa, 700);

        setTimeout(invalidarTamanoMapa, 1200);
    }

    function instalarVigilanciaTamanoMapa() {
        const contenedor = obtenerElemento("mapa-contenedor");

        if (!contenedor) {
            return;
        }

        if ("ResizeObserver" in window) {
            observadorTamanoMapa = new ResizeObserver(() => {
                invalidarTamanoMapaDiferido();
            });

            observadorTamanoMapa.observe(contenedor);
        }

        window.addEventListener("resize", invalidarTamanoMapaDiferido, {
            passive: true,
        });

        window.addEventListener("orientationchange", invalidarTamanoMapaDiferido, {
            passive: true,
        });

        if (window.visualViewport) {
            window.visualViewport.addEventListener("resize", invalidarTamanoMapaDiferido, {
                passive: true,
            });
        }
    }

    /*
============================================================
MAPA
============================================================
*/

    function crearMapa() {
        mapa = L.map("mapa-radar", {
            center: CENTRO_ARCHIDONA,

            zoom: 9,

            minZoom: 5,

            maxZoom: 15,

            zoomControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,

            attribution: "&copy; OpenStreetMap contributors",
        }).addTo(mapa);

        crearCentroArchidona();

        crearEstaciones();

        crearAnillosDistancia();

        L.control
            .scale({
                imperial: false,

                metric: true,

                position: "bottomright",
            })
            .addTo(mapa);

        instalarVigilanciaTamanoMapa();

        invalidarTamanoMapaDiferido();
    }

    /*
============================================================
ARCHIDONA
============================================================
*/

    function crearCentroArchidona() {
        const icono = L.divIcon({
            className: "",

            html: '<div class="marcador-archidona"></div>',

            iconSize: [18, 18],

            iconAnchor: [9, 9],
        });

        L.marker(CENTRO_ARCHIDONA, {
            icon: icono,

            zIndexOffset: 1200,
        })
            .addTo(mapa)
            .bindTooltip("ARCHIDONA", {
                permanent: true,

                direction: "top",

                offset: [0, -12],
            });
    }

    /*
============================================================
ESTACIONES
============================================================
*/

    function crearEstaciones() {
        const icono = L.divIcon({
            className: "",

            html: '<div class="marcador-estacion"></div>',

            iconSize: [12, 12],

            iconAnchor: [6, 6],
        });

        ESTACIONES.forEach((estacion, indice) => {
            /*
            El Silo coincide prácticamente con Archidona.
            No ponemos un segundo marcador encima.
            */

            if (indice === 0) {
                return;
            }

            L.marker([estacion.latitud, estacion.longitud], {
                icon: icono,

                zIndexOffset: 1100,
            })
                .addTo(mapa)
                .bindTooltip(estacion.nombre, {
                    direction: "right",

                    offset: [8, 0],
                });
        });
    }

    /*
============================================================
ANILLOS
============================================================
*/

    function crearAnillosDistancia() {
        const configuracionComun = {
            fill: false,

            color: "#f0a500",

            weight: 1,

            opacity: 0.62,

            dashArray: "5 7",

            interactive: false,
        };

        const circulo10 = L.circle(CENTRO_ARCHIDONA, {
            ...configuracionComun,

            radius: 10000,
        }).addTo(mapa);

        const circulo20 = L.circle(CENTRO_ARCHIDONA, {
            ...configuracionComun,

            radius: 20000,

            opacity: 0.42,
        }).addTo(mapa);

        circulo10.bindTooltip("10 km");

        circulo20.bindTooltip("20 km");
    }

    /*
============================================================
BOUNDS
============================================================
*/

    function obtenerBoundsFotograma(fotograma) {
        if (!fotograma || !fotograma.limites) {
            return null;
        }

        const oeste = Number(fotograma.limites.oeste);

        const sur = Number(fotograma.limites.sur);

        const este = Number(fotograma.limites.este);

        const norte = Number(fotograma.limites.norte);

        if (
            !Number.isFinite(oeste) ||
            !Number.isFinite(sur) ||
            !Number.isFinite(este) ||
            !Number.isFinite(norte)
        ) {
            return null;
        }

        return [
            [sur, oeste],
            [norte, este],
        ];
    }

    /*
============================================================
MOSTRAR FOTOGRAMA
============================================================
*/

    function mostrarFotograma(indice) {
        if (fotogramas.length === 0) {
            return;
        }

        indiceActual = Math.max(0, Math.min(indice, fotogramas.length - 1));

        const fotograma = fotogramas[indiceActual];

        const bounds = obtenerBoundsFotograma(fotograma);

        const url = normalizarUrl(fotograma.url_imagen);

        if (!bounds || !url) {
            mostrarMensaje(
                "El fotograma no contiene información suficiente para ser representado.",
                true,
            );

            return;
        }

        if (capaRadar) {
            mapa.removeLayer(capaRadar);

            capaRadar = null;
        }

        /*
    Evitamos que Chrome conserve una versión anterior
    de la imagen procesada.
    */

        const separador = url.includes("?") ? "&" : "?";

        const urlVisual =
            url + separador + "_=" + encodeURIComponent(fotograma.observado_en);

        capaRadar = L.imageOverlay(urlVisual, bounds, {
            opacity: opacidadRadar,

            interactive: false,

            zIndex: 420,
        });

        capaRadar.addTo(mapa);

        capaRadar.once("load", () => {
            invalidarTamanoMapaDiferido();
        });

        actualizarInformacionFotograma(fotograma);

        actualizarTimeline();

        mostrarMensaje("");

        invalidarTamanoMapaDiferido();
    }

    /*
============================================================
INFORMACIÓN
============================================================
*/

    function actualizarInformacionFotograma(fotograma) {
        asignarTexto("instante-hora", formatearHora(fotograma.observado_en));

        asignarTexto("instante-fecha", formatearFecha(fotograma.observado_en));

        asignarTexto("dato-producto", fotograma.producto || RADAR_PRODUCTO);

        asignarTexto("dato-radar", RADAR_CODIGO);
    }

    function actualizarTimeline() {
        const slider = obtenerElemento("timeline-slider");

        if (slider) {
            slider.max = Math.max(fotogramas.length - 1, 0);

            slider.value = indiceActual;
        }

        asignarTexto("timeline-posicion", `${indiceActual + 1} / ${fotogramas.length}`);

        if (fotogramas.length > 0) {
            asignarTexto("timeline-inicio", formatearHora(fotogramas[0].observado_en));

            asignarTexto(
                "timeline-fin",
                formatearHora(fotogramas[fotogramas.length - 1].observado_en),
            );
        }
    }

    /*
============================================================
CARGA DE TIMELINE
============================================================
*/

    async function cargarTimeline() {
        detenerAnimacion();

        establecerEstadoApi("Cargando radar");

        mostrarMensaje("Solicitando timeline radar a MeteoArchidona...");

        const url =
            `${API_BASE}` +
            `/radar/${RADAR_CODIGO}` +
            `/timeline` +
            `?producto=${RADAR_PRODUCTO}`;

        try {
            const respuesta = await fetch(url, {
                cache: "no-store",
            });

            if (!respuesta.ok) {
                throw new Error(`HTTP ${respuesta.status}`);
            }

            const datos = await respuesta.json();

            if (!Array.isArray(datos.fotogramas)) {
                throw new Error("La respuesta no contiene una timeline válida.");
            }

            fotogramas = datos.fotogramas.slice().sort((primero, segundo) => {
                return new Date(primero.observado_en) - new Date(segundo.observado_en);
            });

            if (fotogramas.length === 0) {
                throw new Error("La timeline no contiene fotogramas.");
            }

            indiceActual = fotogramas.length - 1;

            asignarTexto("dato-fotogramas", fotogramas.length);

            establecerEstadoApi("Radar operativo", "correcto");

            mostrarFotograma(indiceActual);

            invalidarTamanoMapaDiferido();
        } catch (error) {
            console.error("Error cargando timeline radar:", error);

            fotogramas = [];

            establecerEstadoApi("Radar no disponible", "error");

            mostrarMensaje(
                "No se ha podido cargar la timeline radar. " + error.message,
                true,
            );
        }
    }

    /*
============================================================
ANIMACIÓN
============================================================
*/

    function actualizarBotonReproducir() {
        const boton = obtenerElemento("boton-reproducir");

        if (!boton) {
            return;
        }

        boton.textContent = reproduciendo ? "Ⅱ" : "▶";

        boton.setAttribute(
            "aria-label",
            reproduciendo ? "Pausar animación" : "Reproducir animación",
        );

        boton.setAttribute(
            "title",
            reproduciendo ? "Pausar animación" : "Reproducir animación",
        );
    }

    function detenerAnimacion() {
        if (temporizadorAnimacion) {
            clearInterval(temporizadorAnimacion);

            temporizadorAnimacion = null;
        }

        reproduciendo = false;

        actualizarBotonReproducir();
    }

    function iniciarAnimacion() {
        if (fotogramas.length < 2) {
            return;
        }

        detenerAnimacion();

        reproduciendo = true;

        actualizarBotonReproducir();

        temporizadorAnimacion = setInterval(() => {
            let siguiente = indiceActual + 1;

            if (siguiente >= fotogramas.length) {
                siguiente = 0;
            }

            mostrarFotograma(siguiente);
        }, 850);
    }

    function alternarAnimacion() {
        if (reproduciendo) {
            detenerAnimacion();
        } else {
            iniciarAnimacion();
        }
    }

    /*
============================================================
CONTROLES
============================================================
*/

    function configurarControles() {
        const botonAnterior = obtenerElemento("boton-anterior");

        const botonSiguiente = obtenerElemento("boton-siguiente");

        const botonReproducir = obtenerElemento("boton-reproducir");

        const botonRecargar = obtenerElemento("boton-recargar");

        const timelineSlider = obtenerElemento("timeline-slider");

        const opacidadSlider = obtenerElemento("opacidad-slider");

        botonAnterior.addEventListener("click", () => {
            detenerAnimacion();

            mostrarFotograma(indiceActual - 1);
        });

        botonSiguiente.addEventListener("click", () => {
            detenerAnimacion();

            mostrarFotograma(indiceActual + 1);
        });

        botonReproducir.addEventListener("click", alternarAnimacion);

        botonRecargar.addEventListener("click", cargarTimeline);

        timelineSlider.addEventListener("input", () => {
            detenerAnimacion();

            mostrarFotograma(Number(timelineSlider.value));
        });

        opacidadSlider.addEventListener("input", () => {
            opacidadRadar = Number(opacidadSlider.value) / 100;

            asignarTexto("opacidad-valor", `${opacidadSlider.value} %`);

            if (capaRadar) {
                capaRadar.setOpacity(opacidadRadar);
            }
        });
    }

    /*
============================================================
INICIALIZACIÓN
============================================================
*/

    function iniciarAplicacion() {
        crearMapa();

        configurarControles();

        /*
    Dejamos que el navegador complete primero el layout.
    */

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                invalidarTamanoMapaDiferido();

                cargarTimeline();
            });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciarAplicacion, {
            once: true,
        });
    } else {
        iniciarAplicacion();
    }

    window.addEventListener("load", invalidarTamanoMapaDiferido, {
        once: true,
    });
