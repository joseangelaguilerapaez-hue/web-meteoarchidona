/*
 * MeteoArchidona · Componente «Índice Kp con previsión»
 *
 * Gráfica de barras del índice Kp de los últimos días y la previsión
 * de la NOAA (barras rayadas), con la línea de tormenta (Kp 5) y la de
 * «ahora». Se dibuja al ancho real del hueco y se vuelve a dibujar si
 * cambia, para que los textos salgan a su tamaño en el móvil y en
 * cualquier casilla de un dashboard.
 *
 *     <div data-componente="sol-indice-kp"></div>
 *     <div data-componente="sol-indice-kp" data-dias="2"></div>
 *
 *     import {montarIndiceKp} from "/js/sol/indice-kp.js?v=…";
 *     montarIndiceKp(hueco);
 *
 * data-dias: días hacia atrás (3 por defecto, de 1 a 7). La previsión
 * llega hasta donde la publique la NOAA, normalmente 3 días.
 *
 * Se renueva solo cada 5 minutos. Puede haber varios en una página.
 */

import {
    FUENTES, DATOS_CADA_MS,
    crear, vaciar, aviso, prepararRaiz, ponerPie,
    pedir, comoObjetos, numero, fechaUTC, fechaHora,
    formatoDia, formatoHoraMadrid, claseKp, cadaRato
} from "./comun.js?v=20261104-componentes1";


const NS = "http://www.w3.org/2000/svg";

let contador = 0;


export function montarIndiceKp(raiz) {
    const dias = Math.min(7, Math.max(1, parseInt(raiz.dataset.dias, 10) || 3));
    const idRayado = `solKpRayado${++contador}`;

    prepararRaiz(raiz, "sol-indice-kp");

    const caja = crear("div", "sol-kp");
    aviso(caja, "Cargando el índice Kp…");
    raiz.appendChild(caja);

    let tramos = null;
    let anchoDibujado = 0;

    function dibujar() {
        if (!tramos) return;
        const ancho = Math.max(300, Math.round(caja.clientWidth || 720));
        if (ancho === anchoDibujado && caja.querySelector("svg")) return;
        anchoDibujado = ancho;
        vaciar(caja);
        caja.appendChild(dibujarKp(tramos, ancho, idRayado));
    }

    if ("ResizeObserver" in window) {
        let espera = null;
        new ResizeObserver(() => {
            clearTimeout(espera);
            espera = setTimeout(dibujar, 150);
        }).observe(caja);
    }

    cadaRato(async () => {
        let datos;
        try {
            datos = comoObjetos(await pedir(FUENTES.kpPrevision));
        } catch (error) {
            if (!tramos) aviso(caja, "El índice Kp no está disponible ahora.");
            ponerPie(raiz, false);
            return;
        }

        const desde = Date.now() - dias * 86400000;
        const nuevos = datos
            .map(d => ({
                fecha: fechaUTC(d.time_tag),
                kp: numero(d.kp ?? d.Kp),
                prevision: /predicted/i.test(String(d.observed || ""))
            }))
            .filter(t => t.fecha && t.kp !== null && t.fecha.getTime() >= desde);

        if (nuevos.length === 0) {
            aviso(caja, "No hay datos del índice Kp.");
            ponerPie(raiz, false);
            return;
        }

        tramos = nuevos;
        anchoDibujado = 0;
        dibujar();
        ponerPie(raiz, true);
    }, DATOS_CADA_MS);
}


function dibujarKp(tramos, ancho, idRayado) {
    const alto = ancho < 500 ? 200 : 240;
    const izq = 26;
    const der = 6;
    const arriba = 10;
    const abajo = 34;
    const util = ancho - izq - der;
    const altoUtil = alto - arriba - abajo;
    const paso = util / tramos.length;

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);
    svg.setAttribute("class", "sol-kp-grafica");
    svg.setAttribute("role", "img");

    const maximo = Math.max(...tramos.map(t => t.kp));
    svg.setAttribute("aria-label",
        `Índice Kp de los últimos días y previsión. Máximo del periodo: ${maximo.toFixed(1)}.`);

    const defs = document.createElementNS(NS, "defs");
    const patron = document.createElementNS(NS, "pattern");
    patron.setAttribute("id", idRayado);
    patron.setAttribute("width", "6");
    patron.setAttribute("height", "6");
    patron.setAttribute("patternUnits", "userSpaceOnUse");
    patron.setAttribute("patternTransform", "rotate(45)");
    const raya = document.createElementNS(NS, "rect");
    raya.setAttribute("width", "3");
    raya.setAttribute("height", "6");
    raya.setAttribute("class", "sol-kp-raya");
    patron.appendChild(raya);
    defs.appendChild(patron);
    svg.appendChild(defs);

    const y = v => arriba + altoUtil - (v / 9) * altoUtil;

    /* Rejilla en 0, 3, 5 (tormenta), 7 y 9. */
    for (const v of [0, 3, 5, 7, 9]) {
        const linea = document.createElementNS(NS, "line");
        linea.setAttribute("x1", izq);
        linea.setAttribute("x2", ancho - der);
        linea.setAttribute("y1", y(v));
        linea.setAttribute("y2", y(v));
        linea.setAttribute("class", v === 5 ? "sol-kp-umbral" : "sol-kp-rejilla");
        svg.appendChild(linea);

        const etiqueta = document.createElementNS(NS, "text");
        etiqueta.setAttribute("x", izq - 6);
        etiqueta.setAttribute("y", y(v) + 4);
        etiqueta.setAttribute("text-anchor", "end");
        etiqueta.setAttribute("class", "sol-kp-texto");
        etiqueta.textContent = String(v);
        svg.appendChild(etiqueta);
    }

    const ahora = Date.now();
    let ultimoDia = "";

    tramos.forEach((t, i) => {
        const x = izq + i * paso;
        const altura = Math.max(2, (t.kp / 9) * altoUtil);

        const barra = document.createElementNS(NS, "rect");
        barra.setAttribute("x", (x + 1).toFixed(1));
        barra.setAttribute("y", (arriba + altoUtil - altura).toFixed(1));
        barra.setAttribute("width", Math.max(1, paso - 2).toFixed(1));
        barra.setAttribute("height", altura.toFixed(1));
        barra.setAttribute("rx", "1.5");
        barra.setAttribute("class",
            `sol-kp-barra ${claseKp(t.kp)}${t.prevision ? " prevision" : ""}`);
        const titulo = document.createElementNS(NS, "title");
        titulo.textContent =
            `${fechaHora(t.fecha)}: Kp ${t.kp.toFixed(2).replace(".", ",")}${t.prevision ? " (previsión)" : ""}`;
        barra.appendChild(titulo);
        svg.appendChild(barra);

        if (t.prevision) {
            const rayado = document.createElementNS(NS, "rect");
            rayado.setAttribute("x", (x + 1).toFixed(1));
            rayado.setAttribute("y", (arriba + altoUtil - altura).toFixed(1));
            rayado.setAttribute("width", Math.max(1, paso - 2).toFixed(1));
            rayado.setAttribute("height", altura.toFixed(1));
            rayado.setAttribute("fill", `url(#${idRayado})`);
            rayado.setAttribute("pointer-events", "none");
            svg.appendChild(rayado);
        }

        /* Línea de «ahora». */
        const fin = t.fecha.getTime() + 3 * 3600 * 1000;
        if (t.fecha.getTime() <= ahora && ahora < fin) {
            const xAhora = x + paso * ((ahora - t.fecha.getTime()) / (3 * 3600 * 1000));
            const linea = document.createElementNS(NS, "line");
            linea.setAttribute("x1", xAhora);
            linea.setAttribute("x2", xAhora);
            linea.setAttribute("y1", arriba);
            linea.setAttribute("y2", arriba + altoUtil);
            linea.setAttribute("class", "sol-kp-ahora");
            svg.appendChild(linea);
        }

        /* Nombre del día al empezar cada día en hora de Madrid. */
        const dia = formatoDia.format(t.fecha);
        const horaMadrid = parseInt(formatoHoraMadrid.format(t.fecha), 10);
        if (dia !== ultimoDia && horaMadrid < 3) {
            const marca = document.createElementNS(NS, "line");
            marca.setAttribute("x1", x);
            marca.setAttribute("x2", x);
            marca.setAttribute("y1", arriba + altoUtil);
            marca.setAttribute("y2", arriba + altoUtil + 6);
            marca.setAttribute("class", "sol-kp-rejilla");
            svg.appendChild(marca);

            /* El nombre va centrado en el día; si no cabe entero al
             * final de la gráfica, no se pone (se pisaría con el anterior). */
            const centro = x + 4 * paso;
            if (centro + 20 <= ancho - der) {
                const texto = document.createElementNS(NS, "text");
                texto.setAttribute("x", centro);
                texto.setAttribute("y", alto - 10);
                texto.setAttribute("text-anchor", "middle");
                texto.setAttribute("class", "sol-kp-texto");
                texto.textContent = dia;
                svg.appendChild(texto);
            }
        }
        if (horaMadrid < 3) ultimoDia = dia;
    });

    const figura = crear("figure", "sol-kp-figura");
    figura.appendChild(svg);

    const leyenda = crear("figcaption", "sol-kp-leyenda");
    [
        ["nivel-0", "Tranquilo (0–3)"],
        ["nivel-activo", "Activo (4)"],
        ["nivel-1", "G1 (5)"],
        ["nivel-2", "G2 (6)"],
        ["nivel-3", "G3 o más (7–9)"]
    ].forEach(([clase, texto]) => {
        const item = crear("span", "sol-kp-leyenda-item");
        item.appendChild(crear("span", `sol-kp-muestra ${clase}`));
        item.appendChild(document.createTextNode(texto));
        leyenda.appendChild(item);
    });
    figura.appendChild(leyenda);

    return figura;
}

/* Fin de fichero: js/sol/indice-kp.js */
