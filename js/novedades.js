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
 * Sale cada vez que se entra en la web: una vez por visita. Si en la
 * misma visita se vuelve a la portada desde otra sección, no se repite
 * (sessionStorage, que se borra al cerrar la pestaña o el navegador).
 * Una novedad nueva o cambiada sí vuelve a salir.
 *
 * El texto va como texto: saltos de línea respetados y direcciones
 * convertidas en enlaces; nada de HTML. Las imágenes son siempre
 * nuestras (/assets/...): la API no admite otras y aquí se comprueba
 * otra vez.
 *
 * API: GET /novedades.
 */

const HOJA = "/css/novedades.css?v=20261105-novedades1";
const CLAVE_VISITA = "ma_novedades_vistas";

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

function asegurarHoja() {
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

export function pintarNovedad(novedad) {
    const articulo = crear("article", "novedad");

    const cabeza = crear("header", "novedad-cabeza");
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

    return articulo;
}

/* Huella de lo que hay vigente: si cambia algo, se vuelve a enseñar. */
function huella(novedades) {
    return novedades.map(n => `${n.id}:${n.titulo.length}:${(n.bloques || []).length}`).join("|");
}

function yaVistas(marca) {
    try {
        return sessionStorage.getItem(CLAVE_VISITA) === marca;
    } catch {
        return false;
    }
}

function marcarVistas(marca) {
    try {
        sessionStorage.setItem(CLAVE_VISITA, marca);
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
    ventana.setAttribute("aria-label", novedades.length > 1 ? "Novedades de MeteoArchidona" : novedades[0].titulo);

    const barra = crear("div", "novedades-barra");
    barra.appendChild(crear("span", "novedades-etiqueta", novedades.length > 1 ? "NOVEDADES" : "NOVEDAD"));
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

export async function mostrarNovedades() {
    let datos;
    try {
        const respuesta = await fetch(`${window.API_BASE || "/api"}/novedades`);
        if (!respuesta.ok) return;
        datos = await respuesta.json();
    } catch {
        return;
    }

    const novedades = (datos && datos.novedades) || [];
    if (!novedades.length) return;

    const marca = huella(novedades);
    if (yaVistas(marca)) return;

    abrirVentana(novedades, { alCerrar: () => marcarVistas(marca) });
}


// En la portada se lanza sola, sin esperar a las fichas ni a los demás componentes.
if (document.body && document.body.dataset.seccion === "actualidad") {
    mostrarNovedades();
}

/* Fin de fichero: js/novedades.js */
