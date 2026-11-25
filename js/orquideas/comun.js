/*
 * MeteoArchidona · Orquídeas · piezas comunes
 *
 * Lo que comparten los componentes de Orquídeas (js/orquideas/*.js) y su
 * página: la petición a la API con la cookie de sesión (la sección es
 * privada: administradores y amigos de las orquídeas, José, 25-11-2026),
 * nombres de los meses, fotos con su autor y su licencia, la escala de
 * colores del mapa, Leaflet bajo demanda y la hoja de estilos.
 *
 * Datos de GBIF (docs/orquideas.md de api-meteoarchidona). Nunca llega la
 * posición de una orquídea: solo cuadrículas UTM de 10 km.
 */

const HOJA = "/css/orquideas-componentes.css?v=20261125-orquideas1";

const LEAFLET = "/js/vendor/leaflet-1.9.4.js";

const CACHE_MS = 5 * 60 * 1000;

const ESPERA_MAXIMA_MS = 20000;

export const PAGINA = "/orquideas";

export const RADIOS = [25, 50, 100];

export const RADIO_DEFECTO = 50;

export const EVENTO_ESPECIE = "orquideas:especie";

export const MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

export const INICIALES = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/* Escala del mapa por número de especies en la cuadrícula. */
export const TRAMOS_ESPECIES = [
    { desde: 1, color: "#f3d6e8", texto: "1" },
    { desde: 2, color: "#e7a9cc", texto: "2–3" },
    { desde: 4, color: "#d66fa8", texto: "4–7" },
    { desde: 8, color: "#a8468e", texto: "8–15" },
    { desde: 16, color: "#5e2357", texto: "16 o más" }
];


/* ------------------------------------------------------------
   Datos
   ------------------------------------------------------------ */

const cache = new Map();

function base() {
    return window.API_BASE || "/api";
}

async function pedirSinCache(ruta) {
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), ESPERA_MAXIMA_MS);

    try {
        const respuesta = await fetch(`${base()}${ruta}`, {
            signal: control.signal,
            credentials: "same-origin",
            cache: "no-store"
        });

        if (!respuesta.ok) {
            const error = new Error(`HTTP ${respuesta.status}`);
            error.estado = respuesta.status;
            throw error;
        }

        return await respuesta.json();
    } finally {
        clearTimeout(reloj);
    }
}

/* Dos componentes que piden lo mismo en una página comparten la petición. */
export function pedir(ruta) {
    const guardado = cache.get(ruta);

    if (guardado && Date.now() - guardado.cuando < CACHE_MS) {
        return guardado.promesa;
    }

    const promesa = pedirSinCache(ruta);
    cache.set(ruta, { cuando: Date.now(), promesa });
    promesa.catch(() => cache.delete(ruta));
    return promesa;
}

export function leerRadio(raiz) {
    const valor = Number(raiz.dataset.radio);
    return RADIOS.includes(valor) ? valor : RADIO_DEFECTO;
}

/* Texto para un fallo: la sección es privada, así que 401 y 403 tienen el suyo. */
export function textoError(error) {
    if (error && error.estado === 401) {
        return "La sección Orquídeas es privada: inicia sesión con tu cuenta.";
    }
    if (error && error.estado === 403) {
        return "La sección Orquídeas es privada: solo para los amigos de las orquídeas.";
    }
    return "No se han podido cargar los datos de las orquídeas. Prueba dentro de un rato.";
}


/* ------------------------------------------------------------
   Nodos
   ------------------------------------------------------------ */

export function crear(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
}

export function vaciar(nodo) {
    while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
}

export function aviso(nodo, texto, error = false) {
    vaciar(nodo);
    nodo.appendChild(crear("p", error ? "orq-aviso error" : "orq-aviso", texto));
}

export function asegurarHoja() {
    if (document.querySelector('link[href*="css/orquideas-componentes.css"]')) {
        return;
    }

    const enlace = document.createElement("link");
    enlace.rel = "stylesheet";
    enlace.href = HOJA;
    document.head.appendChild(enlace);
}

/* Raíz común de todos los componentes de Orquídeas. */
export function prepararRaiz(raiz, clase) {
    asegurarHoja();
    raiz.classList.add("orq-componente", clase);
    vaciar(raiz);
}

/* Título opcional (data-titulo="no" lo quita). */
export function titulo(raiz, etiqueta, texto) {
    if (raiz.dataset.titulo === "no") return;
    const cabeza = crear("div", "orq-cabeza");
    cabeza.appendChild(crear("div", "orq-etiqueta", etiqueta));
    cabeza.appendChild(crear("h3", "orq-titulo", texto));
    raiz.appendChild(cabeza);
}

export function pie(raiz, texto) {
    raiz.appendChild(crear("p", "orq-pie", texto));
}


/* ------------------------------------------------------------
   Cifras, fechas y nombres
   ------------------------------------------------------------ */

const FORMATO = new Intl.NumberFormat("es-ES");

export function numero(valor) {
    return Number.isFinite(valor) ? FORMATO.format(valor) : "—";
}

export function fechaCorta(texto) {
    if (!texto) return "—";
    const [anio, mes, dia] = texto.split("-").map(Number);
    return `${dia} de ${MESES[mes - 1]} de ${anio}`;
}

export function mesesTexto(meses) {
    if (!meses || !meses.length) return "Sin datos de floración";
    // Meses seguidos en tramos: marzo a mayo.
    const tramos = [];
    let inicio = meses[0];
    let anterior = meses[0];
    for (const mes of meses.slice(1).concat([null])) {
        if (mes === anterior + 1) {
            anterior = mes;
            continue;
        }
        tramos.push(inicio === anterior ? MESES[inicio - 1] : `${MESES[inicio - 1]} a ${MESES[anterior - 1]}`);
        inicio = mes;
        anterior = mes;
    }
    const texto = tramos.join(", ");
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/* Nombre científico en cursiva y, debajo o al lado, el común. */
export function nombreEspecie(especie, clase = "orq-nombre") {
    const caja = crear("div", clase);
    caja.appendChild(crear("em", "orq-cientifico", especie.nombre_cientifico));
    if (especie.nombre_comun) {
        caja.appendChild(crear("span", "orq-comun", especie.nombre_comun));
    }
    return caja;
}

export function colorEspecies(cuantas) {
    let color = TRAMOS_ESPECIES[0].color;
    for (const tramo of TRAMOS_ESPECIES) {
        if (cuantas >= tramo.desde) color = tramo.color;
    }
    return color;
}


/* ------------------------------------------------------------
   Fotos
   ------------------------------------------------------------ */

/* iNaturalist sirve la foto en varios tamaños: «original» pesa mucho. */
export function urlFoto(url, tamano = "medium") {
    if (!url) return url;
    if (/inaturalist/i.test(url) && /\/original\./.test(url)) {
        return url.replace("/original.", `/${tamano}.`);
    }
    return url;
}

export function textoAutoria(foto) {
    const partes = [];
    partes.push(foto.autor ? `© ${foto.autor}` : "Autor sin indicar");
    if (foto.licencia) partes.push(foto.licencia);
    return partes.join(" · ");
}

/*
 * Foto con su autor y su licencia siempre a la vista. Las de licencia
 * «sin obras derivadas» (ND) van enteras: sin recortar (José, 25-11-2026).
 */
export function figuraFoto(foto, { tamano = "medium", clase = "orq-foto" } = {}) {
    const figura = crear("figure", clase);
    if (foto.sin_modificar) figura.classList.add("orq-foto-entera");

    const imagen = document.createElement("img");
    imagen.src = urlFoto(foto.url, tamano);
    imagen.alt = "";
    imagen.loading = "lazy";
    imagen.decoding = "async";
    imagen.referrerPolicy = "no-referrer";
    imagen.addEventListener("error", () => figura.classList.add("orq-foto-rota"));
    figura.appendChild(imagen);

    const pieFoto = crear("figcaption", "orq-foto-autor");
    const enlace = crear("a", null, textoAutoria(foto));
    enlace.href = foto.enlace;
    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer";
    enlace.title = "Ver el registro en GBIF";
    pieFoto.appendChild(enlace);
    figura.appendChild(pieFoto);
    return figura;
}

export function sinFoto(clase = "orq-foto orq-foto-vacia") {
    const figura = crear("figure", clase);
    figura.appendChild(crear("span", "orq-foto-vacia-texto", "Sin foto"));
    return figura;
}


/* ------------------------------------------------------------
   Calendario de floración (doce casillas)
   ------------------------------------------------------------ */

export function calendario(meses, marcado = null) {
    const fila = crear("div", "orq-calendario");
    fila.setAttribute("aria-label", mesesTexto(meses));
    for (let mes = 1; mes <= 12; mes += 1) {
        const casilla = crear("span", "orq-calendario-mes", INICIALES[mes - 1]);
        casilla.title = MESES[mes - 1];
        if (meses.includes(mes)) casilla.classList.add("en-flor");
        if (mes === marcado) casilla.classList.add("ahora");
        fila.appendChild(casilla);
    }
    return fila;
}


/* ------------------------------------------------------------
   Elegir una especie (catálogo → ficha y mapa)
   ------------------------------------------------------------ */

export function elegirEspecie(id) {
    const direccion = new URL(location.href);
    direccion.searchParams.set("especie", String(id));
    history.replaceState(null, "", direccion);
    document.dispatchEvent(new CustomEvent(EVENTO_ESPECIE, { detail: { id } }));
}

export function especieDeLaDireccion() {
    const pedida = new URLSearchParams(location.search).get("especie");
    return pedida && /^\d{1,10}$/.test(pedida) ? Number(pedida) : null;
}


/* ------------------------------------------------------------
   Leaflet
   ------------------------------------------------------------ */

let cargaLeaflet = null;

export function cargarLeaflet() {
    if (window.L) return Promise.resolve(window.L);

    if (!cargaLeaflet) {
        cargaLeaflet = new Promise((resolver, rechazar) => {
            const guion = document.createElement("script");
            guion.src = LEAFLET;
            guion.onload = () => resolver(window.L);
            guion.onerror = () => {
                cargaLeaflet = null;
                rechazar(new Error("No se ha podido cargar Leaflet"));
            };
            document.head.appendChild(guion);
        });
    }

    return cargaLeaflet;
}


/* Fin de fichero: js/orquideas/comun.js */
