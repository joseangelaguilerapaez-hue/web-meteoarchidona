/*
 * MeteoArchidona · Climatología · piezas comunes
 *
 * Lo que comparten los componentes de Climatología (js/climatologia/*.js)
 * y la página: la petición a la API con caché, la lista de pueblos y su
 * selector, cifras en español, la cita a Copernicus y la hoja de estilos.
 *
 * Datos (docs/climatologia.md de api-meteoarchidona): reconstrucción
 * histórica del clima de los pueblos de la comarca Nororiental de Málaga
 * y Antequera desde 1940, con el reanálisis ERA5 de Copernicus corregido
 * con la rejilla ROCIO de AEMET y con nuestras estaciones. Nunca son datos
 * ni récords oficiales.
 *
 * Hoja de estilos: cada componente se asegura de que esté cargada
 * css/climatologia-componentes.css, con su gama «Papel de archivo» (José,
 * 13-11-2026), así se ve igual en la página que en un dashboard oscuro.
 */

const HOJA = "/css/climatologia-componentes.css?v=20261113-clima1";

const CACHE_MS = 30 * 60 * 1000;

const ESPERA_MAXIMA_MS = 20000;

export const PAGINA = "/climatologia";

export const PUNTO_POR_DEFECTO = "ARCHIDONA";

export const CITA =
    "Generado con información del Servicio de Cambio Climático de Copernicus (C3S). " +
    "Datos vía Open-Meteo. Corrección local de MeteoArchidona.";

export const AVISO =
    "Reconstrucción histórica a partir de un reanálisis, corregida con estaciones. No son datos ni récords oficiales.";

export const NOMBRES_FIABILIDAD = {
    ALTA: "Alta",
    MEDIA: "Media",
    BAJA: "Baja"
};

export const EXPLICACION_FIABILIDAD = {
    ALTA: "corregida con una estación propia y con la rejilla de AEMET",
    MEDIA: "corregida con una sola referencia (la rejilla de AEMET o una estación)",
    BAJA: "solo ajustada a la altura del pueblo"
};

export const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export const MESES_LARGOS = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
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
        const respuesta = await fetch(`${base()}${ruta}`, { signal: control.signal });

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

export function pedirPuntos() {
    return pedir("/climatologia/puntos");
}

/* data-punto="ARCHIDONA"…; por defecto, Archidona. */
export function leerPunto(raiz) {
    return (raiz.dataset.punto || PUNTO_POR_DEFECTO).trim().toUpperCase();
}


/* ------------------------------------------------------------
   Cifras
   ------------------------------------------------------------ */

const formatoEntero = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

const formatoDecimal = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const formatoFecha = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });

export function entero(valor) {
    if (valor === null || valor === undefined) return "—";
    return formatoEntero.format(valor);
}

export function decimal(valor) {
    if (valor === null || valor === undefined) return "—";
    return formatoDecimal.format(valor);
}

export function grados(valor) {
    if (valor === null || valor === undefined) return "—";
    return `${formatoDecimal.format(valor)} °C`;
}

export function milimetros(valor) {
    if (valor === null || valor === undefined) return "—";
    return `${formatoEntero.format(valor)} mm`;
}

export function fechaLarga(texto) {
    if (!texto) return "—";
    const [anio, mes, dia] = texto.split("-").map(Number);
    return formatoFecha.format(new Date(Date.UTC(anio, mes - 1, dia)));
}


/* ------------------------------------------------------------
   DOM
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
    nodo.appendChild(crear("p", error ? "cli-aviso error" : "cli-aviso", texto));
}

export function asegurarHoja() {
    if (document.querySelector('link[href*="css/climatologia-componentes.css"]')) {
        return;
    }

    const enlace = document.createElement("link");
    enlace.rel = "stylesheet";
    enlace.href = HOJA;
    document.head.appendChild(enlace);
}

/* Raíz común de todos los componentes de Climatología. */
export function prepararRaiz(raiz, clase) {
    asegurarHoja();
    raiz.classList.add("cli-componente", clase);
    vaciar(raiz);
}

/* Título opcional (data-titulo="no" lo quita). */
export function titulo(raiz, etiqueta, texto) {
    if (raiz.dataset.titulo === "no") return;
    const cabeza = crear("div");
    cabeza.appendChild(crear("div", "cli-etiqueta", etiqueta));
    cabeza.appendChild(crear("h3", "cli-titulo", texto));
    raiz.appendChild(cabeza);
}

/* Cita a Copernicus y aviso de reconstrucción: van siempre. */
export function pie(raiz, extra) {
    const nodo = crear("p", "cli-pie");
    if (extra) {
        nodo.appendChild(document.createTextNode(`${extra} · `));
    }
    nodo.appendChild(document.createTextNode(`${AVISO} ${CITA}`));
    raiz.appendChild(nodo);
}

/*
 * Selector de pueblo (salvo data-selector="no"). Al cambiar, guarda el
 * pueblo en data-punto y vuelve a montar el componente con `montar`.
 */
export async function selectorPunto(raiz, montar) {
    if (raiz.dataset.selector === "no") return;

    let puntos = [];
    try {
        puntos = await pedirPuntos();
    } catch {
        return;
    }
    if (!puntos.length) return;

    const controles = crear("div", "cli-controles");
    const etiqueta = crear("label", null, "Pueblo");
    const selector = crear("select");
    for (const punto of puntos) {
        selector.appendChild(new Option(punto.nombre, punto.codigo));
    }
    selector.value = leerPunto(raiz);
    selector.addEventListener("change", () => {
        raiz.dataset.punto = selector.value;
        montar(raiz);
    });
    etiqueta.appendChild(selector);
    controles.appendChild(etiqueta);
    raiz.appendChild(controles);
}

export const NS = "http://www.w3.org/2000/svg";

export function svg(etiqueta, atributos = {}, clase) {
    const nodo = document.createElementNS(NS, etiqueta);
    for (const [nombre, valor] of Object.entries(atributos)) {
        nodo.setAttribute(nombre, valor);
    }
    if (clase) nodo.setAttribute("class", clase);
    return nodo;
}

/* Error de la API: 404 de un pueblo, o la sección sin datos todavía. */
export function textoError(error) {
    if (error && error.estado === 404) return "No hay datos de ese pueblo.";
    return "No se han podido leer los datos del clima. Prueba dentro de un rato.";
}


/* Fin de fichero: js/climatologia/comun.js */
