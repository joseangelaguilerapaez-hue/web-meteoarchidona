/*
 * MeteoArchidona · El Olivar · piezas comunes
 *
 * Lo que comparten los componentes de El Olivar (js/olivar/*.js) y la
 * página: la petición a la API con caché corta, cifras y fechas en
 * español, las pastillas de helada y la hoja de estilos.
 *
 * Datos (docs/olivar.md de api-meteoarchidona), calculados con nuestras
 * dos Davis, El Silo y Los Llanos, por estación:
 *
 *   - frío invernal: horas por debajo de 7,2 °C y unidades de frío de
 *     De Melo-Abreu (2004), temporada del 1 de octubre al 31 de marzo;
 *   - heladas: mínima por debajo de 0 °C, temporada de julio a junio;
 *   - mínimas previstas (Open-Meteo) corregidas con lo que suele fallar
 *     el modelo en cada estación, y avisos de helada.
 *
 * Hoja de estilos: cada componente se asegura de que esté cargada
 * css/olivar-componentes.css, con su gama «Aceite y oro» (José,
 * 9-11-2026), así se ve igual en la página que en un dashboard oscuro.
 */

const HOJA = "/css/olivar-componentes.css?v=20261109-olivar1";

const CACHE_MS = 5 * 60 * 1000;

const ESPERA_MAXIMA_MS = 20000;

export const PAGINA = "/olivar";

export const ESTACIONES = ["EL_SILO", "LOS_LLANOS"];

export const NOMBRES_ESTACION = {
    EL_SILO: "El Silo",
    LOS_LLANOS: "Los Llanos"
};

export const NOMBRES_NIVEL = {
    DEBIL: "Helada débil",
    MODERADA: "Helada moderada",
    FUERTE: "Helada fuerte"
};

export const FUENTE_ESTACIONES = "Estaciones Davis de MeteoArchidona";

export const FUENTE_PREVISION = "Previsión de Open-Meteo corregida por MeteoArchidona";


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

/* data-estacion="EL_SILO", "LOS_LLANOS" o las dos con coma; vacío = las dos. */
export function leerEstaciones(raiz) {
    const texto = (raiz.dataset.estacion || "").toUpperCase();
    const lista = texto.split(",").map(codigo => codigo.trim()).filter(codigo => ESTACIONES.includes(codigo));
    return lista.length ? lista : [...ESTACIONES];
}

/* Una sola estación (la primera de data-estacion; por defecto El Silo). */
export function leerEstacion(raiz) {
    return leerEstaciones(raiz)[0];
}


/* ------------------------------------------------------------
   Cifras y fechas
   ------------------------------------------------------------ */

const formatoEntero = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

const formatoDecimal = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const formatoDia = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", weekday: "short", day: "numeric" });

const formatoFecha = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", day: "numeric", month: "long" });

const formatoFechaCorta = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", day: "numeric", month: "short" });

export const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function entero(valor) {
    if (valor === null || valor === undefined) return "—";
    return formatoEntero.format(valor);
}

export function grados(valor) {
    if (valor === null || valor === undefined) return "—";
    return `${formatoDecimal.format(valor)} °C`;
}

export function horas(valor) {
    if (valor === null || valor === undefined) return "—";
    return `${formatoEntero.format(valor)} h`;
}

export function aFecha(texto) {
    const [anio, mes, dia] = texto.split("-").map(Number);
    return new Date(Date.UTC(anio, mes - 1, dia));
}

/* «lun 10», para las columnas de la previsión. */
export function diaCorto(texto) {
    return formatoDia.format(aFecha(texto));
}

export function fechaLarga(texto) {
    return texto ? formatoFecha.format(aFecha(texto)) : "—";
}

export function fechaCorta(texto) {
    return texto ? formatoFechaCorta.format(aFecha(texto)) : "—";
}

/* Hoy en hora de Madrid, «AAAA-MM-DD». */
export function hoyMadrid() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
}

/* «mañana», «el miércoles 12»… */
export function cuando(texto) {
    const hoy = aFecha(hoyMadrid());
    const dias = Math.round((aFecha(texto) - hoy) / 86400000);
    if (dias === 0) return "hoy";
    if (dias === 1) return "mañana";
    return `el ${formatoDia.format(aFecha(texto))}`;
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
    vaciar(nodo);
    nodo.appendChild(crear("p", error ? "oli-aviso error" : "oli-aviso", texto));
}

export function pastillaNivel(nivel) {
    return crear("span", `oli-nivel nivel-${nivel || "NINGUNO"}`, NOMBRES_NIVEL[nivel] || "Sin helada");
}

export function asegurarHoja() {
    if (document.querySelector('link[href*="css/olivar-componentes.css"]')) {
        return;
    }

    const enlace = document.createElement("link");
    enlace.rel = "stylesheet";
    enlace.href = HOJA;
    document.head.appendChild(enlace);
}

/* Raíz común de todos los componentes de El Olivar. */
export function prepararRaiz(raiz, clase) {
    asegurarHoja();
    raiz.classList.add("oli-componente", clase);
    vaciar(raiz);
}

/* Título opcional (data-titulo="no" lo quita). */
export function titulo(raiz, etiqueta, texto) {
    if (raiz.dataset.titulo === "no") return;
    const cabeza = crear("div");
    cabeza.appendChild(crear("div", "oli-etiqueta", etiqueta));
    cabeza.appendChild(crear("h3", "oli-titulo", texto));
    raiz.appendChild(cabeza);
}

export function pie(raiz, texto) {
    raiz.appendChild(crear("p", "oli-pie", texto));
}


/* Fin de fichero: js/olivar/comun.js */
