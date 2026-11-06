/*
 * MeteoArchidona · Polen · piezas comunes
 *
 * Lo que comparten los componentes de polen (js/polen/*.js) y la página
 * Polen: la petición a la API con caché corta, cifras y fechas en
 * español, las pastillas de nivel y la hoja de estilos.
 *
 * Fuentes (docs/polen.md de api-meteoarchidona):
 *
 *   - Previsión del modelo CAMS (Copernicus) vía Open-Meteo para
 *     Archidona: olivo, gramíneas y artemisa, día a día. La API la
 *     guarda a las 07:07 y a las 13:07.
 *   - Recuentos semanales medidos por la Universidad de Granada
 *     (UCBA-UGR), 13 tipos; se cargan los lunes y los jueves.
 *
 * Niveles: NULO, BAJO, MEDIO, ALTO y EXTREMO, con los umbrales de la UGR
 * para cada tipo. La API ya los da calculados.
 *
 * Hoja de estilos: cada componente se asegura de que esté cargada
 * css/polen-componentes.css, con su paleta de campo (verdes y marrones;
 * José, 6-11-2026), así se ve igual en la página que en un dashboard
 * oscuro.
 */

const HOJA = "/css/polen-componentes.css?v=20261106-polen1";

const CACHE_MS = 10 * 60 * 1000;

const ESPERA_MAXIMA_MS = 20000;

export const PAGINA = "/polen";

export const ESTACION_DEFECTO = "GRANADA";

export const TIPO_DEFECTO = "OLIVO";


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

export function leerEstacion(raiz) {
    return (raiz.dataset.estacion || ESTACION_DEFECTO).toUpperCase();
}


/* ------------------------------------------------------------
   Niveles
   ------------------------------------------------------------ */

export const NIVELES = ["NULO", "BAJO", "MEDIO", "ALTO", "EXTREMO"];

export const NOMBRES_NIVEL = {
    NULO: "Nulo",
    BAJO: "Bajo",
    MEDIO: "Medio",
    ALTO: "Alto",
    EXTREMO: "Extremo"
};

/* Mismo criterio que dominio/polen.py de la API: los umbrales son el
 * techo de cada nivel. Para pintar el calendario con la media de otros
 * años, que la API no clasifica. */
export function nivelDe(valor, umbrales) {
    if (valor === null || valor === undefined || !umbrales) return null;
    if (valor < 1) return "NULO";
    if (valor <= umbrales.bajo) return "BAJO";
    if (valor <= umbrales.medio) return "MEDIO";
    if (valor <= umbrales.alto) return "ALTO";
    return "EXTREMO";
}

export function pastillaNivel(nivel) {
    return crear("span", `pol-nivel nivel-${nivel || "NINGUNO"}`, NOMBRES_NIVEL[nivel] || "—");
}


/* ------------------------------------------------------------
   Cifras y fechas
   ------------------------------------------------------------ */

const formatoEntero = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

const formatoDia = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", weekday: "short", day: "numeric" });

const formatoFecha = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", day: "numeric", month: "long" });

const formatoFechaCorta = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", day: "numeric", month: "short" });

export const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/* Granos de polen por m³: «1.062 g/m³». */
export function granos(valor, unidad = true) {
    if (valor === null || valor === undefined) return "—";
    return `${formatoEntero.format(valor)}${unidad ? " g/m³" : ""}`;
}

function aFecha(texto) {
    const [anio, mes, dia] = texto.split("-").map(Number);
    return new Date(Date.UTC(anio, mes - 1, dia));
}

/* «vie 6», para las columnas de la previsión. */
export function diaCorto(texto) {
    return formatoDia.format(aFecha(texto));
}

export function fechaLarga(texto) {
    return texto ? formatoFecha.format(aFecha(texto)) : "—";
}

/* La UGR numera las semanas del año del 1 al 53 y no da fechas: se
 * toma el día central aproximado de la semana. */
export function centroSemana(anio, semana) {
    return new Date(Date.UTC(anio, 0, 1 + (semana - 1) * 7 + 3));
}

export function textoSemana(anio, semana) {
    return `semana ${semana} · hacia el ${formatoFechaCorta.format(centroSemana(anio, semana))}`;
}

/* Hora de Madrid de la última actualización. */
export function horaActualizacion(texto) {
    if (!texto) return "";
    const fecha = new Date(texto);
    return new Intl.DateTimeFormat("es-ES", {
        timeZone: "Europe/Madrid",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    }).format(fecha);
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
    nodo.appendChild(crear("p", error ? "pol-aviso error" : "pol-aviso", texto));
}

export function asegurarHoja() {
    if (document.querySelector('link[href*="css/polen-componentes.css"]')) {
        return;
    }

    const enlace = document.createElement("link");
    enlace.rel = "stylesheet";
    enlace.href = HOJA;
    document.head.appendChild(enlace);
}

/* Raíz común de todos los componentes de polen. */
export function prepararRaiz(raiz, clase) {
    asegurarHoja();
    raiz.classList.add("pol-componente", clase);
    vaciar(raiz);
}

/* Título opcional (data-titulo="no" lo quita). */
export function titulo(raiz, etiqueta, texto) {
    if (raiz.dataset.titulo === "no") return;
    const cabeza = crear("div");
    cabeza.appendChild(crear("div", "pol-etiqueta", etiqueta));
    cabeza.appendChild(crear("h3", "pol-titulo", texto));
    raiz.appendChild(cabeza);
}

export function pie(raiz, texto) {
    raiz.appendChild(crear("p", "pol-pie", texto));
}

export const FUENTE_MODELO = "Modelo CAMS (Copernicus) vía Open-Meteo";

export const FUENTE_UGR = "Universidad de Granada (UCBA-UGR)";


/* Fin de fichero: js/polen/comun.js */
