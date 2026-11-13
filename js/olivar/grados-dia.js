/*
 * MeteoArchidona · Componente «Grados-día»
 *
 * Curva del calor que va acumulando el año desde el 1 de enero (José,
 * 9-11-2026), por estación, frente al año anterior:
 *
 *   - olivo: grados por encima de 10 °C, para seguir el desarrollo del
 *     cultivo (brotación, floración, cuajado…);
 *   - mosca del olivo: grados entre 9 y 35 °C; cada unos 379 grados-día
 *     (Crovetti, 1987) cabe una generación de huevo a adulto, que se marca
 *     con rayas. Es orientativo: lo que manda son las capturas en trampa.
 *
 * Se cuentan con cada medición de cinco minutos, no con la media del día.
 *
 *     <div data-componente="olivar-grados-dia"></div>                         (El Silo, olivo, 2 años)
 *     <div data-componente="olivar-grados-dia" data-cultivo="MOSCA" data-estacion="LOS_LLANOS"></div>
 *     <div data-componente="olivar-grados-dia" data-anios="3" data-selector="no" data-titulo="no"></div>
 *
 * API: GET /olivar/grados-dia?estacion&anios
 */

import {
    pedir, crear, vaciar, aviso, prepararRaiz, pie, leerEstacion,
    entero, fechaLarga, MESES, ESTACIONES, NOMBRES_ESTACION, FUENTE_ESTACIONES
} from "./comun.js?v=20261109-olivar2";


const NS = "http://www.w3.org/2000/svg";

const CULTIVOS = {
    OLIVO: { nombre: "Olivo (base 10 °C)", corto: "olivo", campo: "olivo_acumulado", total: "grados_dia_olivo" },
    MOSCA: { nombre: "Mosca del olivo (de 9 a 35 °C)", corto: "mosca", campo: "mosca_acumulado", total: "grados_dia_mosca" }
};

function svg(etiqueta, atributos = {}, clase) {
    const nodo = document.createElementNS(NS, etiqueta);
    for (const [clave, valor] of Object.entries(atributos)) nodo.setAttribute(clave, valor);
    if (clase) nodo.setAttribute("class", clase);
    return nodo;
}

function colorAnio(indice) {
    return `var(--oli-temporada-${Math.min(indice, 3)})`;
}


export function dibujarGradosDia(datos, cultivo, ancho) {
    const definicion = CULTIVOS[cultivo];
    const alto = Math.round(Math.max(220, Math.min(320, ancho * 0.48)));
    const margen = { arriba: 14, derecha: 14, abajo: 24, izquierda: 50 };
    const anchoUtil = ancho - margen.izquierda - margen.derecha;
    const altoUtil = alto - margen.arriba - margen.abajo;

    let tope = 10;
    for (const anio of datos.anios) {
        for (const dia of anio.dias) tope = Math.max(tope, dia[definicion.campo]);
    }
    tope *= 1.08;

    const x = dia => margen.izquierda + (dia / 364) * anchoUtil;
    const y = valor => margen.arriba + (1 - Math.max(0, Math.min(tope, valor)) / tope) * altoUtil;

    const lienzo = svg("svg", {
        viewBox: `0 0 ${ancho} ${alto}`,
        role: "img",
        "aria-label": `Grados-día de ${definicion.corto} acumulados en ${datos.nombre}, año a año`
    });

    for (let i = 0; i <= 4; i++) {
        const valor = (tope / 4) * i;
        const posicion = y(valor);
        lienzo.appendChild(svg("line", { x1: margen.izquierda, x2: ancho - margen.derecha, y1: posicion, y2: posicion }, i === 0 ? "eje" : "rejilla"));
        const texto = svg("text", { x: margen.izquierda - 6, y: posicion + 3, "text-anchor": "end" }, "texto-eje");
        texto.textContent = entero(valor);
        lienzo.appendChild(texto);
    }

    for (let mes = 0; mes < 12; mes++) {
        const dia = (Date.UTC(2026, mes, 15) - Date.UTC(2026, 0, 1)) / 86400000;
        const texto = svg("text", { x: x(dia), y: alto - 6, "text-anchor": "middle" }, "texto-eje");
        texto.textContent = MESES[mes];
        lienzo.appendChild(texto);
    }

    // Generaciones de la mosca, cada 379 grados-día.
    if (cultivo === "MOSCA") {
        const paso = datos.grados_generacion_mosca;
        for (let generacion = 1; generacion * paso < tope; generacion++) {
            const posicion = y(generacion * paso);
            lienzo.appendChild(svg("line", { x1: margen.izquierda, x2: ancho - margen.derecha, y1: posicion, y2: posicion }, "generacion"));
            const texto = svg("text", { x: margen.izquierda + 6, y: posicion - 4 }, "texto-generacion");
            texto.textContent = `${generacion}.ª generación`;
            lienzo.appendChild(texto);
        }
    }

    datos.anios.slice().reverse().forEach((anio, posicionInvertida) => {
        const indice = datos.anios.length - 1 - posicionInvertida;
        if (!anio.dias.length) return;

        let d = "";
        for (const dia of anio.dias) d += `${d ? "L" : "M"}${x(dia.dia).toFixed(1)},${y(dia[definicion.campo]).toFixed(1)}`;

        if (indice === 0) {
            const primero = anio.dias[0];
            const ultimo = anio.dias[anio.dias.length - 1];
            lienzo.appendChild(svg("path", {
                d: `${d}L${x(ultimo.dia).toFixed(1)},${y(0).toFixed(1)}L${x(primero.dia).toFixed(1)},${y(0).toFixed(1)}Z`
            }, "area-actual"));
        }

        const curva = svg("path", { d, style: `stroke: ${colorAnio(indice)}` }, indice === 0 ? "curva actual" : "curva");
        const ayuda = svg("title");
        ayuda.textContent = `${anio.anio}: ${entero(anio[definicion.total])} grados-día`;
        curva.appendChild(ayuda);
        lienzo.appendChild(curva);

        if (indice === 0) {
            const ultimo = anio.dias[anio.dias.length - 1];
            const punto = svg("circle", { cx: x(ultimo.dia).toFixed(1), cy: y(ultimo[definicion.campo]).toFixed(1), r: 4.5 }, "hoy");
            const ayudaPunto = svg("title");
            ayudaPunto.textContent = `${fechaLarga(ultimo.fecha)}: ${entero(ultimo[definicion.campo])} grados-día`;
            punto.appendChild(ayudaPunto);
            lienzo.appendChild(punto);
        }
    });

    return lienzo;
}


const pintadas = new WeakMap();

function pintarGrafica(caja, datos, cultivo) {
    const primera = !pintadas.has(caja);
    pintadas.set(caja, { datos, cultivo });

    const dibujar = () => {
        const ancho = Math.max(280, Math.round(caja.clientWidth || 600));
        const actual = pintadas.get(caja);
        vaciar(caja);
        caja.appendChild(dibujarGradosDia(actual.datos, actual.cultivo, ancho));
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


function resumen(datos, cultivo) {
    const definicion = CULTIVOS[cultivo];
    const actual = datos.anios[0];
    if (!actual || !actual.dias.length) return "Todavía no hay grados-día calculados en esta estación.";

    const ultimo = actual.dias[actual.dias.length - 1];
    let texto = `${actual.anio}: ${entero(ultimo[definicion.campo])} grados-día hasta el ${fechaLarga(ultimo.fecha)}`;

    const anterior = datos.anios[1];
    const mismaFecha = anterior ? anterior.dias.filter(dia => dia.dia <= ultimo.dia).pop() : null;
    if (mismaFecha && anterior.dias[0].dia === 0) {
        texto += `; en ${anterior.anio}, a estas alturas, ${entero(mismaFecha[definicion.campo])}`;
    } else if (!anterior) {
        texto += ". Aún no hay otro año con el que comparar en esta estación";
    }

    if (cultivo === "MOSCA") {
        const generaciones = ultimo.mosca_acumulado / datos.grados_generacion_mosca;
        texto += `. Da para unas ${generaciones.toLocaleString("es-ES", { maximumFractionDigits: 1 })} generaciones teóricas de mosca`;
    }

    return `${texto}.`;
}


export async function montarGradosDiaOlivar(raiz) {
    prepararRaiz(raiz, "olivar-grados-dia");
    aviso(raiz, "Cargando los grados-día…");

    let estacion = leerEstacion(raiz);
    let cultivo = (raiz.dataset.cultivo || "OLIVO").toUpperCase() === "MOSCA" ? "MOSCA" : "OLIVO";
    const anios = Math.max(1, Math.min(10, parseInt(raiz.dataset.anios, 10) || 2));
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

        const etiquetaCultivo = crear("label", null, "Para");
        const selectorCultivo = crear("select");
        for (const [clave, definicion] of Object.entries(CULTIVOS)) {
            const opcion = crear("option", null, definicion.nombre);
            opcion.value = clave;
            selectorCultivo.appendChild(opcion);
        }
        selectorCultivo.value = cultivo;
        etiquetaCultivo.appendChild(selectorCultivo);
        controles.appendChild(etiquetaCultivo);

        selectorEstacion.addEventListener("change", () => { estacion = selectorEstacion.value; pintar(); });
        selectorCultivo.addEventListener("change", () => { cultivo = selectorCultivo.value; pintar(); });
        raiz.appendChild(controles);
    }

    const texto = crear("p", "oli-aviso");
    const caja = crear("div", "oli-grafica");
    const leyenda = crear("p", "oli-leyenda");
    raiz.appendChild(texto);
    raiz.appendChild(caja);
    raiz.appendChild(leyenda);
    pie(raiz, `Desde el 1 de enero, con cada medición de cinco minutos · ${FUENTE_ESTACIONES}`);

    async function pintar() {
        let datos;
        try {
            datos = await pedir(`/olivar/grados-dia?estacion=${estacion}&anios=${anios}`);
        } catch (error) {
            texto.textContent = "No se han podido leer los grados-día. Se puede volver a intentar más tarde.";
            vaciar(caja);
            vaciar(leyenda);
            return;
        }

        vaciar(cabeza);
        if (raiz.dataset.titulo !== "no") {
            cabeza.appendChild(crear("div", "oli-etiqueta", `Grados-día · ${datos.nombre}`));
            cabeza.appendChild(crear("h3", "oli-titulo", CULTIVOS[cultivo].nombre));
        }

        texto.textContent = resumen(datos, cultivo);

        vaciar(leyenda);
        datos.anios.forEach((anio, indice) => {
            const desde = anio.dias.length && anio.dias[0].dia > 0 ? ` (desde el ${fechaLarga(anio.dias[0].fecha)})` : "";
            const marca = crear("span", null, indice === 0 ? `${anio.anio} (este)${desde}` : `${anio.anio}${desde}`);
            marca.style.setProperty("--oli-color", colorAnio(indice));
            leyenda.appendChild(marca);
        });

        if (!datos.anios.length) {
            vaciar(caja);
            return;
        }

        pintarGrafica(caja, datos, cultivo);
    }

    await pintar();
}


/* Fin de fichero: js/olivar/grados-dia.js */
