/*
 * MeteoArchidona · Componente «Climograma»
 *
 * Climograma 1991-2020 de un pueblo de la comarca: la lluvia media de
 * cada mes en barras (escala de la derecha) y las temperaturas medias en
 * líneas (escala de la izquierda): la media de las máximas, la media y
 * la media de las mínimas. Debajo, los totales del año.
 *
 *     <div data-componente="clima-climograma"></div>                      (Archidona, con selector)
 *     <div data-componente="clima-climograma" data-punto="ANTEQUERA" data-selector="no"></div>
 *
 * API: GET /climatologia/normales?punto=
 */

import {
    pedir, crear, aviso, prepararRaiz, titulo, pie, selectorPunto, leerPunto, svg,
    grados, milimetros, decimal, textoError, MESES, MESES_LARGOS
} from "./comun.js?v=20261113-clima1";


const ANCHO = 640;
const ALTO = 300;
const MARGEN = { arriba: 18, derecha: 46, abajo: 30, izquierda: 42 };

const SERIES = [
    ["temperatura_maxima", "cli-linea-maxima", "Máximas"],
    ["temperatura_media", "cli-linea-media", "Media"],
    ["temperatura_minima", "cli-linea-minima", "Mínimas"]
];


function escala(minimo, maximo, desde, hasta) {
    return valor => desde + (valor - minimo) * (hasta - desde) / ((maximo - minimo) || 1);
}


function dibujar(meses) {
    const temperaturas = meses.flatMap(m => [m.temperatura_minima, m.temperatura_maxima]).filter(v => v !== null && v !== undefined);
    const lluvias = meses.map(m => m.lluvia || 0);
    const minimo = Math.floor(Math.min(0, ...temperaturas) / 5) * 5;
    const maximo = Math.ceil(Math.max(...temperaturas) / 5) * 5;
    const techoLluvia = Math.max(20, Math.ceil(Math.max(...lluvias) * 1.1 / 20) * 20);

    const x = escala(0, 12, MARGEN.izquierda, ANCHO - MARGEN.derecha);
    const yTemperatura = escala(minimo, maximo, ALTO - MARGEN.abajo, MARGEN.arriba);
    const yLluvia = escala(0, techoLluvia, ALTO - MARGEN.abajo, MARGEN.arriba);
    const anchoMes = (ANCHO - MARGEN.izquierda - MARGEN.derecha) / 12;

    const lienzo = svg("svg", {
        viewBox: `0 0 ${ANCHO} ${ALTO}`,
        role: "img",
        "aria-label": "Climograma: lluvia media de cada mes y temperaturas medias"
    }, "cli-grafica");

    for (let t = minimo; t <= maximo; t += 5) {
        const y = yTemperatura(t);
        lienzo.appendChild(svg("line", { x1: MARGEN.izquierda, x2: ANCHO - MARGEN.derecha, y1: y, y2: y }, t === 0 ? "eje" : "rejilla"));
        const texto = svg("text", { x: MARGEN.izquierda - 6, y: y + 3, "text-anchor": "end" }, "texto-eje");
        texto.textContent = `${t}°`;
        lienzo.appendChild(texto);
    }

    for (let l = 0; l <= techoLluvia; l += techoLluvia / 4) {
        const texto = svg("text", { x: ANCHO - MARGEN.derecha + 6, y: yLluvia(l) + 3 }, "texto-eje texto-lluvia");
        texto.textContent = `${Math.round(l)}`;
        lienzo.appendChild(texto);
    }
    const unidad = svg("text", { x: ANCHO - MARGEN.derecha + 6, y: MARGEN.arriba - 6 }, "texto-eje texto-lluvia");
    unidad.textContent = "mm";
    lienzo.appendChild(unidad);

    meses.forEach((mes, indice) => {
        const valor = mes.lluvia || 0;
        const barra = svg("rect", {
            x: x(indice) + anchoMes * 0.18,
            y: yLluvia(valor),
            width: anchoMes * 0.64,
            height: Math.max(0, yLluvia(0) - yLluvia(valor)),
            rx: 2
        }, "cli-barra-lluvia");
        const ayuda = svg("title");
        ayuda.textContent = `${MESES_LARGOS[mes.mes - 1]}: ${milimetros(mes.lluvia)} de lluvia, ` +
            `máx. ${grados(mes.temperatura_maxima)}, mín. ${grados(mes.temperatura_minima)}`;
        barra.appendChild(ayuda);
        lienzo.appendChild(barra);

        const texto = svg("text", { x: x(indice) + anchoMes / 2, y: ALTO - 10, "text-anchor": "middle" }, "texto-eje");
        texto.textContent = MESES[mes.mes - 1];
        lienzo.appendChild(texto);
    });

    for (const [campo, clase] of SERIES) {
        const puntos = meses
            .filter(m => m[campo] !== null && m[campo] !== undefined)
            .map(m => `${x(m.mes - 1) + anchoMes / 2},${yTemperatura(m[campo])}`);
        if (puntos.length < 2) continue;
        lienzo.appendChild(svg("polyline", { points: puntos.join(" "), fill: "none" }, clase));
        for (const mes of meses) {
            if (mes[campo] === null || mes[campo] === undefined) continue;
            lienzo.appendChild(svg("circle", { cx: x(mes.mes - 1) + anchoMes / 2, cy: yTemperatura(mes[campo]), r: 3 }, `${clase} punto`));
        }
    }

    return lienzo;
}


function leyenda() {
    const nodo = crear("div", "cli-leyenda");
    for (const [, clase, texto] of SERIES) {
        const elemento = crear("span", `cli-leyenda-elemento ${clase}`);
        elemento.appendChild(crear("i"));
        elemento.appendChild(document.createTextNode(texto));
        nodo.appendChild(elemento);
    }
    const lluvia = crear("span", "cli-leyenda-elemento cli-barra-lluvia");
    lluvia.appendChild(crear("i"));
    lluvia.appendChild(document.createTextNode("Lluvia"));
    nodo.appendChild(lluvia);
    return nodo;
}


function resumenAnual(anio) {
    const nodo = crear("div", "cli-cifras");
    const datos = [
        ["Temperatura media", grados(anio.temperatura_media)],
        ["Media de las máximas", grados(anio.temperatura_maxima)],
        ["Media de las mínimas", grados(anio.temperatura_minima)],
        ["Lluvia del año", milimetros(anio.lluvia)],
        ["Días de lluvia", decimal(anio.dias_lluvia)],
        ["Días de helada", decimal(anio.dias_helada)]
    ];
    for (const [etiqueta, valor] of datos) {
        const caja = crear("div", "cli-cifra");
        caja.appendChild(crear("span", "cli-cifra-etiqueta", etiqueta));
        caja.appendChild(crear("strong", null, valor));
        nodo.appendChild(caja);
    }
    return nodo;
}


export async function montarClimograma(raiz) {
    prepararRaiz(raiz, "clima-climograma");
    titulo(raiz, "CLIMATOLOGÍA · NORMALES 1991-2020", "Climograma");
    await selectorPunto(raiz, montarClimograma);

    let datos;
    try {
        datos = await pedir(`/climatologia/normales?punto=${encodeURIComponent(leerPunto(raiz))}`);
    } catch (error) {
        aviso(raiz, textoError(error), true);
        return;
    }

    if (!datos.meses || datos.meses.length < 12) {
        aviso(raiz, `Todavía no están las normales de ${datos.punto.nombre}: la serie histórica se está cargando.`);
        pie(raiz);
        return;
    }

    raiz.appendChild(crear("p", "cli-subtitulo", `${datos.punto.nombre} · ${datos.punto.altitud} m · periodo ${datos.periodo}`));
    raiz.appendChild(dibujar(datos.meses));
    raiz.appendChild(leyenda());
    if (datos.anio) {
        raiz.appendChild(resumenAnual(datos.anio));
    }
    pie(raiz);
}


/* Fin de fichero: js/climatologia/climograma.js */
