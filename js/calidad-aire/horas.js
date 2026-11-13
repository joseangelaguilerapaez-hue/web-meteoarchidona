/*
 * MeteoArchidona · Componente «Calidad del aire por horas»
 *
 * Una franja de casillas por hora para los próximos días: la primera fila
 * es el índice y las siguientes cada contaminante (PM10, PM2,5, ozono y
 * NO₂), con el color de su categoría. Se desliza de lado en pantallas
 * estrechas. Al pasar por encima (o tocar) una casilla se ve la hora y
 * el valor.
 *
 *     <div data-componente="aire-horas"></div>
 *     <div data-componente="aire-horas" data-horas="48" data-modelo="CAMS_GLOBAL"></div>
 *
 * Por defecto, 96 horas del modelo europeo.
 *
 * API: GET /aire/prevision/horas?localidad&modelo&horas
 */

import {
    pedir, crear, prepararRaiz, aviso, avisoError, titulo, pie, leerLocalidad,
    microgramos, hora, horaSola, diaDeHora, claveDia, horaActualizacion,
    NOMBRES_CATEGORIA, CONTAMINANTES_INDICE, SIMBOLOS, CATEGORIAS, FUENTE_MODELO
} from "./comun.js?v=20261111-aire1";


export async function montarAireHoras(raiz) {
    prepararRaiz(raiz, "aire-horas");
    aviso(raiz, "Preparando la previsión por horas…");

    const horas = Math.min(Math.max(Number(raiz.dataset.horas) || 96, 6), 120);
    const modelo = (raiz.dataset.modelo || "CAMS_EUROPA").toUpperCase();

    let datos;

    try {
        datos = await pedir(`/aire/prevision/horas?localidad=${leerLocalidad(raiz)}&modelo=${encodeURIComponent(modelo)}&horas=${horas}`);
    } catch (error) {
        avisoError(raiz, error, "la previsión por horas");
        return;
    }

    raiz.textContent = "";
    titulo(raiz, "Calidad del aire por horas", datos.nombre_localidad);

    if (!datos.horas.length) {
        raiz.appendChild(crear("p", "air-aviso", "Todavía no hay previsión por horas guardada."));
        pie(raiz, FUENTE_MODELO);
        return;
    }

    const desliza = crear("div", "air-desliza");
    const rejilla = crear("div", "air-franjas");
    rejilla.style.setProperty("--air-columnas", String(datos.horas.length));

    // Fila de días: una etiqueta por día, que ocupa sus horas.
    rejilla.appendChild(crear("span", "air-franja-nombre", ""));
    let inicio = 0;
    while (inicio < datos.horas.length) {
        const clave = claveDia(datos.horas[inicio].hora);
        let fin = inicio;
        while (fin + 1 < datos.horas.length && claveDia(datos.horas[fin + 1].hora) === clave) fin += 1;
        const dia = crear("span", "air-franja-dia", diaDeHora(datos.horas[inicio].hora));
        dia.style.gridColumn = `${inicio + 2} / ${fin + 3}`;
        rejilla.appendChild(dia);
        inicio = fin + 1;
    }

    const filas = [["INDICE", "Índice"], ...CONTAMINANTES_INDICE.map(codigo => [codigo, SIMBOLOS[codigo]])];

    for (const [codigo, nombre] of filas) {
        rejilla.appendChild(crear("span", "air-franja-nombre", nombre));

        datos.horas.forEach(paso => {
            const valor = codigo === "INDICE" ? null : paso.contaminantes.find(item => item.codigo === codigo);
            const categoria = codigo === "INDICE" ? paso.categoria : valor && valor.categoria;
            const casilla = crear("span", `air-casilla cat-${categoria || "NINGUNA"}`);
            if (horaSola(paso.hora) === "0") casilla.classList.add("air-casilla-dia");

            let detalle = `${diaDeHora(paso.hora)} ${hora(paso.hora)} · ${NOMBRES_CATEGORIA[categoria] || "sin dato"}`;
            if (valor) {
                detalle += ` · ${microgramos(valor.valor)}`;
                if (["PM10", "PM25"].includes(codigo)) detalle += ` (media 24 h ${microgramos(valor.valor_indice)})`;
            }
            casilla.title = detalle;
            casilla.setAttribute("aria-label", detalle);
            rejilla.appendChild(casilla);
        });
    }

    // Horas de referencia debajo, cada 6.
    rejilla.appendChild(crear("span", "air-franja-nombre", ""));
    datos.horas.forEach(paso => {
        const texto = Number(horaSola(paso.hora)) % 6 === 0 ? horaSola(paso.hora) : "";
        rejilla.appendChild(crear("span", "air-franja-hora", texto));
    });

    desliza.appendChild(rejilla);
    raiz.appendChild(desliza);

    const leyenda = crear("div", "air-leyenda");
    for (const categoria of CATEGORIAS) {
        const elemento = crear("span", "air-leyenda-elemento");
        elemento.appendChild(crear("span", `air-muestra cat-${categoria}`));
        elemento.appendChild(document.createTextNode(NOMBRES_CATEGORIA[categoria]));
        leyenda.appendChild(elemento);
    }
    raiz.appendChild(leyenda);

    const actualizada = horaActualizacion(datos.actualizada);
    const nombreModelo = datos.modelo === "CAMS_GLOBAL" ? "modelo global" : "modelo europeo";
    pie(raiz, `Hora de Madrid · ${nombreModelo} · ${FUENTE_MODELO}${actualizada ? ` · ${actualizada}` : ""}`);
}


/* Fin de fichero: js/calidad-aire/horas.js */
