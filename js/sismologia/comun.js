/*
 * MeteoArchidona · Sismología · piezas comunes
 *
 * Lo que comparten los componentes de sismología (js/sismologia/*.js) y
 * la página Sismología: la petición a la API con caché corta, horas en
 * hora de Madrid, colores de magnitud, Leaflet bajo demanda y la hoja de
 * estilos.
 *
 * Datos (docs/sismologia.md de api-meteoarchidona): terremotos a menos de
 * 300 km de Archidona. El IGN es la fuente oficial (se lee cada 5
 * minutos); el EMSC da un aviso provisional antes de que publique el IGN.
 * La API da cada sismo con su hora en Madrid y en UTC, distancia,
 * profundidad, magnitud, intensidad (si se sintió) y tramo de magnitud.
 *
 * Colores «Basalto y magma» (José, 8-11-2026): fondo blanco, pizarra para
 * el texto y magma de acento; la magnitud va del gris claro (menos de 2)
 * al granate (5 o más), pasando por amarillo, naranja y rojo lava.
 */

const HOJA = "/css/sismologia-componentes.css?v=20261109-heli1";

const LEAFLET = "/js/vendor/leaflet-1.9.4.js";

const CACHE_MS = 2 * 60 * 1000;

const ESPERA_MAXIMA_MS = 20000;

export const PAGINA = "/sismologia";

export const ARCHIDONA = [37.0965, -4.3886];

export const RADIO_MAXIMO = 300;


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

/* Número de un data-* con su valor por defecto y sus límites. */
export function leerNumero(raiz, nombre, defecto, minimo, maximo) {
    const valor = Number.parseFloat(raiz.dataset[nombre]);
    if (!Number.isFinite(valor)) return defecto;
    return Math.min(maximo, Math.max(minimo, valor));
}

export function leerRadio(raiz, defecto = 150) {
    return leerNumero(raiz, "radio", defecto, 5, RADIO_MAXIMO);
}

export function rutaTerremotos({ radio, dias, limite, magnitud }) {
    const partes = [`radio_km=${radio}`, `dias=${dias}`, `limite=${limite}`];
    if (magnitud !== null && magnitud !== undefined) partes.push(`magnitud_minima=${magnitud}`);
    return `/sismologia/terremotos?${partes.join("&")}`;
}


/* ------------------------------------------------------------
   Magnitud
   ------------------------------------------------------------ */

export const TRAMOS = ["MENOR_2", "DE_2_A_3", "DE_3_A_4", "DE_4_A_5", "DE_5"];

export const NOMBRES_TRAMO = {
    MENOR_2: "Menos de 2",
    DE_2_A_3: "De 2 a 3",
    DE_3_A_4: "De 3 a 4",
    DE_4_A_5: "De 4 a 5",
    DE_5: "5 o más"
};

/* Los mismos que --sis-m* de la hoja: el mapa los necesita en JS. */
export const COLORES_TRAMO = {
    MENOR_2: "#C7CDD3",
    DE_2_A_3: "#F2B705",
    DE_3_A_4: "#F27405",
    DE_4_A_5: "#D92B04",
    DE_5: "#7A0B0B",
    NINGUNO: "#C7CDD3"
};

export const PIZARRA = "#2F3B45";

export const MAGMA = "#D9480F";

export function colorTramo(tramo) {
    return COLORES_TRAMO[tramo] || COLORES_TRAMO.NINGUNO;
}

/* Pastilla con la magnitud: «M 2,4». */
export function pastillaMagnitud(sismo) {
    const pastilla = crear("span", `sis-magnitud tramo-${sismo.tramo_magnitud || "NINGUNO"}`, magnitud(sismo.magnitud));
    pastilla.title = sismo.tipo_magnitud ? `Magnitud ${magnitud(sismo.magnitud)} (${sismo.tipo_magnitud})` : "Magnitud";
    return pastilla;
}


/* ------------------------------------------------------------
   Cifras y fechas (siempre en hora de Madrid)
   ------------------------------------------------------------ */

const formatoUnDecimal = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const formatoEntero = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

const formatoFechaHora = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
});

const formatoFechaHoraAnio = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
});

const formatoFechaLarga = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long", year: "numeric"
});

const formatoHora = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", second: "2-digit"
});

export const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function magnitud(valor) {
    return valor === null || valor === undefined ? "—" : formatoUnDecimal.format(valor);
}

export function kilometros(valor) {
    if (valor === null || valor === undefined) return "—";
    return `${valor < 10 ? formatoUnDecimal.format(valor) : formatoEntero.format(valor)} km`;
}

function fechaDe(sismo) {
    return new Date(sismo.fecha_hora_utc || sismo.fecha_hora);
}

/* «8 nov, 02:22» (con el año si no es el actual). */
export function fechaHora(sismo) {
    const fecha = fechaDe(sismo);
    const mismoAnio = fecha.getFullYear() === new Date().getFullYear();
    return (mismoAnio ? formatoFechaHora : formatoFechaHoraAnio).format(fecha);
}

export function fechaLarga(sismo) {
    return formatoFechaLarga.format(fechaDe(sismo));
}

export function horaExacta(sismo) {
    return formatoHora.format(fechaDe(sismo));
}

/* «hace 25 min», «hace 3 h», «hace 2 días». */
export function haceCuanto(sismo) {
    const minutos = Math.max(0, Math.round((Date.now() - fechaDe(sismo).getTime()) / 60000));
    if (minutos < 1) return "ahora mismo";
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.round(minutos / 60);
    if (horas < 48) return `hace ${horas} h`;
    return `hace ${Math.round(horas / 24)} días`;
}

export function horaActualizacion(texto) {
    if (!texto) return "";
    return formatoFechaHora.format(new Date(texto));
}

/* Lugar del IGN («N SANTA FE.GR») un poco más legible: «N Santa Fe (GR)». */
export function lugar(sismo) {
    const texto = sismo.localizacion;
    if (!texto) return "Sin localizar";

    const [nombre, provincia] = texto.split(".");
    const legible = nombre
        .toLowerCase()
        .replace(/(^|[\s-])(\p{L})/gu, (todo, separador, letra) => separador + letra.toUpperCase())
        .replace(/^(N|S|E|W|Ne|Nw|Se|Sw|Ene|Ese|Wnw|Wsw|Nne|Nnw|Sse|Ssw)\s/, (direccion) => direccion.toUpperCase())
        .replace(/\s(De|Del|La|Las|El|Los|Y)\s/g, (palabra) => palabra.toLowerCase());

    return provincia ? `${legible} (${provincia.trim()})` : legible;
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
    nodo.appendChild(crear("p", error ? "sis-aviso-texto error" : "sis-aviso-texto", texto));
}

export function asegurarHoja() {
    if (document.querySelector('link[href*="css/sismologia-componentes.css"]')) {
        return;
    }

    const enlace = document.createElement("link");
    enlace.rel = "stylesheet";
    enlace.href = HOJA;
    document.head.appendChild(enlace);
}

/* Raíz común de todos los componentes de sismología. Devuelve el turno
 * de este montaje: si el componente se vuelve a montar mientras espera a
 * la API (al cambiar el radio en la página), el montaje viejo lo ve con
 * esVigente() y no pinta encima del nuevo. */
export function prepararRaiz(raiz, clase) {
    asegurarHoja();
    raiz.hidden = false;
    raiz.classList.add("sis-componente", clase);
    vaciar(raiz);
    raiz._sisTurno = (raiz._sisTurno || 0) + 1;
    return raiz._sisTurno;
}

export function esVigente(raiz, turno) {
    return raiz._sisTurno === turno;
}

/* Título opcional (data-titulo="no" lo quita). */
export function titulo(raiz, etiqueta, texto) {
    if (raiz.dataset.titulo === "no") return;
    const cabeza = crear("div");
    cabeza.appendChild(crear("div", "sis-etiqueta", etiqueta));
    cabeza.appendChild(crear("h3", "sis-titulo", texto));
    raiz.appendChild(cabeza);
}

export function pie(raiz, texto) {
    raiz.appendChild(crear("p", "sis-pie", texto));
}

/* Enlace a la ficha del IGN o del EMSC. */
export function enlaceFicha(sismo, texto = "Ficha") {
    if (!sismo.enlace) return null;
    const enlace = crear("a", "sis-enlace", texto);
    enlace.href = sismo.enlace;
    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer";
    return enlace;
}

export const FUENTE = "IGN (Red Sísmica Nacional) · aviso rápido del EMSC";


/* ------------------------------------------------------------
   Leaflet, solo cuando hay un mapa
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


/* Fin de fichero: js/sismologia/comun.js */
