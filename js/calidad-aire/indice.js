/*
 * MeteoArchidona · Componente «Calidad del aire ahora»
 *
 * El índice de calidad del aire de esta hora en Archidona según el
 * modelo CAMS: un sello con su color y su categoría (las seis del
 * Índice Nacional de Calidad del Aire), qué contaminante lo marca y,
 * debajo, cada contaminante con su valor y su categoría, el nivel de
 * calima de hoy y el espesor óptico de aerosoles.
 *
 *     <div data-componente="aire-indice"></div>
 *     <div data-componente="aire-indice" data-localidad="29017" data-titulo="no"></div>
 *
 * Las partículas se clasifican con la media de las últimas 24 horas y
 * los gases con el valor de la hora, como el índice oficial.
 *
 * API: GET /aire/actual?localidad
 */

import {
    pedir, crear, prepararRaiz, aviso, avisoError, titulo, pie, leerLocalidad,
    pastillaCategoria, pastillaCalima, microgramos, espesor, hora, horaActualizacion,
    NOMBRES_CATEGORIA, CONTAMINANTES_INDICE, FUENTE_MODELO
} from "./comun.js?v=20261111-aire1";


const NOMBRES = {
    PM10: "Partículas PM10",
    PM25: "Partículas finas PM2,5",
    O3: "Ozono",
    NO2: "Dióxido de nitrógeno"
};


export async function montarAireIndice(raiz) {
    prepararRaiz(raiz, "aire-indice");
    aviso(raiz, "Mirando el aire de ahora…");

    let datos;

    try {
        datos = await pedir(`/aire/actual?localidad=${leerLocalidad(raiz)}`);
    } catch (error) {
        avisoError(raiz, error, "la calidad del aire");
        return;
    }

    raiz.textContent = "";
    titulo(raiz, "Calidad del aire ahora", datos.nombre_localidad);

    if (!datos.hora) {
        raiz.appendChild(crear("p", "air-aviso", "Todavía no hay previsión del aire guardada para esta hora."));
        pie(raiz, FUENTE_MODELO);
        return;
    }

    const caja = crear("div", "air-ahora");

    const nombreCategoria = NOMBRES_CATEGORIA[datos.categoria] || "Sin dato";
    const sello = crear("div", `air-sello cat-${datos.categoria || "NINGUNA"}`);
    if (nombreCategoria.length > 12) sello.classList.add("air-sello-largo");
    sello.setAttribute("role", "img");
    sello.setAttribute("aria-label", `Calidad del aire: ${NOMBRES_CATEGORIA[datos.categoria] || "sin dato"}`);
    const textoSello = crear("div");
    textoSello.appendChild(crear("small", null, hora(datos.hora)));
    textoSello.appendChild(crear("strong", null, NOMBRES_CATEGORIA[datos.categoria] || "Sin dato"));
    sello.appendChild(textoSello);
    caja.appendChild(sello);

    const lista = crear("ul", "air-lista");

    for (const valor of datos.contaminantes.filter(valor => CONTAMINANTES_INDICE.includes(valor.codigo))) {
        const fila = crear("li", `air-fila cat-${valor.categoria || "NINGUNA"}`);
        const nombre = crear("span", "air-fila-nombre");
        nombre.appendChild(crear("strong", null, valor.simbolo));
        nombre.appendChild(crear("small", null, NOMBRES[valor.codigo] || ""));
        fila.appendChild(nombre);

        const cifra = valor.valor_indice ?? valor.valor;
        const media = ["PM10", "PM25"].includes(valor.codigo);
        fila.appendChild(crear("span", "air-cifra", microgramos(cifra)));
        fila.appendChild(pastillaCategoria(valor.categoria, true));
        fila.title = media
            ? `Media de las últimas 24 horas: ${microgramos(valor.valor_indice)}; ahora: ${microgramos(valor.valor)}`
            : `Ahora: ${microgramos(valor.valor)}`;

        if (valor.codigo === datos.contaminante_peor && datos.categoria !== "BUENA") {
            fila.classList.add("air-fila-peor");
        }

        lista.appendChild(fila);
    }

    caja.appendChild(lista);
    raiz.appendChild(caja);

    const extra = crear("div", "air-ahora-extra");
    const calima = crear("span", "air-dato");
    calima.appendChild(crear("small", null, "Calima hoy"));
    calima.appendChild(pastillaCalima(datos.nivel_calima, true));
    extra.appendChild(calima);

    const polvo = datos.contaminantes.find(valor => valor.codigo === "POLVO");
    if (polvo) {
        const dato = crear("span", "air-dato");
        dato.appendChild(crear("small", null, "Polvo ahora"));
        dato.appendChild(crear("strong", "air-cifra", microgramos(polvo.valor)));
        extra.appendChild(dato);
    }

    if (datos.espesor_optico !== null && datos.espesor_optico !== undefined) {
        const dato = crear("span", "air-dato");
        dato.title = "Espesor óptico de aerosoles a 550 nm (modelo global): por encima de 0,3 el cielo se ve turbio; con calima intensa pasa de 1.";
        dato.appendChild(crear("small", null, "Turbidez (AOD)"));
        dato.appendChild(crear("strong", "air-cifra", espesor(datos.espesor_optico)));
        extra.appendChild(dato);
    }

    raiz.appendChild(extra);

    const actualizada = horaActualizacion(datos.actualizada);
    pie(raiz, `Previsión para las ${hora(datos.hora)} · partículas con la media de 24 h · ${FUENTE_MODELO}${actualizada ? ` · ${actualizada}` : ""}`);
}


/* Fin de fichero: js/calidad-aire/indice.js */
