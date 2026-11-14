/*
 * MeteoArchidona · Agua y sequía · Ríos: caudal y estado
 *
 *     <div data-componente="rios-resumen"></div>
 *     <div data-componente="rios-resumen" data-rio="GUADALHORCE"></div>
 *
 * Una tarjeta por río (Genil, Guadalhorce, Guadalquivir, Guadalete y
 * Guadiana) con sus estaciones: caudal medido ahora en el SAIH
 * (provisional) y su tendencia, estado para la época según GloFAS (el
 * caudal simulado de hoy frente a lo normal 1991-2020) y la mayor crecida
 * registrada. Pulsar una estación la lleva a las gráficas de la página.
 *
 * Opciones: data-rio (código de un río) y data-titulo="no".
 *
 * API: GET /agua/rios (docs/agua-sequia.md de la API).
 */

import {
    aviso, caudal, crear, EVENTO_ESTACION, FLECHAS, hora, leerRios, marcaEstado, nivel, pedir, pie, prepararRaiz
} from "./comun.js?v=20261114-rios1";


function filaEstacion(estacion) {
    const fila = crear("button", "rio-estacion");
    fila.type = "button";
    fila.title = `Ver las gráficas de ${estacion.nombre}`;

    const nombre = crear("span", "rio-estacion-nombre", estacion.nombre);
    fila.appendChild(nombre);

    const medida = crear("span", "rio-medida");
    if (estacion.sistema === "GLOFAS") {
        medida.appendChild(crear("strong", null, caudal(estacion.modelo_hoy)));
        medida.appendChild(crear("span", "rio-detalle", "modelo, sin medición"));
    } else if (estacion.ultima && estacion.ultima.caudal !== null) {
        medida.appendChild(crear("strong", null, caudal(estacion.ultima.caudal)));
        const detalle = [hora(estacion.ultima.hora)];
        if (estacion.ultima.nivel !== null) detalle.push(nivel(estacion.ultima.nivel));
        if (estacion.tendencia) detalle.push(FLECHAS[estacion.tendencia]);
        medida.appendChild(crear("span", "rio-detalle", detalle.join(" · ")));
    } else {
        medida.appendChild(crear("strong", null, "Sin dato"));
        medida.appendChild(crear("span", "rio-detalle", estacion.ultima ? `sensor sin lectura (${hora(estacion.ultima.hora)})` : "todavía sin lecturas"));
    }
    fila.appendChild(medida);

    const estado = crear("span", "rio-estado-caja");
    estado.appendChild(marcaEstado(estacion.estado, estacion.nombre_estado));
    if (estacion.maximo && estacion.maximo.caudal) {
        estado.appendChild(crear("span", "rio-detalle",
            `máximo ${caudal(estacion.maximo.caudal)} (${new Date(estacion.maximo.fecha).getFullYear()})`));
    }
    fila.appendChild(estado);

    fila.addEventListener("click", () => {
        document.dispatchEvent(new CustomEvent(EVENTO_ESTACION, { detail: estacion.id }));
        const destino = document.querySelector('[data-componente="rios-caudal"]');
        if (destino) destino.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return fila;
}


export async function montarResumenRios(raiz) {
    prepararRaiz(raiz, "rios-resumen");
    const cabeza = crear("div", "seq-cabeza");
    const textos = crear("div");
    textos.appendChild(crear("div", "emb-etiqueta", "Ríos · ahora"));
    if (raiz.dataset.titulo !== "no") {
        textos.appendChild(crear("h3", "emb-titulo", "¿Cómo bajan los ríos?"));
    }
    cabeza.appendChild(textos);
    raiz.appendChild(cabeza);

    const cuerpo = crear("div", "seq-cuerpo");
    raiz.appendChild(cuerpo);
    aviso(cuerpo, "Cargando los ríos…");

    let datos;
    try {
        const rio = (raiz.dataset.rio || "").trim();
        datos = rio ? await pedir(`/agua/rios?rio=${encodeURIComponent(rio)}`) : await leerRios();
    } catch {
        aviso(cuerpo, "No se han podido leer los ríos. Prueba dentro de un rato.", true);
        return;
    }
    cuerpo.textContent = "";
    if (!datos.rios.length) {
        aviso(cuerpo, "No hay ese río.");
        return;
    }

    const rejilla = crear("div", "rio-tarjetas");
    for (const rio of datos.rios) {
        const tarjeta = crear("article", "rio-tarjeta");
        const titulo = crear("header", "rio-tarjeta-cabeza");
        titulo.appendChild(crear("h4", null, rio.nombre));
        titulo.appendChild(crear("span", "rio-detalle", `Cuenca ${rio.cuenca}`));
        tarjeta.appendChild(titulo);
        for (const estacion of rio.estaciones) tarjeta.appendChild(filaEstacion(estacion));
        const fuentes = [...new Set(rio.estaciones.map(e => e.fuente))];
        tarjeta.appendChild(crear("p", "rio-fuente", fuentes.join(" · ")));
        rejilla.appendChild(tarjeta);
    }
    cuerpo.appendChild(rejilla);

    cuerpo.appendChild(crear("p", "seq-nota",
        "Caudal: lo que mide ahora la estación. Estado: cómo va el río para estas fechas según el modelo GloFAS " +
        "(su caudal de hoy frente a lo normal de 1991 a 2020)."));
    cuerpo.appendChild(crear("p", "emb-aviso", `${datos.aviso_saih} ${datos.aviso_glofas}`));
    pie(cuerpo, `Fuentes: SAIH Guadalquivir (CHG) y Red Hidrosur (Junta de Andalucía), datos en tiempo real sin contrastar; ${datos.atribucion_glofas}`);
}


/* Fin de fichero: js/rios/resumen.js */
