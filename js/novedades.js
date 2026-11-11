/*
 * MeteoArchidona · Novedades de la portada
 *
 * Decisiones de José del 5-11-2026 (docs/novedades.md de la API): al
 * abrir la portada, si hay novedades vigentes, sale una ventana encima
 * con todas, de la más reciente a la más antigua. Cada una tiene su
 * título y sus bloques en orden: la imagen a todo lo ancho y el texto
 * debajo. Se cierra con «Entendido», con la X, con Escape o tocando
 * fuera.
 *
 * Cambio de José del 8-11-2026: cada novedad sale una sola vez por
 * navegador. Al cerrar la ventana se apunta en localStorage (que no se
 * borra al cerrar el navegador) qué novedades se han visto; al volver
 * solo salen las nuevas o las que hayan cambiado. Vale igual para
 * visitantes y registrados, sin tocar la base de datos: en otro
 * navegador o dispositivo volverán a salir una vez.
 *
 * El texto va como texto: saltos de línea respetados y direcciones
 * convertidas en enlaces; nada de HTML. Las imágenes son siempre
 * nuestras (/assets/...): la API no admite otras y aquí se comprueba
 * otra vez.
 *
 * Avisos (José, 11-11-2026; docs/novedades.md de la API): van en el
 * mismo subsistema, con tipo AVISO. Las novedades y los avisos manuales
 * salen en la ventana; los avisos automáticos (como los pases muy
 * brillantes de la Estación Espacial), en una franja discreta encima de
 * la portada que se puede cerrar: cerrado un aviso, no vuelve a salir en
 * ese navegador salvo que cambie. Si tienen enlace (siempre a nuestra
 * web), llevan un botón para ir.
 *
 * API: GET /novedades.
 */

const HOJA = "/css/novedades.css?v=20261111-avisos1";
const CLAVE_VISTAS = "ma_novedades_vistas_v2";
const CLAVE_CERRADOS = "ma_avisos_cerrados_v1";

const formatoFecha = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "long"
});


function crear(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
}

export function asegurarHoja() {
    if (document.querySelector('link[href*="css/novedades.css"]')) return;
    const enlace = document.createElement("link");
    enlace.rel = "stylesheet";
    enlace.href = HOJA;
    document.head.appendChild(enlace);
}

/* Texto con saltos de línea y enlaces que se pueden pulsar. */
export function pintarTexto(contenedor, texto) {
    const parrafos = texto.split(/\n{2,}/);
    for (const parrafo of parrafos) {
        const p = crear("p", "novedad-texto");
        const lineas = parrafo.split("\n");
        lineas.forEach((linea, indice) => {
            if (indice) p.appendChild(document.createElement("br"));
            const partes = linea.split(/(https?:\/\/[^\s<>"]+)/g);
            for (const parte of partes) {
                if (/^https?:\/\//.test(parte)) {
                    const enlace = crear("a", null, parte);
                    enlace.href = parte;
                    if (!parte.startsWith(window.location.origin)) {
                        enlace.target = "_blank";
                        enlace.rel = "noopener noreferrer";
                    }
                    p.appendChild(enlace);
                } else if (parte) {
                    p.appendChild(document.createTextNode(parte));
                }
            }
        });
        contenedor.appendChild(p);
    }
}

function imagenNuestra(ruta) {
    return typeof ruta === "string" && ruta.startsWith("/assets/") && !ruta.includes("..") && !ruta.includes("//");
}

/* Solo direcciones de nuestra web (/luna#titulo-luna-pasos): la API ya lo exige. */
function enlaceNuestro(ruta) {
    return typeof ruta === "string" && ruta.startsWith("/") && !ruta.startsWith("//");
}

export function esAutomatico(novedad) {
    return novedad.origen === "AUTOMATICO";
}

function etiquetaDe(novedades) {
    const avisos = novedades.filter(n => n.tipo === "AVISO").length;
    if (!avisos) return novedades.length > 1 ? "NOVEDADES" : "NOVEDAD";
    if (avisos === novedades.length) return avisos > 1 ? "AVISOS" : "AVISO";
    return "NOVEDADES Y AVISOS";
}

export function pintarNovedad(novedad) {
    const articulo = crear("article", `novedad${novedad.tipo === "AVISO" ? " novedad-aviso" : ""}`);

    const cabeza = crear("header", "novedad-cabeza");
    if (novedad.tipo === "AVISO") cabeza.appendChild(crear("span", "novedad-tipo", "Aviso"));
    cabeza.appendChild(crear("h3", "novedad-titulo", novedad.titulo));
    if (novedad.inicio) {
        cabeza.appendChild(crear("p", "novedad-fecha", formatoFecha.format(new Date(novedad.inicio))));
    }
    articulo.appendChild(cabeza);

    for (const bloque of novedad.bloques || []) {
        const caja = crear("div", "novedad-bloque");
        if (bloque.imagen && imagenNuestra(bloque.imagen)) {
            const imagen = crear("img", "novedad-imagen");
            imagen.src = bloque.imagen;
            imagen.alt = novedad.titulo;
            imagen.loading = "lazy";
            imagen.decoding = "async";
            imagen.addEventListener("error", () => imagen.remove(), { once: true });
            caja.appendChild(imagen);
        }
        if (bloque.texto) pintarTexto(caja, bloque.texto);
        articulo.appendChild(caja);
    }

    if (novedad.enlace && enlaceNuestro(novedad.enlace)) {
        const ir = crear("a", "novedad-enlace", "Ver más →");
        ir.href = novedad.enlace;
        articulo.appendChild(ir);
    }

    return articulo;
}

/* Huella de cada novedad: si cambia algo, se vuelve a enseñar. */
function huella(novedad) {
    const bloques = novedad.bloques || [];
    const textos = bloques.reduce((total, b) => total + (b.texto || "").length, 0);
    return `${novedad.titulo.length}:${bloques.length}:${textos}`;
}

/* Lo visto en este navegador: { id: huella }. */
function leerVistas() {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE_VISTAS) || "{}");
        return datos && typeof datos === "object" ? datos : {};
    } catch {
        return {};
    }
}

function marcarVistas(novedades) {
    // Solo se guardan las vigentes: las caducadas se van solas de la lista.
    const vistas = {};
    for (const novedad of novedades) vistas[novedad.id] = huella(novedad);
    try {
        localStorage.setItem(CLAVE_VISTAS, JSON.stringify(vistas));
    } catch {
        // Sin almacenamiento (modo privado estricto): saldrá otra vez, sin más.
    }
}

export function abrirVentana(novedades, { alCerrar } = {}) {
    asegurarHoja();

    const fondo = crear("div", "novedades-fondo");
    const ventana = crear("div", "novedades-ventana");
    ventana.setAttribute("role", "dialog");
    ventana.setAttribute("aria-modal", "true");
    ventana.setAttribute("aria-label", novedades.length > 1 ? "Novedades y avisos de MeteoArchidona" : novedades[0].titulo);

    const barra = crear("div", "novedades-barra");
    barra.appendChild(crear("span", "novedades-etiqueta", etiquetaDe(novedades)));
    const cerrarX = crear("button", "novedades-x", "×");
    cerrarX.type = "button";
    cerrarX.setAttribute("aria-label", "Cerrar");
    barra.appendChild(cerrarX);
    ventana.appendChild(barra);

    const cuerpo = crear("div", "novedades-cuerpo");
    for (const novedad of novedades) cuerpo.appendChild(pintarNovedad(novedad));
    ventana.appendChild(cuerpo);

    const pie = crear("div", "novedades-pie");
    const entendido = crear("button", "novedades-boton", "Entendido");
    entendido.type = "button";
    pie.appendChild(entendido);
    ventana.appendChild(pie);

    fondo.appendChild(ventana);
    document.body.appendChild(fondo);
    document.documentElement.classList.add("novedades-abiertas");

    const antes = document.activeElement;

    function cerrar() {
        fondo.classList.add("cerrando");
        document.documentElement.classList.remove("novedades-abiertas");
        document.removeEventListener("keydown", teclas);
        setTimeout(() => fondo.remove(), 180);
        if (antes && antes.focus) antes.focus();
        if (alCerrar) alCerrar();
    }

    function teclas(evento) {
        if (evento.key === "Escape") cerrar();
        if (evento.key === "Tab") {
            // El foco no se escapa de la ventana.
            const enfocables = ventana.querySelectorAll("button, a[href]");
            const primero = enfocables[0];
            const ultimo = enfocables[enfocables.length - 1];
            if (evento.shiftKey && document.activeElement === primero) {
                evento.preventDefault();
                ultimo.focus();
            } else if (!evento.shiftKey && document.activeElement === ultimo) {
                evento.preventDefault();
                primero.focus();
            }
        }
    }

    entendido.addEventListener("click", cerrar);
    cerrarX.addEventListener("click", cerrar);
    fondo.addEventListener("click", evento => {
        if (evento.target === fondo) cerrar();
    });
    document.addEventListener("keydown", teclas);

    requestAnimationFrame(() => {
        fondo.classList.add("visible");
        entendido.focus({ preventScroll: true });
    });

    return cerrar;
}

/* ------------------------------------------------------------
   Franja de avisos automáticos (José, 11-11-2026)
   ------------------------------------------------------------ */

function leerCerrados() {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE_CERRADOS) || "{}");
        return datos && typeof datos === "object" ? datos : {};
    } catch {
        return {};
    }
}

function apuntarCerrado(aviso, vigentes) {
    const cerrados = leerCerrados();
    const vigentesIds = new Set(vigentes.map(a => String(a.id)));
    // Lo de avisos que ya no están se olvida solo.
    for (const id of Object.keys(cerrados)) if (!vigentesIds.has(id)) delete cerrados[id];
    cerrados[aviso.id] = huella(aviso);
    try {
        localStorage.setItem(CLAVE_CERRADOS, JSON.stringify(cerrados));
    } catch {
        // Sin almacenamiento: volverá a salir en la próxima visita.
    }
}

export function pintarFranja(avisos, { alCerrar } = {}) {
    asegurarHoja();
    const franja = crear("section", "avisos-franja");
    franja.setAttribute("aria-label", "Avisos");

    for (const aviso of avisos) {
        const caja = crear("div", "aviso-franja");
        caja.appendChild(crear("span", "aviso-franja-etiqueta", "AVISO"));

        const cuerpo = crear("div", "aviso-franja-cuerpo");
        cuerpo.appendChild(crear("strong", "aviso-franja-titulo", aviso.titulo));
        const detalle = crear("div", "aviso-franja-detalle");
        detalle.hidden = true;
        for (const bloque of aviso.bloques || []) if (bloque.texto) pintarTexto(detalle, bloque.texto);
        cuerpo.appendChild(detalle);

        const acciones = crear("div", "aviso-franja-acciones");
        if (detalle.childNodes.length) {
            const mas = crear("button", "aviso-franja-boton", "Detalles");
            mas.type = "button";
            mas.setAttribute("aria-expanded", "false");
            mas.addEventListener("click", () => {
                detalle.hidden = !detalle.hidden;
                mas.setAttribute("aria-expanded", String(!detalle.hidden));
                mas.textContent = detalle.hidden ? "Detalles" : "Menos";
            });
            acciones.appendChild(mas);
        }
        if (aviso.enlace && enlaceNuestro(aviso.enlace)) {
            const ir = crear("a", "aviso-franja-boton", "Ver");
            ir.href = aviso.enlace;
            acciones.appendChild(ir);
        }
        cuerpo.appendChild(acciones);
        caja.appendChild(cuerpo);

        const cerrar = crear("button", "aviso-franja-x", "×");
        cerrar.type = "button";
        cerrar.setAttribute("aria-label", `Cerrar el aviso «${aviso.titulo}»`);
        cerrar.addEventListener("click", () => {
            caja.remove();
            if (alCerrar) alCerrar(aviso);
            if (!franja.querySelector(".aviso-franja")) franja.remove();
        });
        caja.appendChild(cerrar);

        franja.appendChild(caja);
    }
    return franja;
}

function mostrarFranja(automaticos) {
    if (!automaticos.length) return;
    const cerrados = leerCerrados();
    const pendientes = automaticos.filter(a => cerrados[a.id] !== huella(a));
    if (!pendientes.length) return;

    const franja = pintarFranja(pendientes, { alCerrar: aviso => apuntarCerrado(aviso, automaticos) });
    const principal = document.querySelector("main");
    if (principal) principal.prepend(franja);
    else document.body.prepend(franja);
}


export async function mostrarNovedades() {
    let datos;
    try {
        const respuesta = await fetch(`${window.API_BASE || "/api"}/novedades`);
        if (!respuesta.ok) return;
        datos = await respuesta.json();
    } catch {
        return;
    }

    const todas = (datos && datos.novedades) || [];
    mostrarFranja(todas.filter(esAutomatico));

    const novedades = todas.filter(n => !esAutomatico(n));
    if (!novedades.length) return;

    const vistas = leerVistas();
    const pendientes = novedades.filter(n => vistas[n.id] !== huella(n));
    if (!pendientes.length) return;

    abrirVentana(pendientes, { alCerrar: () => marcarVistas(novedades) });
}


// En la portada se lanza sola, sin esperar a las fichas ni a los demás componentes.
if (document.body && document.body.dataset.seccion === "actualidad") {
    mostrarNovedades();
}

/* Fin de fichero: js/novedades.js */
