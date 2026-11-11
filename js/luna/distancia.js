/*
 * MeteoArchidona · Componente «Distancia y superlunas»
 *
 * La distancia de la Luna a la Tierra día a día durante el año: sube y
 * baja entre unos 356.000 km (perigeo) y 407.000 km (apogeo). Las lunas
 * llenas cerca del perigeo son superlunas: se ven algo más grandes y
 * brillantes. Debajo, la lista de superlunas del año.
 *
 *     <div data-componente="luna-distancia"></div>
 *
 * Opciones:
 *     data-anio   el año (por defecto, el actual).
 */

import {
    FUENTE_CALCULO,
    aviso, crear, crearSvg, diaHora, entero, hoyMadrid, km, pedir, prepararRaiz, pie, textoError, vaciar
} from "./comun.js?v=20261111-luna5";


const ANCHO = 720;
const ALTO = 220;
const MARGEN = { izquierda: 54, derecha: 10, arriba: 14, abajo: 26 };
const MINIMO = 355_000;
const MAXIMO = 408_000;
const MESES = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];


function grafica(datos) {
    const svg = crearSvg("svg", {
        viewBox: `0 0 ${ANCHO} ${ALTO}`,
        class: "lun-grafica",
        role: "img",
        "aria-label": `Distancia de la Luna durante ${datos.anio}`
    });

    const ancho = ANCHO - MARGEN.izquierda - MARGEN.derecha;
    const alto = ALTO - MARGEN.arriba - MARGEN.abajo;
    const total = Math.max(1, datos.dias.length - 1);
    const x = (i) => MARGEN.izquierda + (i / total) * ancho;
    const y = (d) => MARGEN.arriba + ((d - MINIMO) / (MAXIMO - MINIMO)) * alto;
    const indice = new Map(datos.dias.map((d, i) => [d.fecha, i]));

    for (const marca of [360_000, 380_000, 400_000]) {
        svg.appendChild(crearSvg("line", { x1: MARGEN.izquierda, x2: ANCHO - MARGEN.derecha, y1: y(marca), y2: y(marca), class: "lun-rejilla" }));
        const texto = crearSvg("text", { x: MARGEN.izquierda - 6, y: y(marca) + 4, class: "lun-eje", "text-anchor": "end" });
        texto.textContent = `${entero(marca / 1000)} mil`;
        svg.appendChild(texto);
    }

    datos.dias.forEach((dia, i) => {
        if (dia.fecha.slice(8) === "01") {
            const texto = crearSvg("text", { x: x(i) + 2, y: ALTO - 8, class: "lun-eje" });
            texto.textContent = MESES[Number(dia.fecha.slice(5, 7)) - 1];
            svg.appendChild(texto);
        }
    });

    const puntos = datos.dias.map((d, i) => `${x(i).toFixed(1)},${y(d.distancia_km).toFixed(1)}`).join(" ");
    svg.appendChild(crearSvg("polyline", { points: puntos, class: "lun-linea" }));

    const hoy = indice.get(hoyMadrid());
    if (hoy !== undefined) {
        svg.appendChild(crearSvg("line", { x1: x(hoy), x2: x(hoy), y1: MARGEN.arriba, y2: ALTO - MARGEN.abajo, class: "lun-hoy-linea" }));
    }

    const marcar = (eventos, clase, radio) => {
        for (const evento of eventos) {
            const i = indice.get(evento.momento.slice(0, 10));
            if (i === undefined || evento.valor === null) continue;
            const punto = crearSvg("circle", { cx: x(i), cy: y(evento.valor), r: radio, class: clase });
            const titulo = crearSvg("title");
            titulo.textContent = `${evento.titulo}: ${diaHora(evento.momento)}, ${km(evento.valor)}`;
            punto.appendChild(titulo);
            svg.appendChild(punto);
        }
    };

    marcar(datos.perigeos, "lun-punto-perigeo", 3);
    marcar(datos.apogeos, "lun-punto-apogeo", 3);
    marcar(datos.superlunas, "lun-punto-superluna", 6);
    return svg;
}


function pintar(raiz, datos) {
    vaciar(raiz);

    if (!datos.dias.length) {
        aviso(raiz, `Todavía no está calculado ${datos.anio}.`);
        return;
    }

    raiz.appendChild(grafica(datos));

    const leyenda = crear("ul", "lun-leyenda");
    leyenda.appendChild(crear("li", "lun-leyenda-superluna", "Superluna"));
    leyenda.appendChild(crear("li", "lun-leyenda-perigeo", "Perigeo (más cerca)"));
    leyenda.appendChild(crear("li", "lun-leyenda-apogeo", "Apogeo (más lejos)"));
    raiz.appendChild(leyenda);

    if (datos.superlunas.length) {
        raiz.appendChild(crear("h4", "lun-subtitulo", `Superlunas de ${datos.anio}`));
        const lista = crear("ul", "lun-lista");
        for (const s of datos.superlunas) {
            lista.appendChild(crear("li", "lun-cifra", `${diaHora(s.momento)} · ${km(s.valor)}`));
        }
        raiz.appendChild(lista);
    } else {
        raiz.appendChild(crear("p", "lun-nota", `En ${datos.anio} no hay superlunas (luna llena a menos de 360.000 km).`));
    }

    pie(raiz, `Distancia entre los centros de la Tierra y la Luna a las 00:00 de cada día. Superluna: luna llena a menos de 360.000 km. ${FUENTE_CALCULO}.`);
}


export async function montarDistanciaLuna(raiz) {
    prepararRaiz(raiz, "luna-distancia");
    const anio = parseInt(raiz.dataset.anio || hoyMadrid().slice(0, 4), 10);
    aviso(raiz, "Cargando…");

    try {
        pintar(raiz, await pedir(`/luna/distancia?anio=${anio}`));
    } catch (error) {
        aviso(raiz, textoError(error), true);
    }
}


/* Fin de fichero: js/luna/distancia.js */
