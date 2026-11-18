/*
 * MeteoArchidona · Componente «Mareas de una playa»
 *
 * La curva del día con las pleamares y bajamares de una playa y la hora
 * de ahora. Entre una pleamar y una bajamar el nivel sigue media onda de
 * coseno (la «regla del coseno» de las tablas de mareas): la curva se
 * dibuja con las horas y alturas que da Puertos del Estado, sin inventar
 * otros datos. En el Mediterráneo lo dice: allí la marea apenas se nota.
 *
 *     <div data-componente="costas-mareas"></div>
 *     <div data-componente="costas-mareas" data-playa="33125" data-selector="no"></div>
 *
 * data-playa: id de la playa (vacía: la primera de la lista).
 * data-selector="no" quita el desplegable de playas.
 *
 * API: GET /costas/playas (desplegable) y GET /costas/playas/{id}.
 */

import {
    pedir, pedirPlayas, crear, aviso, vaciar, prepararRaiz, titulo, conSelector, apuntarEnDireccion,
    desplegablePlayas, metros, hora, diaDe, hoyClave, fechaLarga, CITA
} from "./comun.js?v=20261118-costas1";


const SVG = "http://www.w3.org/2000/svg";

const ANCHO = 640;
const ALTO = 220;
const MARGEN = { izquierda: 44, derecha: 14, arriba: 22, abajo: 30 };


function nodoSvg(etiqueta, atributos = {}, texto) {
    const nodo = document.createElementNS(SVG, etiqueta);
    for (const [clave, valor] of Object.entries(atributos)) nodo.setAttribute(clave, valor);
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
}


/* Inicio y fin del día de Madrid de «2026-11-18», en milisegundos. */
function limitesDia(fecha, mareas) {
    // El desfase de Madrid ese día sale de una marea de ese día (o de ahora).
    const muestra = mareas.find(m => diaDe(m.fecha) === fecha)?.fecha || new Date().toISOString();
    const desfase = /([+-]\d{2}):?(\d{2})$/.exec(muestra);
    const zona = desfase ? `${desfase[1]}:${desfase[2]}` : "+01:00";
    const inicio = Date.parse(`${fecha}T00:00:00${zona}`);
    return [inicio, inicio + 24 * 3600 * 1000];
}


/* Nivel a la hora t entre los extremos conocidos (regla del coseno). */
function nivelEn(t, extremos) {
    if (!extremos.length) return null;
    if (t <= extremos[0].t) return extremos[0].h;
    for (let i = 1; i < extremos.length; i++) {
        const a = extremos[i - 1];
        const b = extremos[i];
        if (t <= b.t) {
            const fase = Math.PI * (t - a.t) / (b.t - a.t);
            return (a.h + b.h) / 2 + (a.h - b.h) / 2 * Math.cos(fase);
        }
    }
    return extremos[extremos.length - 1].h;
}


function curva(ficha, fecha) {
    const extremos = ficha.mareas
        .filter(m => m.altura !== null && m.altura !== undefined)
        .map(m => ({ t: Date.parse(m.fecha), h: m.altura, tipo: m.tipo }))
        .sort((a, b) => a.t - b.t);
    const [inicio, fin] = limitesDia(fecha, ficha.mareas);
    const delDia = extremos.filter(e => e.t >= inicio && e.t < fin);

    const svg = nodoSvg("svg", {
        viewBox: `0 0 ${ANCHO} ${ALTO}`,
        class: "cos-mareas-grafica",
        role: "img",
        "aria-label": `Mareas del ${fechaLarga(fecha)}: ${delDia.map(e => `${e.tipo === "PLEAMAR" ? "pleamar" : "bajamar"} a las ${hora(new Date(e.t).toISOString())}`).join(", ")}`
    });

    const valores = [];
    for (let t = inicio; t <= fin; t += 10 * 60 * 1000) valores.push({ t, h: nivelEn(t, extremos) });
    const alturas = valores.map(v => v.h).concat(delDia.map(e => e.h));
    let minimo = Math.min(...alturas);
    let maximo = Math.max(...alturas);
    // Rango mínimo de 40 cm: así en el Mediterráneo no parece un oleaje de metros.
    if (maximo - minimo < 0.4) {
        const centro = (maximo + minimo) / 2;
        minimo = centro - 0.2;
        maximo = centro + 0.2;
    }

    const x = t => MARGEN.izquierda + (t - inicio) / (fin - inicio) * (ANCHO - MARGEN.izquierda - MARGEN.derecha);
    const y = h => MARGEN.arriba + (maximo - h) / (maximo - minimo) * (ALTO - MARGEN.arriba - MARGEN.abajo);

    // Rejilla: cada 3 horas y tres alturas.
    for (let horaDia = 0; horaDia <= 24; horaDia += 3) {
        const t = inicio + horaDia * 3600 * 1000;
        svg.appendChild(nodoSvg("line", { x1: x(t), x2: x(t), y1: MARGEN.arriba, y2: ALTO - MARGEN.abajo, class: "cos-rejilla" }));
        svg.appendChild(nodoSvg("text", { x: x(t), y: ALTO - 10, class: "cos-eje", "text-anchor": "middle" }, `${String(horaDia % 24).padStart(2, "0")}h`));
    }
    for (const h of [minimo, (minimo + maximo) / 2, maximo]) {
        svg.appendChild(nodoSvg("line", { x1: MARGEN.izquierda, x2: ANCHO - MARGEN.derecha, y1: y(h), y2: y(h), class: "cos-rejilla" }));
        svg.appendChild(nodoSvg("text", { x: MARGEN.izquierda - 6, y: y(h) + 4, class: "cos-eje", "text-anchor": "end" },
            `${h.toFixed(1).replace(".", ",")}`));
    }

    // Agua bajo la curva y la propia curva.
    const linea = valores.map((v, i) => `${i ? "L" : "M"}${x(v.t).toFixed(1)},${y(v.h).toFixed(1)}`).join(" ");
    const base = ALTO - MARGEN.abajo;
    svg.appendChild(nodoSvg("path", { d: `${linea} L${x(fin)},${base} L${x(inicio)},${base} Z`, class: "cos-mareas-agua" }));
    svg.appendChild(nodoSvg("path", { d: linea, class: "cos-mareas-linea" }));

    // Pleamares y bajamares con su hora.
    for (const extremo of delDia) {
        const cx = x(extremo.t);
        const cy = y(extremo.h);
        svg.appendChild(nodoSvg("circle", { cx, cy, r: 4.5, class: `cos-mareas-punto ${extremo.tipo === "PLEAMAR" ? "pleamar" : "bajamar"}` }));
        const encima = extremo.tipo === "PLEAMAR";
        svg.appendChild(nodoSvg("text", {
            x: cx, y: encima ? cy - 9 : cy + 17, class: "cos-mareas-hora", "text-anchor": "middle"
        }, hora(new Date(extremo.t).toISOString())));
    }

    // Ahora, si es hoy.
    const ahora = Date.now();
    if (ahora >= inicio && ahora < fin) {
        svg.appendChild(nodoSvg("line", { x1: x(ahora), x2: x(ahora), y1: MARGEN.arriba - 6, y2: base, class: "cos-ahora" }));
        svg.appendChild(nodoSvg("text", { x: x(ahora), y: MARGEN.arriba - 9, class: "cos-ahora-texto", "text-anchor": "middle" }, "ahora"));
    }

    return { svg, delDia };
}


function pintar(contenedor, ficha) {
    vaciar(contenedor);
    const fecha = hoyClave();
    contenedor.appendChild(crear("h4", "cos-ficha-dia",
        `${ficha.playa.nombre}${ficha.playa.municipio ? ` (${ficha.playa.municipio})` : ""} · ${fechaLarga(fecha)}`));

    if (!ficha.mareas.length) {
        contenedor.appendChild(crear("p", "cos-aviso", "Todavía no hay mareas previstas para esta playa."));
        return;
    }

    const { svg, delDia } = curva(ficha, fecha);
    contenedor.appendChild(svg);

    const lista = crear("ul", "cos-mareas-lista");
    for (const extremo of delDia) {
        const pleamar = extremo.tipo === "PLEAMAR";
        const elemento = crear("li", `cos-marea ${pleamar ? "pleamar" : "bajamar"}`);
        elemento.appendChild(crear("span", "cos-marea-tipo", pleamar ? "Pleamar" : "Bajamar"));
        elemento.appendChild(crear("strong", null, hora(new Date(extremo.t).toISOString())));
        elemento.appendChild(crear("span", "cos-marea-altura", metros(extremo.h, 2)));
        lista.appendChild(elemento);
    }
    contenedor.appendChild(lista);

    if (delDia.length >= 2) {
        const altas = delDia.filter(e => e.tipo === "PLEAMAR").map(e => e.h);
        const bajas = delDia.filter(e => e.tipo === "BAJAMAR").map(e => e.h);
        if (altas.length && bajas.length) {
            const carrera = Math.max(...altas) - Math.min(...bajas);
            contenedor.appendChild(crear("p", "cos-nota",
                `Diferencia entre la pleamar más alta y la bajamar más baja de hoy: ${metros(carrera, 2)}.`));
        }
    }
    if (ficha.mediterraneo) {
        contenedor.appendChild(crear("p", "cos-nota",
            "En el Mediterráneo la marea apenas se nota: unos centímetros. El viento y la presión mueven el nivel del mar más que la propia marea."));
    }
    contenedor.appendChild(crear("p", "cos-pie",
        `Alturas respecto al nivel medio del mar. Curva aproximada entre las horas de pleamar y bajamar · ${CITA}`));
}


export async function montarMareasCostas(raiz) {
    prepararRaiz(raiz, "costas-mareas");
    titulo(raiz, "Costas de Andalucía", "Mareas de hoy");

    const contenedor = crear("div", "cos-mareas");
    let playaActual = (raiz.dataset.playa || "").trim();

    async function cargar(id) {
        playaActual = String(id);
        raiz.dataset.playa = playaActual;
        aviso(contenedor, "Calculando las mareas…");
        try {
            pintar(contenedor, await pedir(`/costas/playas/${encodeURIComponent(id)}`));
        } catch (error) {
            aviso(contenedor, error.estado === 404
                ? "No encontramos esa playa."
                : "No se han podido leer las mareas. Se puede volver a intentar más tarde.", true);
        }
    }

    let playas = [];
    if (conSelector(raiz) || !playaActual) {
        try {
            playas = await pedirPlayas();
        } catch (error) {
            aviso(raiz, "No se ha podido leer la lista de playas. Se puede volver a intentar más tarde.", true);
            return;
        }
        if (!playas.length) {
            aviso(raiz, "Todavía no hay playas cargadas.");
            return;
        }
        if (!playaActual) {
            // La primera de oeste a este: en el Atlántico se ve bien la marea.
            playaActual = String([...playas].sort((a, b) => a.longitud - b.longitud)[0].id);
        }
    }

    if (conSelector(raiz)) {
        raiz.appendChild(desplegablePlayas(playas, playaActual, id => {
            apuntarEnDireccion("playa", id);
            cargar(id);
        }));
    }

    raiz.appendChild(contenedor);
    await cargar(playaActual);
}


/* Fin de fichero: js/costas/mareas.js */
