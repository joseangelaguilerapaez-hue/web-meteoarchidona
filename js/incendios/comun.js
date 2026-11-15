/*
 * MeteoArchidona · Incendios · piezas comunes
 *
 * Lo que comparten los componentes de Incendios (js/incendios/*.js) y la
 * página: la petición a la API con caché, la lista de pueblos y su
 * selector, fechas en español, los colores de los niveles, las citas de
 * AEMET y EFFIS y la hoja de estilos.
 *
 * Datos (docs/incendios.md de api-meteoarchidona): solo los niveles
 * oficiales, el de AEMET (rejilla de 1 km, 8 días; manda en el color de
 * cada pueblo) y el de EFFIS de Copernicus (clase leída de su mapa, 3
 * días). MeteoArchidona no calcula un índice propio (José, 15-11-2026).
 *
 * Hoja de estilos: cada componente se asegura de que esté cargada
 * css/incendios-componentes.css, con su gama «Brasa sobre oscuro» (José,
 * 15-11-2026), así se ve igual en la página que en un dashboard.
 */

const HOJA = "/css/incendios-componentes.css?v=20261115-incendios1";

const CACHE_MS = 15 * 60 * 1000;

const ESPERA_MAXIMA_MS = 20000;

export const PAGINA = "/incendios";

export const PUNTO_POR_DEFECTO = "ARCHIDONA";

export const CITA_AEMET = "Fuente: AEMET (nivel de peligro meteorológico de incendios forestales).";

export const CITA_EFFIS = "© Unión Europea, Copernicus Emergency Management Service – EFFIS (CC BY 4.0).";

export const AVISO =
    "Información solo orientativa: niveles oficiales de AEMET y EFFIS; MeteoArchidona no calcula un índice propio. " +
    "Ante un incendio, llama al 112.";

/* Abreviaturas de cada nivel para las casillas pequeñas. */
export const CORTOS = {1: "MB", 2: "B", 3: "M", 4: "A", 5: "MA", 6: "E", 7: "ME"};

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

const DIAS_LARGOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const MESES_LARGOS = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];


/* ------------------------------------------------------------
   Datos
   ------------------------------------------------------------ */

const cache = new Map();

export function base() {
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

export function pedirRiesgo() {
    return pedir("/incendios/riesgo");
}

/* data-punto="ARCHIDONA"…; por defecto, Archidona. */
export function leerPunto(raiz) {
    return (raiz.dataset.punto || PUNTO_POR_DEFECTO).trim().toUpperCase();
}


/* ------------------------------------------------------------
   Fechas
   ------------------------------------------------------------ */

function partes(texto) {
    const [anio, mes, dia] = texto.split("-").map(Number);
    return { anio, mes, dia, fecha: new Date(Date.UTC(anio, mes - 1, dia)) };
}

/* «lun 17» */
export function diaCorto(texto) {
    const { dia, fecha } = partes(texto);
    return `${DIAS[fecha.getUTCDay()]} ${dia}`;
}

/* «lunes 17 de noviembre» */
export function diaLargo(texto) {
    const { dia, mes, fecha } = partes(texto);
    return `${DIAS_LARGOS[fecha.getUTCDay()]} ${dia} de ${MESES_LARGOS[mes - 1]}`;
}

/* «17 de noviembre» (con el año si se pide) */
export function fechaLarga(texto, conAnio = false) {
    const { anio, mes, dia } = partes(texto);
    return `${dia} de ${MESES_LARGOS[mes - 1]}${conAnio ? ` de ${anio}` : ""}`;
}

export function esHoy(texto, hoy) {
    return texto === hoy;
}


/* ------------------------------------------------------------
   Colores
   ------------------------------------------------------------ */

/* Texto oscuro sobre colores claros y claro sobre oscuros. */
export function tintaSobre(color) {
    if (!color) return "";
    const limpio = color.replace("#", "");
    const r = parseInt(limpio.slice(0, 2), 16);
    const g = parseInt(limpio.slice(2, 4), 16);
    const b = parseInt(limpio.slice(4, 6), 16);
    const luz = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luz > 0.55 ? "#1a1210" : "#fff6ee";
}

/* Casilla con el color de un nivel ({nivel, nombre, color}). */
export function casilla(nivel, { corto = true, clase = "inc-casilla" } = {}) {
    const nodo = crear("span", clase);

    if (!nivel || nivel.nivel === null || nivel.nivel === undefined) {
        nodo.classList.add("sin-dato");
        nodo.textContent = "—";
        nodo.title = "Sin dato";
        return nodo;
    }

    nodo.style.background = nivel.color;
    nodo.style.color = tintaSobre(nivel.color);
    nodo.textContent = corto ? CORTOS[nivel.nivel] : nivel.nombre;
    nodo.title = nivel.nombre;
    return nodo;
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
    nodo.appendChild(crear("p", error ? "inc-aviso error" : "inc-aviso", texto));
}

export function asegurarHoja() {
    if (document.querySelector('link[href*="css/incendios-componentes.css"]')) {
        return;
    }

    const enlace = document.createElement("link");
    enlace.rel = "stylesheet";
    enlace.href = HOJA;
    document.head.appendChild(enlace);
}

/* Raíz común de todos los componentes de Incendios. */
export function prepararRaiz(raiz, clase) {
    asegurarHoja();
    raiz.classList.add("inc-componente", clase);
    vaciar(raiz);
}

/* Título opcional (data-titulo="no" lo quita). */
export function titulo(raiz, etiqueta, texto) {
    if (raiz.dataset.titulo === "no") return;
    const cabeza = crear("div", "inc-cabeza");
    cabeza.appendChild(crear("div", "inc-etiqueta", etiqueta));
    cabeza.appendChild(crear("h3", "inc-titulo", texto));
    raiz.appendChild(cabeza);
}

/* Citas de las fuentes: van siempre. */
export function pie(raiz, { aemet = true, effis = true, extra = null } = {}) {
    const textos = [];
    if (extra) textos.push(extra);
    if (aemet) textos.push(CITA_AEMET);
    if (effis) textos.push(CITA_EFFIS);
    raiz.appendChild(crear("p", "inc-pie", textos.join(" ")));
}

/* Leyenda de los niveles ({nivel, nombre, color}). */
export function leyenda(niveles, { desde = 1, hasta = 7 } = {}) {
    const nodo = crear("div", "inc-leyenda");
    for (const nivel of niveles) {
        if (nivel.nivel < desde || nivel.nivel > hasta) continue;
        const elemento = crear("span", "inc-leyenda-elemento");
        const muestra = crear("span", "inc-leyenda-color");
        muestra.style.background = nivel.color;
        elemento.appendChild(muestra);
        elemento.appendChild(document.createTextNode(nivel.nombre));
        nodo.appendChild(elemento);
    }
    return nodo;
}

/*
 * Selector de pueblo (salvo data-selector="no"). Al cambiar, guarda el
 * pueblo en data-punto y vuelve a montar el componente con `montar`.
 */
export async function selectorPunto(raiz, montar, contenedor = raiz) {
    if (raiz.dataset.selector === "no") return;

    let riesgo;
    try {
        riesgo = await pedirRiesgo();
    } catch {
        return;
    }
    if (!riesgo.pueblos.length) return;

    const etiqueta = crear("label", "inc-selector", "Pueblo");
    const selector = crear("select");
    for (const pueblo of riesgo.pueblos) {
        selector.appendChild(new Option(pueblo.nombre, pueblo.codigo));
    }
    selector.value = leerPunto(raiz);
    selector.addEventListener("change", () => {
        raiz.dataset.punto = selector.value;
        montar(raiz);
    });
    etiqueta.appendChild(selector);
    contenedor.appendChild(etiqueta);
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

export function textoError(error) {
    if (error && error.estado === 404) return "No hay datos de ese pueblo.";
    return "No se han podido leer los datos de incendios. Prueba dentro de un rato.";
}


/* Fin de fichero: js/incendios/comun.js */
