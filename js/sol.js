/*
 * MeteoArchidona · Página Sol
 *
 * Desde el 4-11-2026 lo principal de la página son componentes
 * reutilizables (decisión de José: poder ponerlos en los dashboards).
 * Este script los monta en sus huecos y rellena lo que solo vive aquí.
 *
 * Componentes (cada uno en su módulo, con su hoja css/sol-componentes.css):
 *
 *     data-componente="sol-tiempo-espacial"  → js/sol/tiempo-espacial.js
 *     data-componente="sol-alertas"          → js/sol/alertas-solares.js
 *     data-componente="sol-directo"          → js/sol/sol-directo.js
 *     data-componente="sol-indice-kp"        → js/sol/indice-kp.js
 *
 * Solo en esta página: la previsión de la NOAA a 3 días, las
 * fulguraciones de la semana y las imágenes de los coronógrafos y del
 * óvalo de auroras.
 *
 * Todo se pide directamente a NOAA, NASA y ESA; no pasa por la API.
 * Detalle en docs/sol.md.
 */

import {montarTiempoEspacial} from "./sol/tiempo-espacial.js?v=20261104-componentes1";
import {montarAlertasSolares} from "./sol/alertas-solares.js?v=20261104-componentes1";
import {montarSolDirecto} from "./sol/sol-directo.js?v=20261104-componentes1";
import {montarIndiceKp} from "./sol/indice-kp.js?v=20261104-componentes1";
import {
    FUENTES, DATOS_CADA_MS, IMAGENES_CADA_MS,
    crear, vaciar, aviso, pedir, numero, fechaUTC, fechaHora, hora,
    formatoDiaCorto, nivelEscala, nivelFulguracion, fuerzaFulguracion,
    cadaRato, conMarca, prepararImagen
} from "./sol/comun.js?v=20261104-componentes1";


const COMPONENTES = {
    "sol-tiempo-espacial": montarTiempoEspacial,
    "sol-alertas": montarAlertasSolares,
    "sol-directo": montarSolDirecto,
    "sol-indice-kp": montarIndiceKp
};


function montarComponentes() {
    for (const hueco of document.querySelectorAll("[data-componente]")) {
        const montar = COMPONENTES[hueco.dataset.componente];
        if (!montar) continue;
        try {
            montar(hueco);
        } catch (error) {
            console.error(`Sol: no se pudo montar ${hueco.dataset.componente}`, error);
        }
    }
}


/* ------------------------------------------------------------
   Previsión de la NOAA a 3 días (tabla)
   ------------------------------------------------------------ */

async function cargarPrevision() {
    const caja = document.getElementById("solPrevision");
    let escalas;
    try {
        escalas = await pedir(FUENTES.escalas);
    } catch (error) {
        aviso(caja, "La previsión de la NOAA no está disponible ahora.");
        return;
    }

    const dias = ["1", "2", "3"].map(k => escalas[k]).filter(Boolean);
    if (dias.length === 0) {
        aviso(caja, "La NOAA no ha publicado previsión.");
        return;
    }

    vaciar(caja);
    const tabla = crear("table", "sol-tabla");
    const cabecera = crear("tr");
    ["Día", "Radio R1–R2", "Radio R3+", "Radiación S1+", "Tormenta G"].forEach(t => {
        const th = crear("th", null, t);
        th.scope = "col";
        cabecera.appendChild(th);
    });
    const thead = crear("thead");
    thead.appendChild(cabecera);
    tabla.appendChild(thead);

    const cuerpo = crear("tbody");
    for (const dia of dias) {
        const fila = crear("tr");
        const fecha = fechaUTC(`${dia.DateStamp}T12:00:00`);
        const th = crear("th", null, fecha ? formatoDiaCorto.format(fecha) : dia.DateStamp);
        th.scope = "row";
        fila.appendChild(th);

        const r = dia.R || {};
        const s = dia.S || {};
        const g = dia.G || {};
        fila.appendChild(celdaProbabilidad(r.MinorProb));
        fila.appendChild(celdaProbabilidad(r.MajorProb));
        fila.appendChild(celdaProbabilidad(s.Prob));

        const nivel = nivelEscala(g.Scale);
        const celdaG = crear("td");
        celdaG.appendChild(crear("span", `sol-marca nivel-${nivel}`, nivel > 0 ? `G${nivel}` : "No"));
        fila.appendChild(celdaG);

        cuerpo.appendChild(fila);
    }
    tabla.appendChild(cuerpo);

    const envoltorio = crear("div", "sol-tabla-envoltorio");
    envoltorio.appendChild(tabla);
    caja.appendChild(envoltorio);
}

function celdaProbabilidad(valor) {
    const n = numero(valor);
    const celda = crear("td", "sol-probabilidad", n === null ? "—" : `${n} %`);
    if (n !== null && n >= 30) celda.classList.add("alta");
    else if (n !== null && n >= 10) celda.classList.add("media");
    return celda;
}


/* ------------------------------------------------------------
   Fulguraciones de la semana
   ------------------------------------------------------------ */

async function cargarFulguraciones() {
    const caja = document.getElementById("solFulguraciones");
    let datos;
    try {
        datos = await pedir(FUENTES.fulguraciones);
    } catch (error) {
        aviso(caja, "Las fulguraciones no están disponibles ahora.");
        return;
    }

    const todas = (Array.isArray(datos) ? datos : [])
        .filter(f => f.max_class)
        .map(f => ({
            clase: f.max_class,
            fuerza: numero(f.max_xrlong) || fuerzaFulguracion(f.max_class),
            inicio: fechaUTC(f.begin_time),
            pico: fechaUTC(f.max_time),
            fin: fechaUTC(f.end_time)
        }));

    vaciar(caja);

    if (todas.length === 0) {
        caja.appendChild(crear("p", "sol-aviso", "No se han registrado fulguraciones esta semana."));
        return;
    }

    const cuenta = { X: 0, M: 0, C: 0 };
    todas.forEach(f => {
        const letra = f.clase.charAt(0).toUpperCase();
        if (letra in cuenta) cuenta[letra] += 1;
    });

    const resumen = crear("div", "sol-fulguraciones-resumen");
    [["X", "x"], ["M", "m"], ["C", "c"]].forEach(([letra, clase]) => {
        const pieza = crear("span", `sol-fulguracion-cuenta f-${clase}`);
        pieza.appendChild(crear("strong", null, String(cuenta[letra])));
        pieza.appendChild(document.createTextNode(` de clase ${letra}`));
        resumen.appendChild(pieza);
    });
    caja.appendChild(resumen);

    if (cuenta.X + cuenta.M + cuenta.C === 0) {
        caja.appendChild(crear("p", "sol-aviso",
            "Ninguna de clase C o superior: el Sol está tranquilo. Las más fuertes:"));
    }

    const mejores = [...todas].sort((a, b) => b.fuerza - a.fuerza).slice(0, 8);
    const lista = crear("ol", "sol-fulguraciones-lista");
    for (const f of mejores) {
        const item = crear("li", "sol-fulguracion");
        item.appendChild(crear("span", `sol-fulguracion-clase f-${nivelFulguracion(f.clase)}`, f.clase));
        const textos = crear("span", "sol-fulguracion-textos");
        textos.appendChild(crear("span", "sol-fulguracion-pico", `Pico: ${fechaHora(f.pico)}`));
        textos.appendChild(crear("span", "sol-fulguracion-duracion",
            `De ${hora(f.inicio)} a ${hora(f.fin)}`));
        item.appendChild(textos);
        lista.appendChild(item);
    }
    caja.appendChild(lista);
}


/* ------------------------------------------------------------
   Coronógrafos y auroras
   ------------------------------------------------------------ */

function refrescarImagenes() {
    for (const img of document.querySelectorAll(".sol-imagen-viva")) {
        prepararImagen(img);
        img.src = conMarca(img.dataset.imagen);
    }
}


/* ------------------------------------------------------------
   Arranque
   ------------------------------------------------------------ */

montarComponentes();
cadaRato(() => Promise.all([cargarPrevision(), cargarFulguraciones()]), DATOS_CADA_MS);
cadaRato(refrescarImagenes, IMAGENES_CADA_MS);

/* Fin de fichero: js/sol.js */
