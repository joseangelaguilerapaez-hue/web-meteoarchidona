/*
 * MeteoArchidona · Sol · piezas comunes
 *
 * Lo que comparten los componentes del Sol (js/sol/*.js) y la página
 * Sol: direcciones de la NOAA, horas en hora de Madrid, niveles de las
 * escalas, la petición con caché corta y el refresco periódico.
 *
 * Caché corta: si en un mismo dashboard hay dos componentes que leen
 * el mismo fichero de la NOAA (el Kp, por ejemplo), se pide una sola
 * vez por minuto.
 *
 * Hoja de estilos: cada componente se asegura de que esté cargada
 * css/sol-componentes.css, así se puede poner en cualquier página sin
 * acordarse de enlazarla.
 */

export const NOAA = "https://services.swpc.noaa.gov";

export const FUENTES = {
    escalas: `${NOAA}/products/noaa-scales.json`,
    alertas: `${NOAA}/products/alerts.json`,
    kp: `${NOAA}/products/noaa-planetary-k-index.json`,
    kpPrevision: `${NOAA}/products/noaa-planetary-k-index-forecast.json`,
    flujo: `${NOAA}/products/10cm-flux-30-day.json`,
    viento: `${NOAA}/products/summary/solar-wind-speed.json`,
    campo: `${NOAA}/products/summary/solar-wind-mag-field.json`,
    rayosX: `${NOAA}/json/goes/primary/xray-flares-latest.json`,
    fulguraciones: `${NOAA}/json/goes/primary/xray-flares-7-day.json`
};

/* Datos cada 5 minutos e imágenes cada 15: lo que se renuevan en origen. */
export const DATOS_CADA_MS = 5 * 60 * 1000;
export const IMAGENES_CADA_MS = 15 * 60 * 1000;

const ESPERA_MAXIMA_MS = 20000;
const CACHE_MS = 60 * 1000;

const HOJA = "/css/sol-componentes.css?v=20261104-componentes1";

const ZONA = "Europe/Madrid";


/* ------------------------------------------------------------
   Fechas, siempre en hora de Madrid
   ------------------------------------------------------------ */

const formatoFechaHora = new Intl.DateTimeFormat("es-ES", {
    timeZone: ZONA,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
});

const formatoHora = new Intl.DateTimeFormat("es-ES", {
    timeZone: ZONA,
    hour: "2-digit",
    minute: "2-digit"
});

export const formatoDia = new Intl.DateTimeFormat("es-ES", {
    timeZone: ZONA,
    weekday: "short",
    day: "numeric"
});

/* Los días de la previsión de la NOAA son días UTC. */
export const formatoDiaCorto = new Intl.DateTimeFormat("es-ES", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short"
});

export const formatoHoraMadrid = new Intl.DateTimeFormat("es-ES", {
    timeZone: ZONA,
    hour: "numeric",
    hourCycle: "h23"
});

/* La NOAA mezcla «2026-11-02 12:03:53.987», «2026-11-02T00:00:00» y
 * «2026-11-02T22:10:00Z». Todo es UTC. */
export function fechaUTC(texto) {
    if (!texto) return null;
    let limpio = String(texto).trim().replace(" ", "T");
    if (!/[zZ]|[+-]\d\d:?\d\d$/.test(limpio)) limpio += "Z";
    const fecha = new Date(limpio);
    return isNaN(fecha) ? null : fecha;
}

export function fechaHora(fecha) {
    return fecha ? formatoFechaHora.format(fecha) : "—";
}

export function hora(fecha) {
    return fecha ? formatoHora.format(fecha) : "—";
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

export function aviso(nodo, texto) {
    vaciar(nodo);
    nodo.appendChild(crear("p", "sol-aviso", texto));
}

export function asegurarHoja() {
    if (document.querySelector('link[href*="/css/sol-componentes.css"], link[href*="css/sol-componentes.css"]')) {
        return;
    }
    const enlace = document.createElement("link");
    enlace.rel = "stylesheet";
    enlace.href = HOJA;
    document.head.appendChild(enlace);
}

/* Raíz común de todos los componentes del Sol: clase para los
 * colores de los niveles y para las consultas por tamaño del hueco. */
export function prepararRaiz(raiz, clase) {
    asegurarHoja();
    raiz.classList.add("sol-componente", clase);
    vaciar(raiz);
}

/* Pie pequeño con la hora de la última lectura. */
export function ponerPie(raiz, correcto) {
    let pie = raiz.querySelector(":scope > .sol-pie-componente");
    if (!pie) {
        pie = crear("p", "sol-pie-componente");
        raiz.appendChild(pie);
    }
    pie.textContent = correcto
        ? `NOAA · actualizado a las ${hora(new Date())}`
        : "No se ha podido contactar con la NOAA; se reintenta en 5 minutos.";
    pie.classList.toggle("error", !correcto);
}


/* ------------------------------------------------------------
   Datos
   ------------------------------------------------------------ */

const cache = new Map();

async function pedirSinCache(url) {
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), ESPERA_MAXIMA_MS);
    try {
        const respuesta = await fetch(url, {
            cache: "no-store",
            signal: control.signal
        });
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        return await respuesta.json();
    } finally {
        clearTimeout(reloj);
    }
}

export function pedir(url) {
    const guardado = cache.get(url);
    if (guardado && Date.now() - guardado.cuando < CACHE_MS) {
        return guardado.promesa;
    }
    const promesa = pedirSinCache(url);
    cache.set(url, { cuando: Date.now(), promesa });
    promesa.catch(() => cache.delete(url));
    return promesa;
}

/* Algunos productos de la NOAA eran tablas (la primera fila, los
 * nombres de las columnas) y pasaron a lista de objetos. Se aceptan
 * las dos formas. */
export function comoObjetos(datos) {
    if (!Array.isArray(datos) || datos.length === 0) return [];
    if (!Array.isArray(datos[0])) return datos;
    const columnas = datos[0];
    return datos.slice(1).map(fila => {
        const objeto = {};
        columnas.forEach((columna, i) => { objeto[columna] = fila[i]; });
        return objeto;
    });
}

export function numero(valor) {
    const n = parseFloat(valor);
    return isFinite(n) ? n : null;
}


/* ------------------------------------------------------------
   Niveles (nivel-0 ... nivel-5 y nivel-activo en la hoja)
   ------------------------------------------------------------ */

export function nivelKp(kp) {
    if (kp === null) return 0;
    if (kp >= 9) return 5;
    if (kp >= 8) return 4;
    if (kp >= 7) return 3;
    if (kp >= 6) return 2;
    if (kp >= 5) return 1;
    return 0;
}

export function textoKp(kp) {
    if (kp === null) return "Sin dato";
    if (kp >= 5) return `Tormenta G${Math.min(5, Math.floor(kp) - 4)}`;
    if (kp >= 4) return "Activo";
    if (kp >= 3) return "Algo inquieto";
    return "Tranquilo";
}

export function claseKp(kp) {
    if (kp !== null && kp >= 5) return `nivel-${nivelKp(kp)}`;
    if (kp !== null && kp >= 4) return "nivel-activo";
    return "nivel-0";
}

export const NOMBRES_ESCALA = {
    0: "Sin incidencias",
    1: "Menor",
    2: "Moderada",
    3: "Fuerte",
    4: "Severa",
    5: "Extrema"
};

export function nivelEscala(valor) {
    const n = parseInt(valor, 10);
    return isFinite(n) ? Math.max(0, Math.min(5, n)) : 0;
}

export function nivelFulguracion(clase) {
    const letra = String(clase || "").charAt(0).toUpperCase();
    return { X: "x", M: "m", C: "c" }[letra] || "b";
}

/* Para ordenar fulguraciones por fuerza: «M2.3» → 2.3e-5. */
export function fuerzaFulguracion(clase) {
    const m = /^([ABCMX])(\d+(?:\.\d+)?)/i.exec(String(clase || ""));
    if (!m) return 0;
    const base = { A: 1e-8, B: 1e-7, C: 1e-6, M: 1e-5, X: 1e-4 }[m[1].toUpperCase()];
    return base * parseFloat(m[2]);
}


/* ------------------------------------------------------------
   Refresco
   ------------------------------------------------------------ */

/* Ejecuta tarea() ahora y luego cada «cada» milisegundos, pero solo
 * con la pestaña a la vista: al volver a ella, si ya tocaba, se hace
 * en el momento. Un solo reloj para todas las tareas de la página. */
const tareas = [];
let relojEnMarcha = false;

function revisar() {
    if (document.hidden) return;
    const ahora = Date.now();
    for (const t of tareas) {
        if (ahora - t.ultima >= t.cada) {
            t.ultima = ahora;
            Promise.resolve().then(t.tarea).catch(error =>
                console.error("Sol: falló una actualización", error));
        }
    }
}

export function cadaRato(tarea, cada) {
    tareas.push({ tarea, cada, ultima: Date.now() });
    Promise.resolve().then(tarea).catch(error =>
        console.error("Sol: falló la primera carga", error));
    if (!relojEnMarcha) {
        relojEnMarcha = true;
        setInterval(revisar, 30000);
        document.addEventListener("visibilitychange", revisar);
    }
}

/* Marca de 15 minutos para las imágenes: la misma para todos durante
 * ese rato, así el navegador aprovecha su copia y no se pide de más. */
export function conMarca(url) {
    const marca = Math.floor(Date.now() / IMAGENES_CADA_MS);
    return `${url}${url.includes("?") ? "&" : "?"}t=${marca}`;
}

/* Una imagen que no llega deja un hueco con aviso en vez del icono roto. */
export function prepararImagen(img) {
    if (img.dataset.preparada) return;
    img.dataset.preparada = "1";
    img.addEventListener("error", () => {
        const figura = img.closest("figure");
        if (figura) figura.classList.add("sin-imagen");
    });
    img.addEventListener("load", () => {
        const figura = img.closest("figure");
        if (figura) figura.classList.remove("sin-imagen");
    });
}

/* Fin de fichero: js/sol/comun.js */
