/*
 * MeteoArchidona · Predicción estacional · piezas comunes
 *
 * Lo que comparten los componentes de la pestaña «Estacional» de Predicción
 * (js/estacional/*.js): la petición a la API con caché, las frases de los
 * escenarios, la barra de colores, la cita a Copernicus y la hoja de estilos.
 *
 * Datos (docs/prediccion-estacional.md de api-meteoarchidona): predicciones
 * estacionales multisistema del Servicio de Cambio Climático de Copernicus
 * (C3S) para Archidona, los tres meses siguientes a la salida y el
 * trimestre. Decisiones de José (14 y 15-11-2026): escenarios, no
 * porcentajes; barra con tramos de anchura proporcional y sin números;
 * dejar claro que acierta más con la temperatura que con la lluvia y citar
 * siempre a Copernicus.
 *
 * La barra (pintarBarra) es reutilizable con otro origen: está pensada para
 * poner un día, una debajo de otra, «Modelos» y «Cabañuelas».
 *
 * Hoja de estilos: cada componente se asegura de que esté cargada
 * css/estacional.css, así se ve igual en la pestaña que en un dashboard.
 */

const HOJA = "/css/estacional.css?v=20261115-estacional1";

const CACHE_MS = 30 * 60 * 1000;

const ESPERA_MAXIMA_MS = 20000;

export const CITA =
    "Generado con información del Servicio de Cambio Climático de Copernicus (C3S): " +
    "predicciones estacionales multisistema. Referencia local: Climatología de MeteoArchidona.";

export const AVISO_CORTO =
    "Tendencias de meses enteros para la zona, no el tiempo de un día. Acierta más con la temperatura que con la lluvia.";

export const VARIABLES = {
    TEMPERATURA: { clave: "temperatura", nombre: "Temperatura" },
    LLUVIA: { clave: "lluvia", nombre: "Lluvia" }
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

/* Los componentes de una misma página comparten la petición. */
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

/* data-salida="2026-11" fija una salida; por defecto, la más reciente. */
function consulta(raiz) {
    const salida = (raiz.dataset.salida || "").trim();
    return /^\d{4}-\d{2}$/.test(salida) ? `?salida=${salida}` : "";
}

export function pedirUltima(raiz) {
    return pedir(`/estacional/ultima${consulta(raiz)}`);
}

export function pedirSistemas(raiz) {
    return pedir(`/estacional/sistemas${consulta(raiz)}`);
}

export function textoError(error) {
    if (error && error.estado === 404) return "Aún no hay predicción estacional publicada.";
    return "No se ha podido leer la predicción estacional. Prueba dentro de un rato.";
}


/* ------------------------------------------------------------
   Cifras y frases (sin porcentajes)
   ------------------------------------------------------------ */

const formatoDecimal = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const formatoEntero = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

export function grados(valor) {
    if (valor === null || valor === undefined) return "—";
    return `${formatoDecimal.format(valor)} °C`;
}

export function diferencia(valor) {
    if (valor === null || valor === undefined) return "—";
    return `${valor > 0 ? "+" : valor < 0 ? "−" : ""}${formatoDecimal.format(Math.abs(valor))} °C`;
}

export function litros(valor) {
    if (valor === null || valor === undefined) return "—";
    return `${formatoEntero.format(Math.round(valor))} l/m²`;
}

/* «unos 9,5 °C» redondeado a medio grado; «unos 280 l/m²» a la decena. */
export function orientativo(variable, valor) {
    if (valor === null || valor === undefined) return null;
    if (variable === "TEMPERATURA") {
        return `unos ${grados(Math.round(valor * 2) / 2)}`;
    }
    return `unos ${litros(Math.round(valor / 10) * 10)}`;
}

/* Primera letra en mayúscula: «Diciembre de 2026». */
export function capital(texto) {
    return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}

/* «un trimestre», «un mes» */
function sujeto(periodo) {
    return periodo.tipo === "TRIMESTRE" ? "un trimestre" : "un mes";
}

/*
 * La frase del escenario, como en Modelos numéricos: «El escenario más
 * probable es un trimestre más cálido de lo normal; uno normal es poco
 * probable y uno más frío, muy poco probable.»
 */
export function frase(periodo, escenario) {
    if (!escenario) return "";

    if (escenario.escenario === "SIN_SENAL") {
        const palabras = escenario.tramos.map(t => `${t.nombre.toLowerCase()}, ${t.etiqueta}`).join("; ");
        return `Sin señal clara: los modelos no se deciden (${palabras}).`;
    }

    // Primero el normal y después el contrario: «uno normal es posible y uno más frío, poco probable».
    const otros = escenario.tramos
        .filter(t => t.categoria !== escenario.escenario)
        .sort((a, b) => (a.categoria === "NORMAL" ? -1 : 0) - (b.categoria === "NORMAL" ? -1 : 0));
    const resto = otros.map((t, i) => {
        const nombre = t.categoria === "NORMAL" ? "uno normal" : `uno ${t.nombre.toLowerCase()}`;
        return i === 0 ? `${nombre} es ${t.etiqueta}` : `${nombre}, ${t.etiqueta}`;
    });

    return `El escenario más probable es ${sujeto(periodo)} ${escenario.nombre_escenario}; ${resto.join(" y ")}.`;
}

/* «7 de 9 modelos coinciden» */
export function acuerdo(escenario) {
    if (!escenario) return "";
    // Sin señal clara, «5 de 9 coinciden» no dice en qué: mejor decirlo así.
    if (escenario.escenario === "SIN_SENAL") return "Los modelos no se ponen de acuerdo";
    if (escenario.modelos === 1) return "Con un solo modelo";
    if (escenario.modelos_de_acuerdo === escenario.modelos) return `Los ${escenario.modelos} modelos coinciden`;
    return `${escenario.modelos_de_acuerdo} de ${escenario.modelos} modelos coinciden`;
}

/* «Lo normal en Archidona: 8,0 °C · ahora, unos 9,5 °C» */
export function referenciaLocal(variable, escenario) {
    if (!escenario || escenario.normal_local === null || escenario.normal_local === undefined) return "";
    const normal = variable === "TEMPERATURA" ? grados(escenario.normal_local) : litros(escenario.normal_local);
    const valor = orientativo(variable, escenario.valor_orientativo);
    return `Lo normal en Archidona: ${normal}` + (valor ? ` · según los modelos, ${valor}` : "");
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
    nodo.appendChild(crear("p", error ? "est-aviso error" : "est-aviso", texto));
}

export function asegurarHoja() {
    if (document.querySelector('link[href*="css/estacional.css"]')) {
        return;
    }

    const enlace = document.createElement("link");
    enlace.rel = "stylesheet";
    enlace.href = HOJA;
    document.head.appendChild(enlace);
}

/* Raíz común de todos los componentes de la predicción estacional. */
export function prepararRaiz(raiz, clase) {
    asegurarHoja();
    raiz.classList.add("est-componente", clase);
    vaciar(raiz);
}

/* Título opcional (data-titulo="no" lo quita). */
export function titulo(raiz, etiqueta, texto) {
    if (raiz.dataset.titulo === "no") return;
    const cabeza = crear("div", "est-cabeza");
    cabeza.appendChild(crear("div", "est-etiqueta", etiqueta));
    cabeza.appendChild(crear("h3", "est-titulo", texto));
    raiz.appendChild(cabeza);
}

/* Cita a Copernicus: va siempre (José, 14-11-2026). */
export function pie(raiz, datos) {
    const nodo = crear("p", "est-pie");
    const salida = datos && datos.nombre_salida ? `Salida de ${datos.nombre_salida}. ` : "";
    nodo.textContent = `${salida}${CITA}`;
    raiz.appendChild(nodo);
}

/*
 * Barra de colores con los tres escenarios. Los tramos tienen el ancho de
 * lo probable que es cada uno, sin números (José, 15-11-2026); el más
 * probable va resaltado y los nombres van debajo, con su palabra.
 *
 *     pintarBarra(contenedor, escenario, {variable: "TEMPERATURA", origen: "Modelos"})
 *
 * `escenario` es el de la API: {escenario, tramos: [{categoria, nombre,
 * etiqueta, probabilidad}]}. Sirve igual para otra fuente (Cabañuelas)
 * con los mismos campos.
 */
export function pintarBarra(contenedor, escenario, { variable = "TEMPERATURA", origen = "" } = {}) {
    const bloque = crear("div", `est-barra-bloque est-${variable === "LLUVIA" ? "lluvia" : "temperatura"}`);

    if (origen) {
        bloque.appendChild(crear("div", "est-barra-origen", origen));
    }

    const barra = crear("div", "est-barra");
    barra.setAttribute("role", "img");
    barra.setAttribute(
        "aria-label",
        escenario.tramos.map(t => `${t.nombre}: ${t.etiqueta}`).join(". ")
    );

    const leyenda = crear("div", "est-leyenda");

    for (const tramo of escenario.tramos) {
        const clase = tramo.categoria.toLowerCase();
        const destacado = tramo.categoria === escenario.escenario;

        const segmento = crear("span", `est-tramo est-tramo-${clase}${destacado ? " destacado" : ""}`);
        // Un mínimo para que ningún escenario desaparezca del todo.
        segmento.style.flexGrow = String(Math.max(tramo.probabilidad, 0.03));
        barra.appendChild(segmento);

        const elemento = crear("span", `est-leyenda-item${destacado ? " destacado" : ""}`);
        elemento.appendChild(crear("span", `est-punto est-tramo-${clase}`));
        elemento.appendChild(crear("span", "est-leyenda-nombre", tramo.nombre));
        elemento.appendChild(crear("span", "est-leyenda-etiqueta", tramo.etiqueta));
        leyenda.appendChild(elemento);
    }

    bloque.appendChild(barra);
    bloque.appendChild(leyenda);
    contenedor.appendChild(bloque);
    return bloque;
}

/* Temperatura o lluvia de un periodo: frase, barra y referencia local. */
export function pintarVariable(contenedor, periodo, variable, { compacto = false } = {}) {
    const datos = periodo[VARIABLES[variable].clave];
    const caja = crear("div", `est-variable est-${VARIABLES[variable].clave}`);
    caja.appendChild(crear("div", "est-variable-nombre", VARIABLES[variable].nombre));

    if (!datos) {
        caja.appendChild(crear("p", "est-aviso", "Sin datos."));
        contenedor.appendChild(caja);
        return caja;
    }

    if (compacto) {
        caja.appendChild(crear("p", "est-escenario", capital(
            datos.escenario === "SIN_SENAL" ? "sin señal clara" : datos.nombre_escenario
        )));
    } else {
        caja.appendChild(crear("p", "est-frase", frase(periodo, datos)));
    }

    pintarBarra(caja, datos, { variable });

    const detalles = [acuerdo(datos), referenciaLocal(variable, datos)].filter(Boolean);
    if (variable === "TEMPERATURA" && !compacto) {
        detalles.unshift(`Diferencia con lo normal: ${diferencia(datos.anomalia)}`);
    }
    caja.appendChild(crear("p", "est-detalle", detalles.join(" · ")));

    contenedor.appendChild(caja);
    return caja;
}


/* Fin de fichero: js/estacional/comun.js */
