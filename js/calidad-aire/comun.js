/*
 * MeteoArchidona · Calidad del aire · piezas comunes
 *
 * Lo que comparten los componentes de calidad del aire y calima
 * (js/calidad-aire/*.js) y la página Calidad del aire: la petición a la
 * API con caché corta, cifras y horas en español (hora de Madrid), las
 * pastillas de categoría y de calima, y la hoja de estilos.
 *
 * Fuentes (docs/calidad-aire.md de api-meteoarchidona):
 *
 *   - Previsión del modelo CAMS (Copernicus) vía Open-Meteo para
 *     Archidona, hora a hora: el modelo europeo (11 km, 4 días) manda; el
 *     global (45 km, 5 días) da el espesor óptico y el quinto día. La API
 *     la guarda a las 07:37 y a las 13:37.
 *   - Índice: las seis categorías del Índice Nacional de Calidad del
 *     Aire, calculadas por la API (partículas con la media de 24 horas).
 *   - Calima: polvo medio del día; leve desde 20 µg/m³, moderada 50,
 *     fuerte 100 y muy fuerte 200 (José, 10-11-2026).
 *
 * Hoja de estilos: cada componente se asegura de que esté cargada
 * css/calidad-aire-componentes.css, con su gama «Arena y cielo» (José,
 * 10-11-2026), así se ve igual en la página que en un dashboard oscuro.
 */

const HOJA = "/css/calidad-aire-componentes.css?v=20261111-aire1";

const CACHE_MS = 10 * 60 * 1000;

const ESPERA_MAXIMA_MS = 20000;

export const PAGINA = "/calidad-aire";

export const LOCALIDAD_DEFECTO = "29017";

export const FUENTE_MODELO = "Modelo CAMS (Copernicus) vía Open-Meteo";


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

export function leerLocalidad(raiz) {
    return encodeURIComponent(raiz.dataset.localidad || LOCALIDAD_DEFECTO);
}


/* ------------------------------------------------------------
   Categorías del índice y niveles de calima
   ------------------------------------------------------------ */

export const CATEGORIAS = [
    "BUENA",
    "RAZONABLEMENTE_BUENA",
    "REGULAR",
    "DESFAVORABLE",
    "MUY_DESFAVORABLE",
    "EXTREMADAMENTE_DESFAVORABLE"
];

export const NOMBRES_CATEGORIA = {
    BUENA: "Buena",
    RAZONABLEMENTE_BUENA: "Razonablemente buena",
    REGULAR: "Regular",
    DESFAVORABLE: "Desfavorable",
    MUY_DESFAVORABLE: "Muy desfavorable",
    EXTREMADAMENTE_DESFAVORABLE: "Extremadamente desfavorable"
};

/* Para las casillas pequeñas. */
export const NOMBRES_CATEGORIA_CORTOS = {
    BUENA: "Buena",
    RAZONABLEMENTE_BUENA: "Razonable",
    REGULAR: "Regular",
    DESFAVORABLE: "Desfavorable",
    MUY_DESFAVORABLE: "Muy desfav.",
    EXTREMADAMENTE_DESFAVORABLE: "Extrema"
};

export const NIVELES_CALIMA = ["SIN_CALIMA", "LEVE", "MODERADA", "FUERTE", "MUY_FUERTE"];

export const NOMBRES_CALIMA = {
    SIN_CALIMA: "Sin calima",
    LEVE: "Calima leve",
    MODERADA: "Calima moderada",
    FUERTE: "Calima fuerte",
    MUY_FUERTE: "Calima muy fuerte"
};

export const NOMBRES_CALIMA_CORTOS = {
    SIN_CALIMA: "Sin calima",
    LEVE: "Leve",
    MODERADA: "Moderada",
    FUERTE: "Fuerte",
    MUY_FUERTE: "Muy fuerte"
};

export const CONTAMINANTES_INDICE = ["PM10", "PM25", "O3", "NO2"];

export const SIMBOLOS = {
    PM10: "PM10",
    PM25: "PM2,5",
    O3: "O₃",
    NO2: "NO₂",
    POLVO: "Polvo",
    AOD: "AOD"
};

export function pastillaCategoria(categoria, corta = false) {
    const nombres = corta ? NOMBRES_CATEGORIA_CORTOS : NOMBRES_CATEGORIA;
    return crear("span", `air-pastilla cat-${categoria || "NINGUNA"}`, nombres[categoria] || "Sin dato");
}

export function pastillaCalima(nivel, corta = false) {
    const nombres = corta ? NOMBRES_CALIMA_CORTOS : NOMBRES_CALIMA;
    return crear("span", `air-pastilla calima-${nivel || "NINGUNA"}`, nombres[nivel] || "Sin dato");
}


/* ------------------------------------------------------------
   Cifras, fechas y horas (hora de Madrid)
   ------------------------------------------------------------ */

const formatoEntero = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

const formatoDecimal = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatoDia = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", weekday: "short", day: "numeric" });

const formatoFecha = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

const formatoFechaCorta = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", day: "numeric", month: "short" });

const formatoHora = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" });

const formatoHoraSola = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "numeric" });

const formatoDiaMadrid = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "short", day: "numeric" });

const formatoClave = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" });

/* «35 µg/m³». */
export function microgramos(valor, unidad = true) {
    if (valor === null || valor === undefined) return "—";
    return `${formatoEntero.format(valor)}${unidad ? " µg/m³" : ""}`;
}

export function espesor(valor) {
    if (valor === null || valor === undefined) return "—";
    return formatoDecimal.format(valor);
}

function aFecha(texto) {
    const [anio, mes, dia] = texto.split("-").map(Number);
    return new Date(Date.UTC(anio, mes - 1, dia));
}

/* «mié 11», para las columnas. */
export function diaCorto(texto) {
    return formatoDia.format(aFecha(texto));
}

export function fechaLarga(texto) {
    return texto ? formatoFecha.format(aFecha(texto)) : "—";
}

export function fechaCorta(texto) {
    return texto ? formatoFechaCorta.format(aFecha(texto)) : "—";
}

/* Hora de Madrid de un instante con zona: «14:00». */
export function hora(texto) {
    return texto ? formatoHora.format(new Date(texto)) : "—";
}

export function horaSola(texto) {
    return formatoHoraSola.format(new Date(texto));
}

export function diaDeHora(texto) {
    return formatoDiaMadrid.format(new Date(texto));
}

/* «2026-11-11» del día de Madrid de un instante. */
export function claveDia(texto) {
    return formatoClave.format(new Date(texto));
}

/* Hora de Madrid de la última actualización. */
export function horaActualizacion(texto) {
    if (!texto) return "";
    return new Intl.DateTimeFormat("es-ES", {
        timeZone: "Europe/Madrid",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(texto));
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

export function crearSvg(etiqueta, atributos = {}) {
    const nodo = document.createElementNS("http://www.w3.org/2000/svg", etiqueta);
    for (const [nombre, valor] of Object.entries(atributos)) {
        nodo.setAttribute(nombre, String(valor));
    }
    return nodo;
}

export function vaciar(nodo) {
    while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
}

export function aviso(nodo, texto, error = false) {
    vaciar(nodo);
    nodo.appendChild(crear("p", error ? "air-aviso error" : "air-aviso", texto));
}

export function asegurarHoja() {
    if (document.querySelector('link[href*="css/calidad-aire-componentes.css"]')) {
        return;
    }

    const enlace = document.createElement("link");
    enlace.rel = "stylesheet";
    enlace.href = HOJA;
    document.head.appendChild(enlace);
}

/* Raíz común de todos los componentes de calidad del aire. */
export function prepararRaiz(raiz, clase) {
    asegurarHoja();
    raiz.classList.add("air-componente", clase);
    vaciar(raiz);
}

/* Título opcional (data-titulo="no" lo quita). */
export function titulo(raiz, etiqueta, texto) {
    if (raiz.dataset.titulo === "no") return;
    const cabeza = crear("div");
    cabeza.appendChild(crear("div", "air-etiqueta", etiqueta));
    cabeza.appendChild(crear("h3", "air-titulo", texto));
    raiz.appendChild(cabeza);
}

export function pie(raiz, texto) {
    raiz.appendChild(crear("p", "air-pie", texto));
}

/* Mensaje de error de lectura, igual en todos. */
export function avisoError(raiz, error, que) {
    aviso(raiz, error && error.estado === 404
        ? "No hay datos de calidad del aire para esa localidad."
        : `No se ha podido leer ${que}. Se puede volver a intentar más tarde.`, true);
}


/* Fin de fichero: js/calidad-aire/comun.js */
