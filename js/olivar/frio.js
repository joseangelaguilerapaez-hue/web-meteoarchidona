/*
 * MeteoArchidona · Componente «Frío acumulado»
 *
 * Curva del frío que va acumulando el olivo en la temporada (del 1 de
 * octubre al 31 de marzo) frente a las temporadas anteriores, por
 * estación. Se puede ver en horas por debajo de 7,2 °C o en unidades de
 * frío de De Melo-Abreu (2004), con la referencia orientativa de la
 * Picual (unas 469 unidades) para saber si el invierno va dando el frío
 * que necesita la floración.
 *
 *     <div data-componente="olivar-frio"></div>                       (El Silo, horas, 3 temporadas)
 *     <div data-componente="olivar-frio" data-estacion="LOS_LLANOS" data-modelo="UNIDADES"></div>
 *     <div data-componente="olivar-frio" data-temporadas="5" data-selector="no" data-titulo="no"></div>
 *
 * Con selector (por defecto) se puede cambiar de estación y de modelo
 * dentro del propio componente. Se dibuja en SVG al ancho real del hueco
 * y se vuelve a dibujar si cambia.
 *
 * API: GET /olivar/frio?estacion&temporadas
 */

import {
    pedir, crear, vaciar, aviso, prepararRaiz, pie, leerEstacion,
    entero, fechaLarga, MESES, ESTACIONES, NOMBRES_ESTACION, FUENTE_ESTACIONES
} from "./comun.js?v=20261109-olivar2";


const NS = "http://www.w3.org/2000/svg";

const DIAS_TEMPORADA = 182;

const MODELOS = {
    HORAS: { nombre: "Horas por debajo de 7,2 °C", corto: "h", campo: "horas_acumuladas", total: "horas_frio" },
    UNIDADES: { nombre: "Unidades de frío (De Melo-Abreu)", corto: "unidades", campo: "unidades_acumuladas", total: "unidades_frio" }
};

function svg(etiqueta, atributos = {}, clase) {
    const nodo = document.createElementNS(NS, etiqueta);
    for (const [clave, valor] of Object.entries(atributos)) nodo.setAttribute(clave, valor);
    if (clase) nodo.setAttribute("class", clase);
    return nodo;
}

function colorTemporada(indice) {
    return `var(--oli-temporada-${Math.min(indice, 3)})`;
}


export function dibujarFrio(datos, modelo, ancho) {
    const definicion = MODELOS[modelo];
    const alto = Math.round(Math.max(220, Math.min(320, ancho * 0.48)));
    const margen = { arriba: 14, derecha: 14, abajo: 24, izquierda: 46 };
    const anchoUtil = ancho - margen.izquierda - margen.derecha;
    const altoUtil = alto - margen.arriba - margen.abajo;
    const conReferencia = modelo === "UNIDADES" && datos.referencia_picual;

    let tope = conReferencia ? datos.referencia_picual : 0;
    for (const temporada of datos.temporadas) {
        for (const dia of temporada.dias) tope = Math.max(tope, dia[definicion.campo]);
    }
    tope = Math.max(10, tope * 1.1);

    const x = dia => margen.izquierda + (dia / (DIAS_TEMPORADA - 1)) * anchoUtil;
    const y = valor => margen.arriba + (1 - Math.max(0, Math.min(tope, valor)) / tope) * altoUtil;

    const lienzo = svg("svg", {
        viewBox: `0 0 ${ancho} ${alto}`,
        role: "img",
        "aria-label": `${definicion.nombre} acumuladas en ${datos.nombre}, temporada a temporada`
    });

    for (let i = 0; i <= 4; i++) {
        const valor = (tope / 4) * i;
        const posicion = y(valor);
        lienzo.appendChild(svg("line", { x1: margen.izquierda, x2: ancho - margen.derecha, y1: posicion, y2: posicion }, i === 0 ? "eje" : "rejilla"));
        const texto = svg("text", { x: margen.izquierda - 6, y: posicion + 3, "text-anchor": "end" }, "texto-eje");
        texto.textContent = entero(valor);
        lienzo.appendChild(texto);
    }

    // Meses de octubre a marzo, a mitad de cada uno.
    const inicioMeses = [0, 31, 61, 92, 123, 151];
    [9, 10, 11, 0, 1, 2].forEach((mes, indice) => {
        const texto = svg("text", { x: x(inicioMeses[indice] + 15), y: alto - 6, "text-anchor": "middle" }, "texto-eje");
        texto.textContent = MESES[mes];
        lienzo.appendChild(texto);
    });

    if (conReferencia && datos.referencia_picual < tope) {
        const posicion = y(datos.referencia_picual);
        lienzo.appendChild(svg("line", { x1: margen.izquierda, x2: ancho - margen.derecha, y1: posicion, y2: posicion }, "referencia"));
        const texto = svg("text", { x: margen.izquierda + 6, y: posicion - 5 }, "texto-referencia");
        texto.textContent = `Picual, unas ${entero(datos.referencia_picual)}`;
        lienzo.appendChild(texto);
    }

    // De la más antigua a la actual, para que la actual quede encima.
    datos.temporadas.slice().reverse().forEach((temporada, posicionInvertida) => {
        const indice = datos.temporadas.length - 1 - posicionInvertida;
        if (!temporada.dias.length) return;

        let d = "";
        for (const dia of temporada.dias) {
            d += `${d ? "L" : "M"}${x(dia.dia).toFixed(1)},${y(dia[definicion.campo]).toFixed(1)}`;
        }

        if (indice === 0) {
            const primero = temporada.dias[0];
            const ultimo = temporada.dias[temporada.dias.length - 1];
            lienzo.appendChild(svg("path", {
                d: `${d}L${x(ultimo.dia).toFixed(1)},${y(0).toFixed(1)}L${x(primero.dia).toFixed(1)},${y(0).toFixed(1)}Z`
            }, "area-actual"));
        }

        const curva = svg("path", { d, style: `stroke: ${colorTemporada(indice)}` }, indice === 0 ? "curva actual" : "curva");
        const ayuda = svg("title");
        ayuda.textContent = `${temporada.temporada}: ${entero(temporada[definicion.total])} ${definicion.corto}`;
        curva.appendChild(ayuda);
        lienzo.appendChild(curva);

        if (indice === 0) {
            const ultimo = temporada.dias[temporada.dias.length - 1];
            const punto = svg("circle", { cx: x(ultimo.dia).toFixed(1), cy: y(ultimo[definicion.campo]).toFixed(1), r: 4.5 }, "hoy");
            const ayudaPunto = svg("title");
            ayudaPunto.textContent = `${fechaLarga(ultimo.fecha)}: ${entero(ultimo[definicion.campo])} ${definicion.corto}`;
            punto.appendChild(ayudaPunto);
            lienzo.appendChild(punto);
        }
    });

    return lienzo;
}


const pintadas = new WeakMap();

function pintarGrafica(caja, datos, modelo) {
    const primera = !pintadas.has(caja);
    pintadas.set(caja, { datos, modelo });

    const dibujar = () => {
        const ancho = Math.max(280, Math.round(caja.clientWidth || 600));
        const actual = pintadas.get(caja);
        vaciar(caja);
        caja.appendChild(dibujarFrio(actual.datos, actual.modelo, ancho));
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


function resumen(datos, modelo) {
    const definicion = MODELOS[modelo];
    const actual = datos.temporadas[0];
    if (!actual || !actual.dias.length) return "Todavía no hay frío calculado en esta estación.";

    const ultimo = actual.dias[actual.dias.length - 1];
    let texto = `${actual.temporada}: ${entero(ultimo[definicion.campo])} ${definicion.corto} hasta el ${fechaLarga(ultimo.fecha)}`;

    const anterior = datos.temporadas[1];
    if (anterior) {
        const mismaFecha = anterior.dias.filter(dia => dia.dia <= ultimo.dia).pop();
        if (mismaFecha) {
            texto += `; en ${anterior.temporada}, a estas alturas, ${entero(mismaFecha[definicion.campo])}`;
        }
    } else {
        texto += ". Aún no hay otra temporada con la que comparar en esta estación";
    }

    return `${texto}.`;
}


export async function montarFrioOlivar(raiz) {
    prepararRaiz(raiz, "olivar-frio");
    aviso(raiz, "Cargando el frío acumulado…");

    let estacion = leerEstacion(raiz);
    let modelo = (raiz.dataset.modelo || "HORAS").toUpperCase() === "UNIDADES" ? "UNIDADES" : "HORAS";
    const temporadas = Math.max(1, Math.min(10, parseInt(raiz.dataset.temporadas, 10) || 3));
    const conSelector = raiz.dataset.selector !== "no";

    raiz.textContent = "";
    const cabeza = crear("div");
    raiz.appendChild(cabeza);

    if (conSelector) {
        const controles = crear("div", "oli-controles");

        const etiquetaEstacion = crear("label", null, "Estación");
        const selectorEstacion = crear("select");
        for (const codigo of ESTACIONES) {
            const opcion = crear("option", null, NOMBRES_ESTACION[codigo]);
            opcion.value = codigo;
            selectorEstacion.appendChild(opcion);
        }
        selectorEstacion.value = estacion;
        etiquetaEstacion.appendChild(selectorEstacion);
        controles.appendChild(etiquetaEstacion);

        const etiquetaModelo = crear("label", null, "Medida");
        const selectorModelo = crear("select");
        for (const [clave, definicion] of Object.entries(MODELOS)) {
            const opcion = crear("option", null, definicion.nombre);
            opcion.value = clave;
            selectorModelo.appendChild(opcion);
        }
        selectorModelo.value = modelo;
        etiquetaModelo.appendChild(selectorModelo);
        controles.appendChild(etiquetaModelo);

        selectorEstacion.addEventListener("change", () => { estacion = selectorEstacion.value; pintar(); });
        selectorModelo.addEventListener("change", () => { modelo = selectorModelo.value; pintar(); });
        raiz.appendChild(controles);
    }

    const texto = crear("p", "oli-aviso");
    const caja = crear("div", "oli-grafica");
    const leyenda = crear("p", "oli-leyenda");
    raiz.appendChild(texto);
    raiz.appendChild(caja);
    raiz.appendChild(leyenda);
    pie(raiz, `Temporada del 1 de octubre al 31 de marzo · ${FUENTE_ESTACIONES}`);

    async function pintar() {
        let datos;
        try {
            datos = await pedir(`/olivar/frio?estacion=${estacion}&temporadas=${temporadas}`);
        } catch (error) {
            texto.textContent = "No se ha podido leer el frío acumulado. Se puede volver a intentar más tarde.";
            vaciar(caja);
            vaciar(leyenda);
            return;
        }

        vaciar(cabeza);
        if (raiz.dataset.titulo !== "no") {
            cabeza.appendChild(crear("div", "oli-etiqueta", `Frío acumulado · ${datos.nombre}`));
            cabeza.appendChild(crear("h3", "oli-titulo", MODELOS[modelo].nombre));
        }

        texto.textContent = resumen(datos, modelo);

        vaciar(leyenda);
        datos.temporadas.forEach((temporada, indice) => {
            const marca = crear("span", null, indice === 0 ? `${temporada.temporada} (esta)` : temporada.temporada);
            marca.style.setProperty("--oli-color", colorTemporada(indice));
            leyenda.appendChild(marca);
        });
        if (modelo === "UNIDADES") leyenda.appendChild(crear("span", "oli-leyenda-referencia", "Lo que necesita la Picual (orientativo)"));

        if (!datos.temporadas.length) {
            vaciar(caja);
            return;
        }

        pintarGrafica(caja, datos, modelo);
    }

    await pintar();
}


/* Fin de fichero: js/olivar/frio.js */
