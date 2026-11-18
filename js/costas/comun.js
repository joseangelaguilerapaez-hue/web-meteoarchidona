/*
 * MeteoArchidona · Costas · piezas comunes
 *
 * Lo que comparten los componentes de Costas (js/costas/*.js) y la página
 * Costas: la petición a la API con caché corta, cifras, horas y rumbos en
 * español, la escala de colores del oleaje, Leaflet bajo demanda y la
 * hoja de estilos.
 *
 * Fuentes (docs/costas.md de api-meteoarchidona):
 *
 *   - Puertos del Estado (Portus): boyas y mareógrafos medidos, playas, y
 *     previsión de oleaje, viento y mareas por playa. La API guarda las
 *     boyas cada hora, los mareógrafos cada 10 minutos y la previsión a
 *     las 07:40 y a las 19:40.
 *   - Open-Meteo (Copernicus Marine): temperatura del agua prevista.
 *
 * Hoja de estilos: cada componente se asegura de que esté cargada
 * css/costas-componentes.css, con su gama «Mar y arena» (José,
 * 18-11-2026), así se ve igual en la página que en un dashboard oscuro.
 */

const HOJA = "/css/costas-componentes.css?v=20261118-costas1";

const LEAFLET = "/js/vendor/leaflet-1.9.4.js";

const CACHE_MS = 5 * 60 * 1000;

const ESPERA_MAXIMA_MS = 20000;

export const PAGINA = "/costas";

export const ZONA = "Europe/Madrid";

export const FUENTE_PORTUS = "Puertos del Estado (Portus)";

export const FUENTE_OPEN_METEO = "Open-Meteo (Copernicus Marine)";

export const CITA = `Fuente: ${FUENTE_PORTUS}; temperatura del agua prevista: ${FUENTE_OPEN_METEO}.`;

/* La boya de Málaga, la de casa, si no se elige otra. */
export const ESTACION_DEFECTO = "1514";


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

export function pedirPlayas() {
    return pedir("/costas/playas");
}


/* ------------------------------------------------------------
   Nodos
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
    nodo.appendChild(crear("p", error ? "cos-aviso error" : "cos-aviso", texto));
}

export function asegurarHoja() {
    if (document.querySelector('link[href*="css/costas-componentes.css"]')) {
        return;
    }

    const enlace = document.createElement("link");
    enlace.rel = "stylesheet";
    enlace.href = HOJA;
    document.head.appendChild(enlace);
}

/* Raíz común de todos los componentes de Costas. */
export function prepararRaiz(raiz, clase) {
    asegurarHoja();
    raiz.classList.add("cos-componente", clase);
    vaciar(raiz);
}

/* Título opcional (data-titulo="no" lo quita). */
export function titulo(raiz, etiqueta, texto) {
    if (raiz.dataset.titulo === "no") return;
    const cabeza = crear("div", "cos-cabeza");
    cabeza.appendChild(crear("div", "cos-etiqueta", etiqueta));
    cabeza.appendChild(crear("h3", "cos-titulo", texto));
    raiz.appendChild(cabeza);
}

export function pie(raiz, texto) {
    raiz.appendChild(crear("p", "cos-pie", texto));
}

export function conSelector(raiz) {
    return raiz.dataset.selector !== "no";
}

/* Solo en la propia página se cambia la dirección al elegir una playa. */
export function enPagina() {
    return location.pathname.replace(/\/$/, "") === PAGINA;
}

export function apuntarEnDireccion(clave, valor) {
    if (!enPagina()) return;
    const direccion = new URL(location.href);
    if (valor) {
        direccion.searchParams.set(clave, valor);
    } else {
        direccion.searchParams.delete(clave);
    }
    history.replaceState(null, "", direccion);
}

export function enlaceFicha(playa) {
    return `${PAGINA}?playa=${encodeURIComponent(playa)}#playa`;
}


/* ------------------------------------------------------------
   Cifras, horas y rumbos
   ------------------------------------------------------------ */

const numero1 = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const numero2 = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function metros(valor, decimales = 1) {
    if (valor === null || valor === undefined) return "—";
    return `${(decimales === 2 ? numero2 : numero1).format(valor)} m`;
}

export function segundos(valor) {
    if (valor === null || valor === undefined) return "—";
    return `${numero1.format(valor)} s`;
}

export function grados(valor) {
    if (valor === null || valor === undefined) return "—";
    return `${numero1.format(valor)} °C`;
}

export function kmh(valor) {
    if (valor === null || valor === undefined) return "—";
    return `${Math.round(valor)} km/h`;
}

export function kilometros(valor) {
    if (valor === null || valor === undefined) return "";
    return `a ${Math.round(valor)} km`;
}

const formatoHora = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: ZONA });
const formatoDia = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: ZONA });
const formatoDiaCorto = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", timeZone: ZONA });
const formatoClave = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: ZONA });

export function hora(texto) {
    return texto ? formatoHora.format(new Date(texto)) : "—";
}

/* «2026-11-18» del día en Madrid de un instante. */
export function diaDe(texto) {
    return formatoClave.format(new Date(texto));
}

export function hoyClave() {
    return formatoClave.format(new Date());
}

/* Una fecha «2026-11-18» a mediodía, para nombrar el día sin saltos de zona. */
function mediodia(fecha) {
    return new Date(`${fecha}T12:00:00`);
}

export function nombreDia(fecha) {
    const hoy = hoyClave();
    const manana = formatoClave.format(new Date(Date.now() + 86400000));
    if (fecha === hoy) return "Hoy";
    if (fecha === manana) return "Mañana";
    const texto = formatoDiaCorto.format(mediodia(fecha));
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function fechaLarga(fecha) {
    const texto = formatoDia.format(mediodia(fecha));
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/* «actualizado a las 07:42» o «del lunes a las 19:41». */
export function horaActualizacion(texto) {
    if (!texto) return "";
    const fecha = new Date(texto);
    if (diaDe(texto) === hoyClave()) return `actualizado a las ${formatoHora.format(fecha)}`;
    return `actualizado el ${formatoDiaCorto.format(fecha)} a las ${formatoHora.format(fecha)}`;
}

/* Flecha que apunta hacia donde va el mar o el viento (llega de «grados»). */
export function flecha(gradosProcedencia, rumbo, etiqueta = "procedente del") {
    const caja = crear("span", "cos-flecha");
    if (gradosProcedencia === null || gradosProcedencia === undefined) {
        caja.textContent = "—";
        return caja;
    }
    const icono = crear("span", "cos-flecha-icono", "↓");
    icono.style.transform = `rotate(${gradosProcedencia}deg)`;
    icono.setAttribute("aria-hidden", "true");
    caja.appendChild(icono);
    caja.appendChild(crear("span", "cos-flecha-texto", rumbo || ""));
    caja.title = `${etiqueta} ${rumbo || ""} (${Math.round(gradosProcedencia)}°)`;
    return caja;
}


/* ------------------------------------------------------------
   Oleaje y estado de las estaciones
   ------------------------------------------------------------ */

/* Escala de la gama «Mar y arena»: del turquesa claro de la mar en calma
 * al azul de noche de la mar gruesa. Tramos de la escala Douglas. */
export const TRAMOS_OLA = [
    { hasta: 0.5, color: "#8ad9d2", nombre: "Hasta 0,5 m · rizada o marejadilla" },
    { hasta: 1.25, color: "#2fb3ae", nombre: "0,5 a 1,25 m · marejada" },
    { hasta: 2.5, color: "#1b80b5", nombre: "1,25 a 2,5 m · fuerte marejada" },
    { hasta: 4, color: "#1d4f8c", nombre: "2,5 a 4 m · mar gruesa" },
    { hasta: Infinity, color: "#14284f", nombre: "Más de 4 m · muy gruesa o más" }
];

export const SIN_DATO = "#b9b2a6";

export function colorOla(altura) {
    if (altura === null || altura === undefined) return SIN_DATO;
    return TRAMOS_OLA.find(tramo => altura <= tramo.hasta).color;
}

export const NOMBRES_ESTADO = {
    ACTIVA: "Midiendo",
    RETRASADA: "Con retraso",
    SIN_DATOS: "Sin datos recientes"
};

export function pastillaEstado(estado) {
    return crear("span", `cos-estado estado-${estado || "SIN_DATOS"}`, NOMBRES_ESTADO[estado] || "Sin datos");
}

/* Alertas de Portus: 1 es normal; de 2 en adelante, a tener en cuenta. */
export function textoAlerta(nivel) {
    if (!nivel || nivel <= 1) return null;
    if (nivel === 2) return "Aviso";
    if (nivel === 3) return "Alerta";
    return "Alerta alta";
}


/* ------------------------------------------------------------
   Leaflet bajo demanda
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


/* ------------------------------------------------------------
   Selector de playa (buscador sin acentos)
   ------------------------------------------------------------ */

export function sinAcentos(texto) {
    return (texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function nombrePlaya(playa) {
    return playa.municipio ? `${playa.nombre} (${playa.municipio})` : playa.nombre;
}

/*
 * Caja de búsqueda con la lista de coincidencias debajo. Llama a
 * alElegir(playa) al tocar una. Hasta 30 resultados; con menos de dos
 * letras no busca.
 */
export function buscadorPlayas(playas, alElegir, valorInicial = "") {
    const caja = crear("div", "cos-buscador");
    const etiqueta = crear("label", "cos-buscador-etiqueta", "Busca una playa o un municipio");
    const entrada = crear("input", "cos-buscador-entrada");
    entrada.type = "search";
    entrada.placeholder = "Por ejemplo, Burriana, Zahara o Mónsul";
    entrada.autocomplete = "off";
    entrada.value = valorInicial;
    etiqueta.appendChild(entrada);
    caja.appendChild(etiqueta);

    const lista = crear("ul", "cos-buscador-lista");
    lista.setAttribute("role", "listbox");
    caja.appendChild(lista);

    function pintar() {
        vaciar(lista);
        const texto = sinAcentos(entrada.value.trim());
        if (texto.length < 2) return;
        const halladas = playas
            .filter(playa => sinAcentos(`${playa.nombre} ${playa.municipio || ""} ${playa.provincia}`).includes(texto))
            .slice(0, 30);
        if (!halladas.length) {
            lista.appendChild(crear("li", "cos-buscador-vacio", "No hay ninguna playa con ese nombre."));
            return;
        }
        for (const playa of halladas) {
            const elemento = crear("li");
            const boton = crear("button", "cos-buscador-opcion");
            boton.type = "button";
            boton.appendChild(crear("strong", null, playa.nombre));
            boton.appendChild(crear("span", null, `${playa.municipio ? `${playa.municipio} · ` : ""}${playa.provincia}`));
            boton.addEventListener("click", () => {
                entrada.value = nombrePlaya(playa);
                vaciar(lista);
                alElegir(playa);
            });
            elemento.appendChild(boton);
            lista.appendChild(elemento);
        }
    }

    entrada.addEventListener("input", pintar);
    return caja;
}

/* Desplegable sencillo por provincias, para mareas. */
export function desplegablePlayas(playas, elegida, alCambiar) {
    const etiqueta = crear("label", "cos-desplegable");
    etiqueta.appendChild(crear("span", null, "Playa"));
    const lista = crear("select");
    let grupo = null;
    for (const playa of [...playas].sort((a, b) => a.longitud - b.longitud)) {
        if (!grupo || grupo.label !== playa.provincia) {
            grupo = crear("optgroup");
            grupo.label = playa.provincia;
            lista.appendChild(grupo);
        }
        const opcion = crear("option", null, nombrePlaya(playa));
        opcion.value = String(playa.id);
        opcion.selected = String(playa.id) === String(elegida);
        grupo.appendChild(opcion);
    }
    lista.addEventListener("change", () => alCambiar(lista.value));
    etiqueta.appendChild(lista);
    return etiqueta;
}


/* Fin de fichero: js/costas/comun.js */
