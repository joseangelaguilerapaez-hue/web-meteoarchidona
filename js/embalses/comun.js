/*
 * MeteoArchidona · Embalses · piezas comunes
 *
 * Lo que comparten los componentes de embalses (js/embalses/*.js) y la
 * página Embalses: el ámbito de cada hueco, la petición a la API con
 * caché corta, cifras en español, el «vaso» de agua y la hoja de estilos.
 *
 * Ámbito: todos los componentes lo leen de sus atributos, igual que en
 * la API (docs/embalses.md de api-meteoarchidona):
 *
 *     data-ambito="COMUNIDAD" data-codigo="Andalucía"   (lo de por defecto)
 *     data-ambito="ESPANA"
 *     data-ambito="CUENCA"    data-codigo="GUADALQUIVIR"
 *     data-ambito="PROVINCIA" data-codigo="Málaga"
 *
 * Los datos son del Boletín Hidrológico semanal del Ministerio (MITECO);
 * la API los carga los martes por la noche. Por eso la caché del
 * navegador es de 10 minutos y los componentes no se renuevan solos.
 *
 * Hoja de estilos: cada componente se asegura de que esté cargada
 * css/embalses-componentes.css, con su paleta de agua propia (José,
 * 5-11-2026), así se ve igual en la página que en un dashboard oscuro.
 */

export const AMBITO_DEFECTO = "COMUNIDAD";
export const CODIGO_DEFECTO = "Andalucía";

const HOJA = "/css/embalses-componentes.css?v=20261105-embalses1";

const CACHE_MS = 10 * 60 * 1000;
const ESPERA_MAXIMA_MS = 20000;

export const PAGINA = "/embalses";


/* ------------------------------------------------------------
   Ámbito
   ------------------------------------------------------------ */

export function leerAmbito(raiz) {
    const ambito = (raiz.dataset.ambito || AMBITO_DEFECTO).toUpperCase();
    const codigo = ambito === "ESPANA" ? "" : (raiz.dataset.codigo || (ambito === AMBITO_DEFECTO ? CODIGO_DEFECTO : ""));
    return { ambito, codigo };
}

export function consulta({ ambito, codigo }, extra = {}) {
    const parametros = new URLSearchParams({ ambito });
    if (codigo) parametros.set("codigo", codigo);
    for (const [clave, valor] of Object.entries(extra)) {
        if (valor !== undefined && valor !== null && valor !== "") parametros.set(clave, valor);
    }
    return parametros.toString();
}

/* Enlace a la página Embalses con un ámbito o un embalse. */
export function enlacePagina(parametros) {
    return `${PAGINA}?${new URLSearchParams(parametros).toString()}`;
}


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

/* Dos componentes que piden lo mismo en una página (el resumen de la
 * página y el de un dashboard) comparten la petición. */
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


/* ------------------------------------------------------------
   Cifras y fechas
   ------------------------------------------------------------ */

const formatoUnDecimal = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formatoEntero = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

const formatoFecha = new Intl.DateTimeFormat("es-ES", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric"
});

export const MESES_HIDROLOGICOS = ["oct", "nov", "dic", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep"];

export function porcentaje(valor) {
    return valor === null || valor === undefined ? "—" : `${formatoUnDecimal.format(valor)} %`;
}

export function hm3(valor) {
    return valor === null || valor === undefined ? "—" : `${formatoEntero.format(valor)} hm³`;
}

/* Variación con signo: «+12 hm³», «−3 hm³», «=». */
export function variacion(valor, unidad = "hm³") {
    if (valor === null || valor === undefined) return "—";
    if (Math.abs(valor) < 0.5) return "=";
    const signo = valor > 0 ? "+" : "−";
    return `${signo}${formatoEntero.format(Math.abs(valor))} ${unidad}`.trim();
}

/* Diferencia en puntos: «+27,0 p.», «−3,2 p.». */
export function puntos(valor) {
    if (valor === null || valor === undefined) return "";
    const signo = valor > 0 ? "+" : valor < 0 ? "−" : "";
    return `${signo}${formatoUnDecimal.format(Math.abs(valor))} p.`;
}

export function claseTendencia(valor) {
    if (valor === null || valor === undefined || Math.abs(valor) < 0.5) return "emb-igual";
    return valor > 0 ? "emb-sube" : "emb-baja";
}

/* Las fechas del boletín son días sueltos (2026-11-03). */
export function fecha(texto) {
    if (!texto) return "—";
    const [anio, mes, dia] = texto.split("-").map(Number);
    return formatoFecha.format(new Date(Date.UTC(anio, mes - 1, dia)));
}

export const NOMBRES_ESTADO = {
    CRITICO: "Crítico",
    BAJO: "Bajo",
    BUENO: "Bueno",
    LLENO: "Lleno"
};


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
    nodo.appendChild(crear("p", error ? "emb-aviso error" : "emb-aviso", texto));
}

export function asegurarHoja() {
    if (document.querySelector('link[href*="css/embalses-componentes.css"]')) {
        return;
    }
    const enlace = document.createElement("link");
    enlace.rel = "stylesheet";
    enlace.href = HOJA;
    document.head.appendChild(enlace);
}

/* Raíz común de todos los componentes de embalses. */
export function prepararRaiz(raiz, clase) {
    asegurarHoja();
    raiz.classList.add("emb-componente", clase);
    vaciar(raiz);
}

export function estado(codigo) {
    const marca = crear("span", `emb-estado estado-${codigo || "NINGUNO"}`, NOMBRES_ESTADO[codigo] || "—");
    return marca;
}

/* El vaso de agua lleno hasta un porcentaje, con marcas opcionales. */
export function vaso(valor, { cifra = true, marcas = [] } = {}) {
    const caja = crear("div", "emb-vaso");
    caja.setAttribute("role", "img");
    caja.setAttribute("aria-label", `Lleno al ${porcentaje(valor)}`);

    const agua = crear("div", "emb-vaso-agua");
    agua.style.setProperty("--emb-nivel", `${Math.max(0, Math.min(100, valor || 0))}%`);
    caja.appendChild(agua);

    for (const marca of marcas) {
        if (marca === null || marca === undefined) continue;
        const linea = crear("div", "emb-vaso-marca");
        linea.style.setProperty("--emb-marca", `${Math.max(0, Math.min(100, marca))}%`);
        caja.appendChild(linea);
    }

    if (cifra) {
        caja.appendChild(crear("div", "emb-vaso-cifra", porcentaje(valor)));
    }
    return caja;
}

export function barra(valor, codigoEstado) {
    const caja = crear("div", `emb-barra estado-${codigoEstado || "NINGUNO"}`);
    const relleno = crear("span");
    relleno.style.setProperty("--emb-nivel", `${Math.max(0, Math.min(100, valor || 0))}%`);
    caja.appendChild(relleno);
    return caja;
}

export function pie(raiz, texto) {
    raiz.appendChild(crear("p", "emb-pie", texto));
}

export function pieBoletin(raiz, fechaBoletin) {
    pie(raiz, `Boletín Hidrológico del Ministerio · semana del ${fecha(fechaBoletin)}`);
}


/* Fin de fichero: js/embalses/comun.js */
