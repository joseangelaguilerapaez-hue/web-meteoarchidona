/*
 * MeteoArchidona · Componente «Polen semana a semana»
 *
 * Gráfica de un tipo de polen a lo largo de un año, medido por la
 * Universidad de Granada: barras con la media de cada semana (con el
 * color de su nivel), la línea de lo normal (media de esa semana en
 * otros años), una franja hasta el máximo de otros años y las rayas de
 * los umbrales de ese tipo.
 *
 *     <div data-componente="polen-serie"></div>                          (olivo, Granada, año actual)
 *     <div data-componente="polen-serie" data-tipo="CIPRES" data-anio="2026"></div>
 *     <div data-componente="polen-serie" data-selector="no" data-titulo="no"></div>
 *
 * Con selector (por defecto) se puede cambiar de tipo y de año dentro
 * del propio componente. Se dibuja en SVG al ancho real del hueco y se
 * vuelve a dibujar si cambia.
 *
 * API: GET /polen/recuentos/serie?estacion&tipo&anio, /polen/tipos y
 * /polen/estaciones.
 */

import {
    pedir, crear, vaciar, aviso, prepararRaiz, pie,
    leerEstacion, granos, centroSemana, MESES, TIPO_DEFECTO, FUENTE_UGR, NOMBRES_NIVEL
} from "./comun.js?v=20261106-polen1";


const NS = "http://www.w3.org/2000/svg";

function svg(etiqueta, atributos = {}, clase) {
    const nodo = document.createElementNS(NS, etiqueta);
    for (const [clave, valor] of Object.entries(atributos)) nodo.setAttribute(clave, valor);
    if (clase) nodo.setAttribute("class", clase);
    return nodo;
}


export function dibujarSerie(datos, ancho) {
    const alto = Math.round(Math.max(220, Math.min(320, ancho * 0.45)));
    const margen = { arriba: 12, derecha: 12, abajo: 24, izquierda: 44 };
    const anchoUtil = ancho - margen.izquierda - margen.derecha;
    const altoUtil = alto - margen.arriba - margen.abajo;
    const umbrales = datos.tipo.umbrales;

    let tope = umbrales.alto;
    for (const semana of datos.semanas) {
        tope = Math.max(tope, semana.media || 0, semana.media_historica || 0);
    }
    tope *= 1.12;

    const paso = anchoUtil / 53;
    const x = semana => margen.izquierda + (semana - 1) * paso;
    const y = valor => margen.arriba + (1 - Math.max(0, Math.min(tope, valor)) / tope) * altoUtil;

    const lienzo = svg("svg", {
        viewBox: `0 0 ${ancho} ${alto}`,
        role: "img",
        "aria-label": `Polen de ${datos.tipo.nombre} en ${datos.nombre_estacion}, ${datos.anio}, semana a semana`
    });

    // Rejilla: cuatro rayas horizontales con su cifra.
    for (let i = 0; i <= 4; i++) {
        const valor = (tope / 4) * i;
        const posicion = y(valor);
        lienzo.appendChild(svg("line", { x1: margen.izquierda, x2: ancho - margen.derecha, y1: posicion, y2: posicion }, i === 0 ? "eje" : "rejilla"));
        const texto = svg("text", { x: margen.izquierda - 6, y: posicion + 3, "text-anchor": "end" }, "texto-eje");
        texto.textContent = granos(valor, false);
        lienzo.appendChild(texto);
    }

    // Meses debajo.
    for (let mes = 0; mes < 12; mes++) {
        const dia = (Date.UTC(datos.anio, mes, 15) - Date.UTC(datos.anio, 0, 1)) / 86400000;
        const texto = svg("text", { x: margen.izquierda + (dia / 7) * paso, y: alto - 6, "text-anchor": "middle" }, "texto-eje");
        texto.textContent = MESES[mes];
        lienzo.appendChild(texto);
    }

    // Franja hasta el máximo de otros años.
    const conMaximo = datos.semanas.filter(semana => semana.maximo_historico !== null && semana.maximo_historico !== undefined);
    if (conMaximo.length) {
        let d = `M${x(conMaximo[0].semana) + paso / 2},${y(0)}`;
        for (const semana of conMaximo) d += `L${(x(semana.semana) + paso / 2).toFixed(1)},${y(semana.maximo_historico).toFixed(1)}`;
        d += `L${x(conMaximo[conMaximo.length - 1].semana) + paso / 2},${y(0)}Z`;
        lienzo.appendChild(svg("path", { d }, "banda-maximo"));
    }

    // Umbrales.
    for (const [nivel, valor] of [["MEDIO", umbrales.bajo], ["ALTO", umbrales.medio], ["EXTREMO", umbrales.alto]]) {
        if (valor >= tope) continue;
        lienzo.appendChild(svg("line", { x1: margen.izquierda, x2: ancho - margen.derecha, y1: y(valor), y2: y(valor) }, `umbral nivel-${nivel}`));
    }

    // Barras de este año.
    for (const semana of datos.semanas) {
        if (semana.media === null || semana.media === undefined) continue;
        const arriba = y(semana.media);
        const barra = svg("rect", {
            x: (x(semana.semana) + paso * 0.12).toFixed(1),
            y: arriba.toFixed(1),
            width: Math.max(1, paso * 0.76).toFixed(1),
            height: Math.max(0, y(0) - arriba).toFixed(1),
            rx: 1.5
        }, `barra-semana nivel-${semana.nivel || "NULO"}`);
        const ayuda = svg("title");
        ayuda.textContent = `Semana ${semana.semana}: ${granos(semana.media)} (${NOMBRES_NIVEL[semana.nivel] || "—"}); lo normal, ${granos(semana.media_historica)}`;
        barra.appendChild(ayuda);
        lienzo.appendChild(barra);
    }

    // Lo normal.
    let d = "";
    let dentro = false;
    for (const semana of datos.semanas) {
        if (semana.media_historica === null || semana.media_historica === undefined) {
            dentro = false;
            continue;
        }
        d += `${dentro ? "L" : "M"}${(x(semana.semana) + paso / 2).toFixed(1)},${y(semana.media_historica).toFixed(1)}`;
        dentro = true;
    }
    if (d) lienzo.appendChild(svg("path", { d }, "linea-normal"));

    return lienzo;
}


/* Lo que tiene pintado cada gráfica: al cambiar de tipo o de año se
 * cambian los datos, pero el vigilante del ancho es uno solo. */
const pintadas = new WeakMap();

function pintarGrafica(caja, datos) {
    const primera = !pintadas.has(caja);
    pintadas.set(caja, datos);

    const dibujar = () => {
        const ancho = Math.max(280, Math.round(caja.clientWidth || 600));
        vaciar(caja);
        caja.appendChild(dibujarSerie(pintadas.get(caja), ancho));
    };

    dibujar();

    if (primera && "ResizeObserver" in window) {
        let espera = null;
        new ResizeObserver(() => {
            clearTimeout(espera);
            espera = setTimeout(dibujar, 120);
        }).observe(caja);
    }
}


function resumen(datos) {
    const medidas = datos.semanas.filter(semana => semana.media !== null && semana.media !== undefined);
    if (!medidas.length) return `Todavía no hay semanas medidas de ${datos.tipo.nombre.toLowerCase()} en ${datos.anio}.`;
    const pico = medidas.reduce((mayor, semana) => (semana.media > mayor.media ? semana : mayor));
    const fecha = centroSemana(datos.anio, pico.semana).toLocaleDateString("es-ES", { timeZone: "UTC", day: "numeric", month: "long" });
    return `Pico del año: ${granos(pico.media)} en la semana ${pico.semana} (hacia el ${fecha}), nivel ${(NOMBRES_NIVEL[pico.nivel] || "—").toLowerCase()}.`;
}


export async function montarPolenSerie(raiz) {
    prepararRaiz(raiz, "polen-serie");
    aviso(raiz, "Cargando la gráfica del polen…");

    const estacion = leerEstacion(raiz);
    const conSelector = raiz.dataset.selector !== "no";
    let tipo = (raiz.dataset.tipo || TIPO_DEFECTO).toUpperCase();
    let anio = parseInt(raiz.dataset.anio, 10) || null;

    let tipos;
    let estaciones;

    try {
        [tipos, estaciones] = await Promise.all([pedir("/polen/tipos"), pedir("/polen/estaciones")]);
    } catch (error) {
        aviso(raiz, "No se han podido leer los recuentos de polen. Se puede volver a intentar más tarde.", true);
        return;
    }

    const datosEstacion = estaciones.find(otra => otra.codigo === estacion);
    const anios = datosEstacion ? [...datosEstacion.anios].reverse() : [];
    anio = anio || (datosEstacion && datosEstacion.ultimo_anio) || new Date().getFullYear();

    raiz.textContent = "";
    const cabeza = crear("div");
    raiz.appendChild(cabeza);

    let controles = null;
    if (conSelector) {
        controles = crear("div", "pol-controles");

        const etiquetaTipo = crear("label", null, "Polen");
        const selectorTipo = crear("select");
        for (const opcion of tipos) {
            const elemento = crear("option", null, opcion.nombre);
            elemento.value = opcion.codigo;
            selectorTipo.appendChild(elemento);
        }
        selectorTipo.value = tipo;
        etiquetaTipo.appendChild(selectorTipo);
        controles.appendChild(etiquetaTipo);

        const etiquetaAnio = crear("label", null, "Año");
        const selectorAnio = crear("select");
        for (const opcion of anios.length ? anios : [anio]) {
            const elemento = crear("option", null, String(opcion));
            elemento.value = String(opcion);
            selectorAnio.appendChild(elemento);
        }
        selectorAnio.value = String(anio);
        etiquetaAnio.appendChild(selectorAnio);
        controles.appendChild(etiquetaAnio);

        selectorTipo.addEventListener("change", () => { tipo = selectorTipo.value; pintar(); });
        selectorAnio.addEventListener("change", () => { anio = parseInt(selectorAnio.value, 10); pintar(); });
        raiz.appendChild(controles);
    }

    const texto = crear("p", "pol-aviso");
    const caja = crear("div", "pol-grafica");
    raiz.appendChild(texto);
    raiz.appendChild(caja);

    const leyenda = crear("p", "pol-leyenda");
    leyenda.appendChild(crear("span", "nivel-ALTO", "Media de cada semana"));
    leyenda.appendChild(crear("span", "pol-leyenda-normal", "Lo normal (otros años)"));
    raiz.appendChild(leyenda);

    pie(raiz, `Captador de ${datosEstacion ? datosEstacion.nombre : estacion} · ${FUENTE_UGR} · g/m³`);

    async function pintar() {
        let datos;
        try {
            datos = await pedir(`/polen/recuentos/serie?estacion=${encodeURIComponent(estacion)}&tipo=${encodeURIComponent(tipo)}&anio=${anio}`);
        } catch (error) {
            texto.textContent = error.estado === 404 ? "Ese tipo de polen o esa estación no existen." : "No se ha podido leer la gráfica.";
            vaciar(caja);
            return;
        }

        vaciar(cabeza);
        if (raiz.dataset.titulo !== "no") {
            cabeza.appendChild(crear("div", "pol-etiqueta", `Polen semana a semana · ${datos.nombre_estacion}`));
            cabeza.appendChild(crear("h3", "pol-titulo", `${datos.tipo.nombre} en ${datos.anio}`));
        }

        texto.textContent = resumen(datos);
        pintarGrafica(caja, datos);
    }

    await pintar();
}


/* Fin de fichero: js/polen/serie.js */
