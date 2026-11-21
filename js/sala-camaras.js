/*
 * MeteoArchidona · Sala de cámaras
 *
 * Todos los directos a la vez en una rejilla a pantalla entera
 * (José, 20-11-2026). Sección aparte, no componente de dashboards.
 *
 * - Cámaras: las de js/componentes/catalogo-camaras.js (Los Llanos y
 *   Sierra Nevada), las mismas que En vivo, y los directos de YouTube de
 *   /api/camaras/youtube en su orden. Una cámara nueva en cualquiera de
 *   las dos listas aparece sola aquí.
 * - Rejilla: columnas fijas (css/sala-camaras.css) y tantas filas como
 *   hagan falta, todo dentro de la pantalla.
 * - Al tocar una cámara: pantalla completa de esa cámara. Donde el
 *   navegador no lo deja (iPhone), ocupa toda la ventana. ✕ para volver.
 * - YouTube que no arranca: «Sin emisión» y otro intento cada 5 minutos
 *   (lo avisa visores/youtube.js). Feratel no se puede vigilar desde
 *   fuera: enseña lo que dé su reproductor.
 * - Salir: «←» a En vivo, o Esc en el ordenador.
 * - Lanzamientos escalonados: si la sala aún no ha salido, «Próximamente»
 *   y no se carga ningún vídeo.
 * - Botón «Destacar» junto al nombre (José, 21-11-2026), solo para los
 *   administradores (sesión de usuario administrador), en la cuadrícula y
 *   ampliada (en la cuadrícula, solo la estrella): «☆ Destacar» pone esa cámara como la emisión destacada
 *   manual (reutiliza la que ya hubiera de otras veces y apaga la
 *   anterior); «★ Destacada» marca la manual activa (aunque una franja la
 *   tape hasta que acabe), y al
 *   pulsarlo se quita la manual. Se mira cada minuto por si se cambia desde
 *   Administración.
 */

import {ZONAS_CAMARAS} from "./componentes/catalogo-camaras.js?v=20261120-destacada1";


const RUTA_LANZAMIENTOS = "/js/lanzamientos.js?v=20261115-lanzamientos2";
const RUTA_YOUTUBE = "/api/camaras/youtube";
const RUTA_DESTACADA = "/api/emision-destacada";
const CONSULTA_DESTACADA_MS = 60 * 1000;
const ZONAS_PROPIAS = ["los-llanos", "sierra-nevada"];
const SECCION = "sala-camaras";

const REINTENTO_MS = 5 * 60 * 1000;
const REFRESCO_IMAGENES_MS = 60 * 1000;
const ORIGEN_AVISO = "meteoarchidona-visor-youtube";

const sala = document.getElementById("sala");
const rejilla = document.getElementById("sala-rejilla");
const estado = document.getElementById("sala-estado");
const botonCompleta = document.getElementById("sala-completa");

const reintentos = new Map();


/* ==========================================================
   LISTA DE CÁMARAS
   ========================================================== */

function camarasDelCatalogo() {

    const lista = [];

    for (const clave of ZONAS_PROPIAS) {
        for (const camara of ZONAS_CAMARAS[clave]?.camaras || []) {
            lista.push(camara);
        }
    }

    // Por si se añade otra zona al catálogo: también sale.
    for (const [clave, zona] of Object.entries(ZONAS_CAMARAS)) {
        if (!ZONAS_PROPIAS.includes(clave)) {
            lista.push(...(zona.camaras || []));
        }
    }

    return lista;
}


async function camarasDeYoutube() {

    try {
        const respuesta = await fetch(RUTA_YOUTUBE, {
            headers: {Accept: "application/json"},
            cache: "no-store",
            credentials: "same-origin",
        });

        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        if (!Array.isArray(datos)) {
            throw new Error("respuesta no válida");
        }

        return datos
            .filter((camara) => camara && camara.url)
            .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
            .map((camara) => ({
                clave: `camara-${camara.id}`,
                nombre: camara.nombre || "YouTube",
                nombreCorto: camara.nombre || "YouTube",
                medio: "youtube",
                url: camara.url,
            }));

    } catch (error) {
        console.error("Sala de cámaras: no se pudieron cargar los directos de YouTube", error);
        avisar("No se han podido cargar los directos de YouTube.");
        return [];
    }
}


/* ==========================================================
   RECUADROS
   ========================================================== */

function urlImagen(src) {
    const separador = src.includes("?") ? "&" : "?";
    return `${src}${separador}t=${Date.now()}`;
}


function crearMedio(camara) {

    if (camara.medio === "imagen-remota") {
        const imagen = document.createElement("img");
        imagen.className = "sala-medio";
        imagen.alt = camara.alt || camara.nombre;
        imagen.dataset.base = camara.src;
        imagen.src = urlImagen(camara.src);
        return imagen;
    }

    const marco = document.createElement("iframe");
    marco.className = "sala-medio";
    marco.title = camara.nombre;
    marco.loading = "eager";
    marco.allow = "autoplay; fullscreen; encrypted-media; picture-in-picture";
    marco.allowFullscreen = true;

    if (camara.medio === "visor-video") {
        // Visor propio sin controles: en un recuadro pequeño estorban.
        const parametros = new URLSearchParams({
            camara: camara.visorCamara,
            vista: camara.visorVista,
            interactivo: "0",
            controles: "0",
            autoplay: "1",
        });
        marco.src = `/visores/video.html?${parametros}`;
    } else if (camara.medio === "youtube") {
        const parametros = new URLSearchParams({url: camara.url});
        marco.src = `/visores/youtube.html?${parametros}`;
        marco.dataset.youtube = "si";
    } else {
        marco.src = camara.src;
        marco.referrerPolicy = "strict-origin-when-cross-origin";
    }

    return marco;
}


function crearCelda(camara) {

    const celda = document.createElement("figure");
    celda.className = "sala-celda";
    celda.dataset.medio = camara.medio;

    // La panorámica se ve entera al ampliarla: sus instrumentos van en los bordes.
    if (camara.medio === "visor-video" && camara.visorVista === "panoramica") {
        celda.dataset.ajuste = "entero";
    }

    const medio = crearMedio(camara);

    const caida = document.createElement("div");
    caida.className = "sala-caida";
    caida.hidden = true;
    const titulo = document.createElement("strong");
    titulo.textContent = "Sin emisión";
    const texto = document.createElement("span");
    texto.textContent = "Se reintenta cada 5 minutos";
    caida.append(titulo, texto);

    const tocar = document.createElement("button");
    tocar.type = "button";
    tocar.className = "sala-tocar";
    tocar.setAttribute("aria-label", `Ver ${camara.nombre} en pantalla completa`);
    tocar.addEventListener("click", () => ampliar(celda));

    const nombre = document.createElement("figcaption");
    nombre.className = "sala-nombre";
    const textoNombre = document.createElement("span");
    textoNombre.className = "sala-nombre-texto";
    textoNombre.textContent = camara.nombreCorto || camara.nombre;
    nombre.append(textoNombre);
    if (camara.clave) {
        celda.dataset.clave = camara.clave;
    }

    const cerrar = document.createElement("button");
    cerrar.type = "button";
    cerrar.className = "sala-boton sala-cerrar";
    cerrar.setAttribute("aria-label", "Volver a la sala");
    cerrar.title = "Volver a la sala";
    cerrar.textContent = "✕";
    cerrar.addEventListener("click", () => reducir(celda));

    if (medio.tagName === "IMG") {
        // Foto fija que no llega: «Sin imagen» en vez del texto alternativo.
        titulo.textContent = "Sin imagen";
        texto.textContent = "Se reintenta cada minuto";
        medio.addEventListener("error", () => {
            caida.hidden = false;
        });
        medio.addEventListener("load", () => {
            caida.hidden = true;
        });
    }

    celda.append(medio, caida, tocar, nombre, cerrar);

    return celda;
}


function ajustarFilas(total) {

    const columnas = Number.parseInt(
        getComputedStyle(sala).getPropertyValue("--columnas"),
        10
    ) || 6;

    sala.style.setProperty("--filas", String(Math.max(1, Math.ceil(total / columnas))));
}


/* ==========================================================
   AMPLIAR Y REDUCIR
   ========================================================== */

function pantallaCompletaDisponible() {
    return Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen);
}


function girarHorizontal() {
    try {
        screen.orientation?.lock?.("landscape")?.catch(() => {});
    } catch (error) {
        // Solo Android lo permite; en el resto no pasa nada.
    }
}


function liberarGiro() {
    try {
        screen.orientation?.unlock?.();
    } catch (error) {
        // Nada que liberar.
    }
}


function ampliarEnVentana(celda) {
    celda.classList.add("ampliada", "ampliada-ventana");
}


function ampliar(celda) {

    if (!pantallaCompletaDisponible()) {
        ampliarEnVentana(celda);
        return;
    }

    celda.requestFullscreen()
        .then(girarHorizontal)
        .catch(() => ampliarEnVentana(celda));
}


function reducir(celda) {

    if (document.fullscreenElement === celda) {
        document.exitFullscreen().catch(() => {});
        return;
    }

    celda.classList.remove("ampliada", "ampliada-ventana");
}


function alCambiarPantallaCompleta() {

    const activa = document.fullscreenElement;

    for (const celda of rejilla.querySelectorAll(".sala-celda")) {
        if (celda === activa) {
            celda.classList.add("ampliada");
        } else if (!celda.classList.contains("ampliada-ventana")) {
            celda.classList.remove("ampliada");
        }
    }

    if (!activa) {
        liberarGiro();
    }

    if (botonCompleta) {
        const toda = activa === document.documentElement;
        botonCompleta.textContent = toda ? "⤡" : "⛶";
        botonCompleta.setAttribute(
            "aria-label",
            toda ? "Salir de la pantalla completa" : "Poner la sala en pantalla completa"
        );
    }
}


function prepararBotonSala() {

    if (!botonCompleta || !pantallaCompletaDisponible()) {
        return;
    }

    botonCompleta.hidden = false;

    botonCompleta.addEventListener("click", () => {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        } else {
            document.documentElement.requestFullscreen().catch(() => {});
        }
    });
}


function alPulsarTecla(evento) {

    if (evento.key !== "Escape" || document.fullscreenElement) {
        return;
    }

    const enVentana = rejilla.querySelector(".ampliada-ventana");

    if (enVentana) {
        reducir(enVentana);
        return;
    }

    window.location.href = "/en-vivo";
}


/* ==========================================================
   DIRECTOS DE YOUTUBE CAÍDOS
   ========================================================== */

function celdaDeVentana(ventana) {
    for (const marco of rejilla.querySelectorAll('iframe[data-youtube="si"]')) {
        if (marco.contentWindow === ventana) {
            return marco.closest(".sala-celda");
        }
    }
    return null;
}


function reintentar(celda) {

    const marco = celda.querySelector("iframe");

    if (!marco) {
        return;
    }

    const url = new URL(marco.src, window.location.origin);
    url.searchParams.set("r", String(Date.now()));
    marco.src = url.pathname + url.search;
}


function marcarCaida(celda, caida) {

    celda.querySelector(".sala-caida").hidden = !caida;
    celda.classList.toggle("sin-emision", caida);

    clearTimeout(reintentos.get(celda));
    reintentos.delete(celda);

    if (caida) {
        reintentos.set(celda, setTimeout(() => reintentar(celda), REINTENTO_MS));
    }
}


function alRecibirMensaje(evento) {

    if (evento.origin !== window.location.origin) {
        return;
    }

    const datos = evento.data;

    if (!datos || typeof datos !== "object" || datos.origen !== ORIGEN_AVISO) {
        return;
    }

    const celda = celdaDeVentana(evento.source);

    if (!celda) {
        return;
    }

    if (datos.estado === "sin-emision") {
        marcarCaida(celda, true);
    } else if (datos.estado === "reproduciendo") {
        marcarCaida(celda, false);
    }
}


/* ==========================================================
   IMÁGENES FIJAS (Pradollano, El Río)
   ========================================================== */

function refrescarImagenes() {

    if (document.hidden) {
        return;
    }

    for (const imagen of rejilla.querySelectorAll("img.sala-medio")) {
        imagen.src = urlImagen(imagen.dataset.base);
    }
}


/* ==========================================================
   AVISOS
   ========================================================== */

let avisoTiempo = null;

function avisar(texto) {

    if (!estado) {
        return;
    }

    estado.textContent = texto;
    estado.hidden = false;

    clearTimeout(avisoTiempo);
    avisoTiempo = setTimeout(() => {
        estado.hidden = true;
    }, 8000);
}


/* ==========================================================
   BOTÓN «DESTACAR» (solo administradores)
   ========================================================== */

let manualActual = null;


function pintarDestacada() {

    for (const boton of rejilla.querySelectorAll(".sala-destacar")) {
        const encendido = boton.dataset.clave === manualActual;
        boton.classList.toggle("encendido", encendido);
        // En la cuadrícula solo se ve la estrella; ampliada, también el texto.
        const icono = document.createElement("span");
        icono.textContent = encendido ? "★" : "☆";
        const texto = document.createElement("span");
        texto.className = "sala-destacar-texto";
        texto.textContent = encendido ? " Destacada" : " Destacar";
        boton.replaceChildren(icono, texto);
        boton.setAttribute("aria-label", encendido ? "Destacada" : "Destacar");
        boton.setAttribute("aria-pressed", encendido ? "true" : "false");
        boton.title = encendido
            ? "Es la emisión destacada. Pulsa para quitarla"
            : "Poner como emisión destacada";
    }
}


function leerDestacada(datos) {
    // La manual activa, salga ya o espere a que acabe una franja (José, 21-11-2026).
    manualActual = datos?.manual?.tipo === "DIRECTO" ? datos.manual.directo : null;
    pintarDestacada();
}


async function consultarDestacada() {
    try {
        const respuesta = await fetch(`${RUTA_DESTACADA}/actual`, {cache: "no-store", credentials: "same-origin"});
        if (respuesta.ok) leerDestacada(await respuesta.json());
    } catch (error) {
        console.error("Sala de cámaras: no se pudo consultar la emisión destacada", error);
    }
}


async function pulsarDestacar(evento) {

    evento.stopPropagation();
    const boton = evento.currentTarget;
    const quitar = boton.dataset.clave === manualActual;

    boton.disabled = true;
    try {
        const respuesta = await fetch(`${RUTA_DESTACADA}/${quitar ? "quitar" : "destacar"}`, {
            method: "POST",
            cache: "no-store",
            credentials: "same-origin",
            headers: {"Content-Type": "application/json", Accept: "application/json"},
            body: quitar ? "{}" : JSON.stringify({clave_directo: boton.dataset.clave}),
        });
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        leerDestacada(await respuesta.json());
    } catch (error) {
        console.error("Sala de cámaras: no se pudo cambiar la emisión destacada", error);
        avisar("No se ha podido cambiar la emisión destacada.");
    } finally {
        boton.disabled = false;
    }
}


function ponerBotonesDestacar() {

    for (const celda of rejilla.querySelectorAll(".sala-celda[data-clave]")) {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "sala-destacar";
        boton.dataset.clave = celda.dataset.clave;
        boton.addEventListener("click", pulsarDestacar);
        celda.querySelector(".sala-nombre").append(boton);
    }

    pintarDestacada();
    consultarDestacada();
    setInterval(() => {
        if (!document.hidden) consultarDestacada();
    }, CONSULTA_DESTACADA_MS);
}


async function esAdministrador() {
    try {
        const modulo = await import(RUTA_LANZAMIENTOS);
        const datos = await modulo.cargarLanzamientos();
        return Boolean(datos?.administrador);
    } catch {
        return false;
    }
}


/* ==========================================================
   ARRANQUE
   ========================================================== */

async function salaOculta() {

    try {
        const modulo = await import(RUTA_LANZAMIENTOS);
        const datos = await modulo.cargarLanzamientos();

        // Franja de obras, marca de los administradores o «Próximamente».
        await modulo.aplicarLanzamientos();

        return datos.lanzamientos.some(
            (lanzamiento) =>
                lanzamiento.tipo === "SECCION" &&
                lanzamiento.seccion === SECCION &&
                lanzamiento.estado === "OCULTO" &&
                !datos.administrador
        );

    } catch (error) {
        console.error("Sala de cámaras: no se pudieron aplicar los lanzamientos", error);
        return false;
    }
}


async function montarSala() {

    if (!sala || !rejilla) {
        return;
    }

    if (await salaOculta()) {
        return;
    }

    const camaras = [...camarasDelCatalogo(), ...(await camarasDeYoutube())];

    rejilla.replaceChildren(...camaras.map(crearCelda));

    ajustarFilas(camaras.length);

    // Al girar el móvil cambian las columnas (3 ↔ 6) y con ellas las filas.
    window.matchMedia("(orientation: portrait) and (max-width: 900px)")
        .addEventListener("change", () => ajustarFilas(camaras.length));

    window.addEventListener("message", alRecibirMensaje);
    document.addEventListener("fullscreenchange", alCambiarPantallaCompleta);
    document.addEventListener("keydown", alPulsarTecla);

    setInterval(refrescarImagenes, REFRESCO_IMAGENES_MS);

    prepararBotonSala();

    if (await esAdministrador()) {
        ponerBotonesDestacar();
    }
}


montarSala();


/* Fin de fichero: js/sala-camaras.js */
