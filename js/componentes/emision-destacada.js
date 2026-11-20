/*
 * MeteoArchidona · Componente «Emisión destacada ahora»
 *
 * Una sola emisión, la que más interesa en cada momento, elegida en
 * Administración → Emisión destacada (José, 20-11-2026; docs/emision-destacada.md
 * de la API): la manual, si hay; si no, la franja horaria en curso; si no,
 * la de por defecto (la panorámica de Los Llanos).
 *
 *     <div data-componente="emision-destacada"></div>
 *
 *     import {montarEmisionDestacada} from "/js/componentes/emision-destacada.js?v=…";
 *     montarEmisionDestacada(hueco);
 *
 * Visores, uno por tipo, y solo se ve el que toca:
 *
 * - propio (visores/video.html), para las cámaras de Los Llanos;
 * - YouTube (visores/youtube.html), con el arranque limpio de los 7 s;
 * - Sierra Nevada: el reproductor de Feratel o la foto fija, que se
 *   refresca cada minuto;
 * - timelapse: el vídeo del navegador, con la lista de MP4 que da la API,
 *   uno detrás de otro y vuelta a empezar.
 *
 * Arranca solo y en silencio, sin texto encima del vídeo (los timelapses
 * llevan la fecha grabada). Pregunta a la API cada minuto
 * (GET /emision-destacada/actual) y solo cambia si cambia lo que toca, así
 * un directo no se reinicia. Si el directo elegido ya no está en el
 * catálogo, o la API no responde la primera vez, sale la panorámica.
 *
 * Al cambiar de emisión se quita el visor anterior (deja de gastar datos).
 * Botón de pantalla completa en la cabecera. Sin id: se puede repetir.
 */

import {asegurarHoja, asegurarScript} from "./comun.js?v=20261104-componentes1";
import {ZONAS_CAMARAS} from "./catalogo-camaras.js?v=20261120-destacada1";
import {prepararPantallaCompleta} from "./pantalla-completa.js?v=20261118-pantalla1";


const HOJA = "/css/emision-destacada.css?v=20261120-destacada1";
const SCRIPT_API = "/js/api.js?v=20261003-vps1";

const CONSULTA_MS = 60 * 1000;
const REFRESCO_IMAGEN_MS = 60 * 1000;
const REINTENTO_YOUTUBE_MS = 5 * 60 * 1000;
const ORIGEN_AVISO = "meteoarchidona-visor-youtube";

// Si la API no responde: la panorámica de Los Llanos.
const CLAVE_RESERVA = "camara-1";


function crear(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
}


function apiBase() {
    return String(window.API_BASE || "/api").replace(/\/+$/, "");
}


async function leerJson(ruta) {
    const respuesta = await fetch(`${apiBase()}${ruta}`, {
        headers: {Accept: "application/json"},
        cache: "no-store",
        credentials: "same-origin",
    });
    if (!respuesta.ok) {
        throw new Error(`HTTP ${respuesta.status}`);
    }
    return respuesta.json();
}


/* ==========================================================
   CATÁLOGO DE DIRECTOS (el de En vivo y la Sala de cámaras)
   ========================================================== */

let catalogoPromesa = null;

function catalogoDirectos() {

    if (!catalogoPromesa) {
        catalogoPromesa = (async () => {
            const directos = new Map();

            for (const zona of Object.values(ZONAS_CAMARAS)) {
                for (const camara of zona.camaras || []) {
                    if (camara.clave) {
                        directos.set(camara.clave, camara);
                    }
                }
            }

            try {
                const youtube = await leerJson("/camaras/youtube");
                for (const camara of Array.isArray(youtube) ? youtube : []) {
                    if (camara?.id && camara.url) {
                        directos.set(`camara-${camara.id}`, {
                            clave: `camara-${camara.id}`,
                            nombre: camara.nombre || "YouTube",
                            medio: "youtube",
                            url: camara.url,
                        });
                    }
                }
            } catch (error) {
                console.error("Emisión destacada: no se pudieron cargar los directos de YouTube", error);
                catalogoPromesa = null;  // Se vuelve a intentar en la próxima consulta.
            }

            return directos;
        })();
    }

    return catalogoPromesa;
}


/* ==========================================================
   VISORES
   ========================================================== */

function marcoVisor(titulo) {
    const marco = crear("iframe", "ed-medio");
    marco.title = titulo;
    marco.loading = "eager";
    marco.allow = "autoplay; fullscreen; encrypted-media; picture-in-picture";
    marco.allowFullscreen = true;
    return marco;
}


function urlImagen(src) {
    const separador = src.includes("?") ? "&" : "?";
    return `${src}${separador}t=${Date.now()}`;
}


/*
 * Monta un directo en su capa. Devuelve una función que lo desmonta.
 */
function montarDirecto(capa, camara, alCaer) {

    capa.replaceChildren();
    const temporizadores = [];

    if (camara.medio === "imagen-remota") {
        const imagen = crear("img", "ed-medio");
        imagen.alt = camara.alt || camara.nombre;
        imagen.src = urlImagen(camara.src);
        imagen.addEventListener("error", () => alCaer(true));
        imagen.addEventListener("load", () => alCaer(false));
        temporizadores.push(setInterval(() => {
            if (!document.hidden) imagen.src = urlImagen(camara.src);
        }, REFRESCO_IMAGEN_MS));
        capa.append(imagen);
    } else if (camara.medio === "visor-video") {
        const marco = marcoVisor(camara.nombre);
        marco.src = `/visores/video.html?${new URLSearchParams({
            camara: camara.visorCamara,
            vista: camara.visorVista,
            interactivo: "0",
            controles: "0",
            autoplay: "1",
        })}`;
        capa.append(marco);
    } else if (camara.medio === "youtube") {
        const marco = marcoVisor(camara.nombre);
        marco.dataset.youtube = "si";
        marco.src = `/visores/youtube.html?${new URLSearchParams({url: camara.url})}`;
        capa.append(marco);
    } else {
        const marco = marcoVisor(camara.nombre);
        marco.referrerPolicy = "strict-origin-when-cross-origin";
        marco.src = camara.src;
        capa.append(marco);
    }

    // La panorámica se ve entera: sus instrumentos van en los bordes.
    capa.dataset.ajuste = camara.medio === "visor-video" && camara.visorVista === "panoramica" ? "entero" : "";

    return () => {
        temporizadores.forEach(clearInterval);
        capa.replaceChildren();
    };
}


/*
 * Timelapses: uno detrás de otro y vuelta a empezar, en silencio.
 */
function montarTimelapses(capa, videos) {

    capa.replaceChildren();
    capa.dataset.ajuste = "entero";

    const video = crear("video", "ed-medio");
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");

    let indice = 0;
    let fallos = 0;

    const poner = () => {
        video.src = videos[indice].url;
        video.play().catch(() => {});
    };

    const siguiente = () => {
        indice = (indice + 1) % videos.length;
        // Con un solo vídeo, basta volver al principio.
        if (videos.length === 1) {
            video.currentTime = 0;
            video.play().catch(() => {});
            return;
        }
        poner();
    };

    video.addEventListener("ended", siguiente);
    video.addEventListener("playing", () => {
        fallos = 0;
    });
    video.addEventListener("error", () => {
        // Un MP4 que falla se salta; si fallan todos seguidos, se para.
        fallos += 1;
        if (fallos < videos.length) siguiente();
    });

    capa.append(video);
    poner();

    return () => {
        video.removeAttribute("src");
        video.load();
        capa.replaceChildren();
    };
}


/* ==========================================================
   COMPONENTE
   ========================================================== */

export async function montarEmisionDestacada(raiz) {

    asegurarHoja(HOJA);
    await asegurarScript(SCRIPT_API, "API_BASE");

    raiz.classList.add("ed-componente");
    raiz.textContent = "";
    raiz.setAttribute("role", "region");
    raiz.setAttribute("aria-label", "Emisión destacada ahora");

    const cabecera = crear("div", "ed-cabecera");
    const titulo = crear("h2", "ed-titulo", "Emisión destacada ahora");
    const ampliar = crear("button", "ed-boton", "⛶");
    ampliar.type = "button";
    cabecera.append(titulo, ampliar);

    const pantalla = crear("div", "ed-pantalla");

    // Una capa por visor, ocultas; solo se enseña la que toca.
    const capas = {
        directo: crear("div", "ed-capa ed-capa-directo"),
        timelapse: crear("div", "ed-capa ed-capa-timelapse"),
    };
    for (const capa of Object.values(capas)) {
        capa.hidden = true;
    }

    const caida = crear("div", "ed-caida");
    caida.hidden = true;
    caida.append(crear("strong", null, "Sin emisión"), crear("span", null, "Se reintenta en unos minutos"));

    const cargando = crear("div", "ed-cargando", "Conectando…");

    pantalla.append(capas.directo, capas.timelapse, caida, cargando);
    raiz.append(cabecera, pantalla);

    prepararPantallaCompleta(raiz, ampliar, {ampliado: "ed-ampliado", maximizado: "ed-maximizado"});

    let firmaActual = null;
    let desmontar = null;
    let reintento = null;

    const marcarCaida = estado => {
        caida.hidden = !estado;
        clearTimeout(reintento);
        reintento = null;
        if (estado && capas.directo.querySelector('iframe[data-youtube="si"]')) {
            reintento = setTimeout(() => {
                firmaActual = null;  // Fuerza volver a montarlo.
                consultar();
            }, REINTENTO_YOUTUBE_MS);
        }
    };

    // Aviso del visor de YouTube: arrancó o no hay emisión.
    window.addEventListener("message", evento => {
        if (evento.origin !== window.location.origin) return;
        const datos = evento.data;
        if (!datos || typeof datos !== "object" || datos.origen !== ORIGEN_AVISO) return;
        const marco = capas.directo.querySelector('iframe[data-youtube="si"]');
        if (!marco || evento.source !== marco.contentWindow) return;
        if (datos.estado === "sin-emision") marcarCaida(true);
        else if (datos.estado === "reproduciendo") marcarCaida(false);
    });

    const mostrar = async emision => {

        let firma;
        let montar;

        if (emision?.tipo === "TIMELAPSE" && emision.timelapse?.videos?.length) {
            const videos = emision.timelapse.videos;
            firma = `T:${videos.map(video => video.url).join("|")}`;
            montar = () => {
                capas.directo.hidden = true;
                capas.timelapse.hidden = false;
                return montarTimelapses(capas.timelapse, videos);
            };
        } else {
            const directos = await catalogoDirectos();
            const clave = emision?.directo || CLAVE_RESERVA;
            const camara = directos.get(clave) || directos.get(CLAVE_RESERVA);
            if (!camara) return;
            firma = `D:${camara.clave}`;
            montar = () => {
                capas.timelapse.hidden = true;
                capas.directo.hidden = false;
                return montarDirecto(capas.directo, camara, marcarCaida);
            };
        }

        if (firma === firmaActual) return;

        desmontar?.();
        marcarCaida(false);
        firmaActual = firma;
        desmontar = montar();
        cargando.hidden = true;
        raiz.dataset.emision = firma.startsWith("T:") ? "timelapse" : "directo";
    };

    const consultar = async () => {
        let datos = null;
        try {
            datos = await leerJson("/emision-destacada/actual");
        } catch (error) {
            console.error("Emisión destacada: no se pudo consultar la emisión", error);
            // La primera vez, la panorámica; después se deja lo que hay.
            if (firmaActual === null) await mostrar(null);
            return;
        }

        const directos = await catalogoDirectos();
        let emision = datos?.emision || datos?.defecto || null;
        // Un directo que ya no está en el catálogo: la de por defecto.
        if (emision?.tipo === "DIRECTO" && !directos.has(emision.directo)) {
            emision = datos?.defecto || null;
        }
        await mostrar(emision);
    };

    await consultar();

    setInterval(() => {
        if (!document.hidden) consultar();
    }, CONSULTA_MS);

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) consultar();
    });
}


/* Fin de fichero: js/componentes/emision-destacada.js */
