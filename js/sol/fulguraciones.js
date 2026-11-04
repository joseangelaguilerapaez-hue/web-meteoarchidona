/*
 * MeteoArchidona · Componente «Fulguraciones de 7 días»
 *
 * Cuántas fulguraciones de clase X, M y C ha habido en la última semana
 * (satélites GOES) y las más fuertes, con su hora en Madrid.
 *
 *     <div data-componente="sol-fulguraciones"></div>
 *     <div data-componente="sol-fulguraciones" data-cuantas="3"></div>
 *
 *     import {montarFulguraciones} from "/js/sol/fulguraciones.js?v=20261104-componentes2";
 *     montarFulguraciones(hueco);
 *
 * Opciones: data-cuantas, cuántas de las más fuertes se listan (8 por
 * defecto; 0 deja solo el recuento). Se renueva sola cada 5 minutos.
 */

import {
    FUENTES, DATOS_CADA_MS,
    crear, vaciar, aviso, prepararRaiz, ponerPie,
    pedir, numero, fechaUTC, fechaHora, hora,
    nivelFulguracion, fuerzaFulguracion, cadaRato
} from "./comun.js?v=20261104-componentes2";


export function montarFulguraciones(raiz) {
    const valor = parseInt(raiz.dataset.cuantas, 10);
    const cuantas = Number.isFinite(valor) && valor >= 0 ? valor : 8;

    prepararRaiz(raiz, "sol-fulguraciones");

    const caja = crear("div", "sol-fulguraciones-caja");
    aviso(caja, "Cargando fulguraciones…");
    raiz.appendChild(caja);

    cadaRato(async () => {
        ponerPie(raiz, await pintar(caja, cuantas));
    }, DATOS_CADA_MS);
}


async function pintar(caja, cuantas) {
    let datos;
    try {
        datos = await pedir(FUENTES.fulguraciones);
    } catch (error) {
        aviso(caja, "Las fulguraciones no están disponibles ahora.");
        return false;
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
        return true;
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

    if (cuantas === 0) {
        return true;
    }

    if (cuenta.X + cuenta.M + cuenta.C === 0) {
        caja.appendChild(crear("p", "sol-aviso",
            "Ninguna de clase C o superior: el Sol está tranquilo. Las más fuertes:"));
    }

    const mejores = [...todas].sort((a, b) => b.fuerza - a.fuerza).slice(0, cuantas);
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
    return true;
}


/* Fin de fichero: js/sol/fulguraciones.js */
