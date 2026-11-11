/*
 * MeteoArchidona · Luna · piezas comunes
 *
 * Lo que comparten los componentes de la sección Luna (js/luna/*.js) y la
 * página: la petición a la API con caché corta, horas y fechas en hora de
 * Madrid, el dibujo de la fase de la Luna (cuando no hay imagen de la
 * NASA y en el calendario), un reloj que refresca solo con la pestaña a
 * la vista y la hoja de estilos.
 *
 * Datos (docs/luna.md de api-meteoarchidona): todo lo calcula nuestro
 * servidor con Skyfield para la estación de El Silo; la imagen de la
 * Luna es de Dial-a-Moon (NASA).
 *
 * Hoja de estilos: cada componente se asegura de que esté cargada
 * css/luna-componentes.css, con su gama «Azul noche y oro lunar» (José,
 * 11-11-2026), así se ve igual en la página que en un dashboard.
 */

const HOJA = "/css/luna-componentes.css?v=20261111-luna4";

const ESPERA_MAXIMA_MS = 20000;

export const PAGINA = "/luna";

export const FUENTE_CALCULO = "Cálculo de MeteoArchidona para El Silo (Skyfield, efeméride DE440s del JPL)";

export const NOMBRES_CUERPO = {
    SOL: "Sol",
    LUNA: "Luna",
    MERCURIO: "Mercurio",
    VENUS: "Venus",
    MARTE: "Marte",
    JUPITER: "Júpiter",
    SATURNO: "Saturno",
    URANO: "Urano",
    NEPTUNO: "Neptuno"
};

/* Nombre largo de los rumbos de 16 puntos que da la API (O es oeste). */
export const RUMBOS = {
    N: "norte", NNE: "nornordeste", NE: "nordeste", ENE: "estenordeste",
    E: "este", ESE: "estesudeste", SE: "sudeste", SSE: "sudsudeste",
    S: "sur", SSO: "sudsudoeste", SO: "sudoeste", OSO: "oestesudoeste",
    O: "oeste", ONO: "oestenoroeste", NO: "noroeste", NNO: "nornoroeste"
};


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
export function pedir(ruta, cacheMs = 10 * 60 * 1000) {
    const guardado = cache.get(ruta);

    if (guardado && Date.now() - guardado.cuando < cacheMs) {
        return guardado.promesa;
    }

    const promesa = pedirSinCache(ruta);
    cache.set(ruta, { cuando: Date.now(), promesa });
    promesa.catch(() => cache.delete(ruta));
    return promesa;
}

export function textoError(error) {
    if (error && error.estado === 503) {
        return "El cálculo astronómico todavía no está en marcha en el servidor.";
    }
    return "No se han podido cargar los datos. Se volverá a intentar en un rato.";
}


/* ------------------------------------------------------------
   Reloj: refresca cada cierto tiempo solo con la pestaña a la vista
   ------------------------------------------------------------ */

const tareas = [];
let relojEnMarcha = false;

function revisar() {
    if (document.hidden) return;
    const ahora = Date.now();
    for (let i = tareas.length - 1; i >= 0; i--) {
        const t = tareas[i];
        if (!t.raiz.isConnected) {
            tareas.splice(i, 1);
            continue;
        }
        if (ahora - t.ultima >= t.cada) {
            t.ultima = ahora;
            Promise.resolve().then(t.tarea).catch(error =>
                console.error("Luna: falló una actualización", error));
        }
    }
}

export function cadaRato(raiz, tarea, cada) {
    tareas.push({ raiz, tarea, cada, ultima: Date.now() });
    Promise.resolve().then(tarea).catch(error =>
        console.error("Luna: falló la primera carga", error));
    if (!relojEnMarcha) {
        relojEnMarcha = true;
        setInterval(revisar, 20000);
        document.addEventListener("visibilitychange", revisar);
    }
}


/* ------------------------------------------------------------
   Horas, fechas y cifras (siempre en hora de Madrid)
   ------------------------------------------------------------ */

const ZONA = "Europe/Madrid";

const formatoHora = new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, hour: "2-digit", minute: "2-digit" });

const formatoDiaHora = new Intl.DateTimeFormat("es-ES", {
    timeZone: ZONA, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
});

const formatoFechaLarga = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

const formatoDiaCorto = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", weekday: "short", day: "numeric" });

const formatoMes = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", month: "long", year: "numeric" });

const formatoEntero = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

const formatoDecimal = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function hora(iso) {
    return iso ? formatoHora.format(new Date(iso)) : "—";
}

export function diaHora(iso) {
    return iso ? formatoDiaHora.format(new Date(iso)) : "—";
}

export function aFecha(texto) {
    const [anio, mes, dia] = texto.split("-").map(Number);
    return new Date(Date.UTC(anio, mes - 1, dia));
}

export function fechaLarga(texto) {
    return texto ? formatoFechaLarga.format(aFecha(texto)) : "—";
}

export function diaCorto(texto) {
    return formatoDiaCorto.format(aFecha(texto));
}

export function nombreMes(anio, mes) {
    return formatoMes.format(new Date(Date.UTC(anio, mes - 1, 1)));
}

/* Hoy en hora de Madrid, «AAAA-MM-DD». */
export function hoyMadrid() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());
}

/* El día en que empezó la noche que estamos viviendo: antes de las 12:00,
 * la de ayer. */
export function nocheActual() {
    const ahora = new Date();
    const horaMadrid = Number(new Intl.DateTimeFormat("en-GB", { timeZone: ZONA, hour: "2-digit", hourCycle: "h23" }).format(ahora));
    const fecha = horaMadrid < 12 ? new Date(ahora.getTime() - 12 * 3600 * 1000) : ahora;
    return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(fecha);
}

export function entero(valor) {
    return valor === null || valor === undefined ? "—" : formatoEntero.format(valor);
}

export function decimal(valor) {
    return valor === null || valor === undefined ? "—" : formatoDecimal.format(valor);
}

export function km(valor) {
    return valor === null || valor === undefined ? "—" : `${formatoEntero.format(valor)} km`;
}

export function gradosAngulo(valor) {
    return valor === null || valor === undefined ? "—" : `${formatoEntero.format(valor)}°`;
}

export function porcentaje(valor) {
    return valor === null || valor === undefined ? "—" : `${formatoEntero.format(valor)} %`;
}

/* 615 → «10 h 15 min». */
export function duracion(minutos) {
    if (minutos === null || minutos === undefined) return "—";
    const h = Math.floor(minutos / 60);
    const m = Math.round(minutos % 60);
    return h ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
}

/* Minutos desde las 00:00 de Madrid de una hora ISO (para dibujar). */
export function minutosDelDia(iso) {
    if (!iso) return null;
    const [h, m] = formatoHora.format(new Date(iso)).split(":").map(Number);
    return h * 60 + m;
}


/* ------------------------------------------------------------
   DOM
   ------------------------------------------------------------ */

const SVG = "http://www.w3.org/2000/svg";

export function crear(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
}

export function crearSvg(etiqueta, atributos = {}) {
    const nodo = document.createElementNS(SVG, etiqueta);
    for (const [nombre, valor] of Object.entries(atributos)) {
        nodo.setAttribute(nombre, valor);
    }
    return nodo;
}

export function vaciar(nodo) {
    while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
}

export function aviso(nodo, texto, error = false) {
    vaciar(nodo);
    nodo.appendChild(crear("p", error ? "lun-aviso error" : "lun-aviso", texto));
}

export function asegurarHoja() {
    if (document.querySelector('link[href*="css/luna-componentes.css"]')) {
        return;
    }

    const enlace = document.createElement("link");
    enlace.rel = "stylesheet";
    enlace.href = HOJA;
    document.head.appendChild(enlace);
}

/* Raíz común de todos los componentes de la sección Luna. */
export function prepararRaiz(raiz, clase) {
    asegurarHoja();
    raiz.classList.add("lun-componente", clase);
    vaciar(raiz);
}

export function pie(raiz, texto) {
    raiz.appendChild(crear("p", "lun-pie", texto));
}

/* Un par «nombre: valor» de una lista de datos. */
export function dato(lista, nombre, valor) {
    lista.appendChild(crear("dt", null, nombre));
    lista.appendChild(crear("dd", "lun-cifra", valor));
}


/* ------------------------------------------------------------
   Dibujo de la fase
   ------------------------------------------------------------
   Ángulo de fase: 0 nueva, 90 cuarto creciente, 180 llena, 270
   cuarto menguante. Visto desde el hemisferio norte, la creciente
   está iluminada por la derecha y la menguante por la izquierda.
   ------------------------------------------------------------ */

export function dibujarFase(angulo, tamano = 48) {
    const r = 50;
    const svg = crearSvg("svg", {
        viewBox: "-52 -52 104 104",
        width: tamano,
        height: tamano,
        class: "lun-fase",
        role: "img"
    });

    svg.appendChild(crearSvg("circle", { r, class: "lun-fase-sombra" }));

    const a = ((angulo % 360) + 360) % 360;
    const coseno = Math.cos(a * Math.PI / 180);
    const creciente = a < 180;

    if (coseno > 0.999) {
        return svg;
    }

    if (coseno < -0.999) {
        svg.appendChild(crearSvg("circle", { r, class: "lun-fase-luz" }));
        return svg;
    }

    const rx = Math.abs(coseno) * r;
    const limbo = creciente ? 1 : 0;
    const terminador = creciente ? (coseno > 0 ? 0 : 1) : (coseno > 0 ? 1 : 0);
    const camino = `M 0 ${-r} A ${r} ${r} 0 0 ${limbo} 0 ${r} A ${rx.toFixed(2)} ${r} 0 0 ${terminador} 0 ${-r} Z`;
    svg.appendChild(crearSvg("path", { d: camino, class: "lun-fase-luz" }));
    return svg;
}


/* Fin de fichero: js/luna/comun.js */
