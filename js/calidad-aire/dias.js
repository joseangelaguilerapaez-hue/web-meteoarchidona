/*
 * MeteoArchidona · Componente «Calidad del aire próximos días»
 *
 * Una columna por día con la peor categoría del índice del día, cada
 * contaminante con su máximo horario y su categoría, y la calima del
 * día (con aviso de posible lluvia de barro). Los cuatro primeros días
 * salen del modelo europeo y el quinto del global, que llega más lejos.
 *
 *     <div data-componente="aire-dias"></div>
 *     <div data-componente="aire-dias" data-dias="3" data-titulo="no"></div>
 *
 * API: GET /aire/prevision/dias?localidad&dias
 */

import {
    pedir, crear, prepararRaiz, aviso, avisoError, titulo, pie, leerLocalidad,
    pastillaCalima, microgramos, diaCorto, fechaLarga, horaActualizacion,
    NOMBRES_CATEGORIA, NOMBRES_CATEGORIA_CORTOS, CONTAMINANTES_INDICE, FUENTE_MODELO
} from "./comun.js?v=20261111-aire1";


export async function montarAireDias(raiz) {
    prepararRaiz(raiz, "aire-dias");
    aviso(raiz, "Preparando los próximos días…");

    const dias = Math.min(Math.max(Number(raiz.dataset.dias) || 5, 1), 5);

    let datos;

    try {
        datos = await pedir(`/aire/prevision/dias?localidad=${leerLocalidad(raiz)}&dias=${dias}`);
    } catch (error) {
        avisoError(raiz, error, "la previsión de los próximos días");
        return;
    }

    raiz.textContent = "";
    titulo(raiz, "Calidad del aire próximos días", datos.nombre_localidad);

    if (!datos.dias.length) {
        raiz.appendChild(crear("p", "air-aviso", "Todavía no hay previsión guardada para estos días."));
        pie(raiz, FUENTE_MODELO);
        return;
    }

    const columnas = crear("div", "air-dias");

    datos.dias.forEach((dia, posicion) => {
        const tarjeta = crear("article", `air-dia cat-${dia.categoria || "NINGUNA"}`);
        tarjeta.title = fechaLarga(dia.fecha);

        const cabeza = crear("header", "air-dia-cabeza");
        cabeza.appendChild(crear("strong", null, posicion === 0 ? "Hoy" : diaCorto(dia.fecha)));
        if (dia.modelo === "CAMS_GLOBAL") {
            const marca = crear("small", "air-dia-modelo", "global");
            marca.title = "Este día sale del modelo global (45 km), menos detallado que el europeo.";
            cabeza.appendChild(marca);
        }
        tarjeta.appendChild(cabeza);

        const sello = crear("div", `air-dia-sello cat-${dia.categoria || "NINGUNA"}`, NOMBRES_CATEGORIA_CORTOS[dia.categoria] || "Sin dato");
        sello.title = NOMBRES_CATEGORIA[dia.categoria] || "Sin dato";
        tarjeta.appendChild(sello);

        const lista = crear("ul", "air-dia-lista");
        for (const valor of dia.contaminantes.filter(item => CONTAMINANTES_INDICE.includes(item.codigo))) {
            const fila = crear("li", `cat-${valor.categoria || "NINGUNA"}`);
            fila.appendChild(crear("span", "air-punto"));
            fila.appendChild(crear("span", null, valor.simbolo));
            fila.appendChild(crear("span", "air-cifra", microgramos(valor.maximo, false)));
            fila.title = `${valor.simbolo}: media ${microgramos(valor.media)}, máximo ${microgramos(valor.maximo)}; ${NOMBRES_CATEGORIA[valor.categoria] || "sin dato"}`;
            lista.appendChild(fila);
        }
        tarjeta.appendChild(lista);

        if (dia.calima) {
            const calima = crear("div", "air-dia-calima");
            calima.appendChild(pastillaCalima(dia.calima.nivel, true));
            calima.appendChild(crear("small", "air-cifra", `polvo ${microgramos(dia.calima.polvo_medio)}`));
            if (dia.calima.lluvia_barro) {
                calima.appendChild(crear("small", "air-barro", "Posible lluvia de barro"));
            }
            tarjeta.appendChild(calima);
        }

        columnas.appendChild(tarjeta);
    });

    raiz.appendChild(columnas);

    const actualizada = horaActualizacion(datos.actualizada);
    pie(raiz, `Máximo horario de cada contaminante (µg/m³) · polvo, media del día · ${FUENTE_MODELO}${actualizada ? ` · ${actualizada}` : ""}`);

    // Para quien solo mira la categoría sin color.
    const resumen = datos.dias.map((dia, posicion) =>
        `${posicion === 0 ? "hoy" : diaCorto(dia.fecha)}: ${(NOMBRES_CATEGORIA[dia.categoria] || "sin dato").toLowerCase()}`
    ).join("; ");
    columnas.setAttribute("aria-label", `Calidad del aire por días: ${resumen}`);
}



/* Fin de fichero: js/calidad-aire/dias.js */
