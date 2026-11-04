/*
 * MeteoArchidona · Predicción · piezas comunes
 *
 * Lo que comparten los componentes de la predicción (js/prediccion/*.js):
 * la petición a la API con caché corta, los formatos de fecha (siempre en
 * hora de Madrid), los iconos, la flecha del viento, el pie con la
 * procedencia y el refresco periódico.
 *
 * Caché corta: «Hoy», «Próximas horas» y «Próximos 7 días» leen la misma
 * GET /prediccion/{municipio}; en una página o en un dashboard se pide una
 * sola vez por minuto aunque estén los tres.
 *
 * Hoja de estilos: cada componente se asegura de que esté cargada
 * css/prediccion.css, así se puede poner en cualquier página.
 */

export const MUNICIPIO = "archidona";

export const ESTACION_AHORA = "EL_SILO";

/* La predicción cambia pocas veces al día; la observación, a menudo. */
export const PREDICCION_CADA_MS = 30 * 60 * 1000;
export const AHORA_CADA_MS = 5 * 60 * 1000;

const ZONA = "Europe/Madrid";
const CACHE_MS = 60 * 1000;
const ESPERA_MAXIMA_MS = 20000;
const HOJA = "/css/prediccion.css?v=20261104-componentes1";

const RUMBOS = {
    N: 0, NE: 45, E: 90, SE: 135, S: 180, SO: 225, O: 270, NO: 315,
    SW: 225, W: 270, NW: 315
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

export function asegurarHoja() {
    if (document.querySelector('link[href*="css/prediccion.css"]')) {
        return;
    }
    const enlace = document.createElement("link");
    enlace.rel = "stylesheet";
    enlace.href = HOJA;
    document.head.appendChild(enlace);
}

/* Raíz de un componente: sus clases de tarjeta y vacía. */
export function prepararRaiz(raiz, ...clases) {
    asegurarHoja();
    raiz.classList.add("pred-componente-pieza", ...clases);
    raiz.textContent = "";
}

/* Municipio del hueco (data-municipio); hoy la API solo tiene Archidona. */
export function municipioDe(raiz) {
    return (raiz.dataset.municipio || MUNICIPIO).toLowerCase();
}


/* ------------------------------------------------------------
   Números y fechas
   ------------------------------------------------------------ */

export function numero(valor, sufijo) {
    return typeof valor === "number" && Number.isFinite(valor)
        ? `${Math.round(valor)}${sufijo || ""}`
        : "--";
}

export const formatoHora = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit", minute: "2-digit", timeZone: ZONA
});

export const formatoSoloHora = new Intl.DateTimeFormat("es-ES", {
    hour: "numeric", hourCycle: "h23", timeZone: ZONA
});

const formatoDiaSemana = new Intl.DateTimeFormat("es-ES", {
    weekday: "short", day: "numeric", timeZone: ZONA
});

const formatoDiaLargo = new Intl.DateTimeFormat("es-ES", {
    weekday: "long", day: "numeric", month: "long", timeZone: ZONA
});

const formatoFechaIso = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: ZONA
});

export function fechaLocal(fecha) {
    return formatoFechaIso.format(fecha);
}

/* «AAAA-MM-DD» como mediodía de ese día, para formatearlo sin saltos de zona. */
function desdeFechaIso(texto) {
    return new Date(`${texto}T12:00:00Z`);
}

export function nombreDia(textoFecha, hoy) {
    const manana = fechaLocal(new Date(desdeFechaIso(hoy).valueOf() + 86400000));

    if (textoFecha === hoy) return "Hoy";
    if (textoFecha === manana) return "Mañana";

    const texto = formatoDiaSemana.format(desdeFechaIso(textoFecha)).replace(".", "");
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function cuando(fecha) {
    const hoy = fechaLocal(new Date());
    const ayer = fechaLocal(new Date(Date.now() - 86400000));
    const dia = fechaLocal(fecha);
    const hora = formatoHora.format(fecha);

    if (dia === hoy) return `hoy a las ${hora}`;
    if (dia === ayer) return `ayer a las ${hora}`;
    return `el ${formatoDiaLargo.format(fecha)} a las ${hora}`;
}

export function horaDe(instante) {
    const fecha = new Date(instante);
    return Number.isNaN(fecha.getTime()) ? null : formatoHora.format(fecha);
}


/* ------------------------------------------------------------
   Iconos (los dibujos están en js/iconos-tiempo.js)
   ------------------------------------------------------------ */

export function icono(condicion, noche) {
    return window.IconosTiempo
        ? window.IconosTiempo.icono(condicion, noche)
        : "";
}

export function flechaViento(direccion) {
    const grados = RUMBOS[String(direccion || "").toUpperCase()];
    const flecha = crear("span", "pred-flecha", "↓");

    // La flecha señala hacia dónde sopla: el viento del N baja hacia el S.
    if (grados === undefined) {
        flecha.hidden = true;
    } else {
        flecha.style.transform = `rotate(${grados}deg)`;
    }

    flecha.setAttribute("aria-hidden", "true");
    return flecha;
}


/* ------------------------------------------------------------
   Datos
   ------------------------------------------------------------ */

const cache = new Map();

async function pedirSinCache(ruta) {
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), ESPERA_MAXIMA_MS);
    try {
        const respuesta = await fetch(`${window.API_BASE || "/api"}${ruta}`, {
            cache: "no-store",
            signal: control.signal
        });
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        return await respuesta.json();
    } finally {
        clearTimeout(reloj);
    }
}

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

/* La predicción de AEMET de un municipio (docs/prediccion-endpoint.md).
 * Sin predicción diaria se trata como si no hubiera llegado. */
export async function pedirPrediccion(municipio) {
    const datos = await pedir(`/prediccion/${encodeURIComponent(municipio)}`);
    if (!Array.isArray(datos?.diaria) || datos.diaria.length === 0) {
        throw new Error("respuesta sin predicción diaria");
    }
    return datos;
}


/* ------------------------------------------------------------
   Pie con la procedencia (cada tarjeta de AEMET lleva el suyo)
   ------------------------------------------------------------ */

export function ponerFuente(raiz, datos) {
    let pie = raiz.querySelector(":scope > .pred-pie");
    if (!pie) {
        pie = crear("p", "pred-fuente pred-pie");
        raiz.appendChild(pie);
    }

    pie.textContent = "";
    pie.classList.toggle("pred-fuente-antigua", Boolean(datos?.desactualizada));

    const nombre = datos?.fuente?.nombre || "AEMET";
    const emitida = datos?.fuente?.emitida ? new Date(datos.fuente.emitida) : null;

    if (datos?.fuente?.url) {
        const enlace = crear("a", null, nombre);
        enlace.href = datos.fuente.url;
        enlace.target = "_blank";
        enlace.rel = "noopener";
        pie.append("Fuente: ", enlace);
    } else {
        pie.append(`Fuente: ${nombre}`);
    }

    if (emitida && !Number.isNaN(emitida.valueOf())) {
        pie.append(` · emitida ${cuando(emitida)}`);
    }

    if (datos?.desactualizada) {
        pie.append(" · puede estar desactualizada");
    }
}

/* Sin predicción: si ya se había pintado una, se conserva marcada como
 * antigua; si no, se avisa. MeteoArchidona nunca inventa datos. */
export function sinPrediccion(raiz, cuerpo, yaPintada) {
    if (yaPintada) {
        const pie = raiz.querySelector(":scope > .pred-pie");
        if (pie) {
            pie.classList.add("pred-fuente-antigua");
            pie.textContent = "Fuente: AEMET · no se ha podido actualizar; se reintenta en unos minutos";
        }
        return;
    }
    cuerpo.textContent = "";
    cuerpo.append(crear(cuerpo.tagName === "OL" ? "li" : "p", "pred-vacio",
        "La predicción de AEMET no está disponible en este momento."));
}


/* ------------------------------------------------------------
   Refresco
   ------------------------------------------------------------ */

/* Ejecuta tarea() ahora y luego cada «cada» milisegundos, solo con la
 * pestaña a la vista; al volver a ella, si ya tocaba, en el momento.
 * Un solo reloj para todos los componentes de la página. */
const tareas = [];
let relojEnMarcha = false;

function revisar() {
    if (document.hidden) return;
    const ahora = Date.now();
    for (const t of tareas) {
        if (ahora - t.ultima >= t.cada) {
            t.ultima = ahora;
            Promise.resolve().then(t.tarea).catch(error =>
                console.error("Predicción: falló una actualización", error));
        }
    }
}

export function cadaRato(tarea, cada) {
    tareas.push({ tarea, cada, ultima: Date.now() });
    Promise.resolve().then(tarea).catch(error =>
        console.error("Predicción: falló la primera carga", error));
    if (!relojEnMarcha) {
        relojEnMarcha = true;
        setInterval(revisar, 30000);
        document.addEventListener("visibilitychange", revisar);
    }
}


/* Fin de fichero: js/prediccion/comun.js */
