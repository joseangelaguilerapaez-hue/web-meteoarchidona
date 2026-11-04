/*
 * MeteoArchidona · Componente «Ahora en Archidona»
 *
 * Observación real de una estación de MeteoArchidona (El Silo por
 * defecto). No es predicción: son los datos medidos.
 *
 *     <div data-componente="prediccion-ahora"></div>
 *     <div data-componente="prediccion-ahora" data-estacion="LOS_LLANOS"
 *          data-titulo="Ahora en Los Llanos"></div>
 *
 *     import {montarAhora} from "/js/prediccion/ahora.js?v=20261104-componentes1";
 *     montarAhora(hueco);
 *
 * Lee GET /condiciones-actuales/{estación} y se renueva cada 5 minutos.
 */

import {
    ESTACION_AHORA, AHORA_CADA_MS,
    crear, prepararRaiz, pedir, numero, cadaRato
} from "./comun.js?v=20261104-componentes1";


const RUMBOS_8 = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];

const ZONA = "Europe/Madrid";


export function montarAhora(raiz) {
    const estacion = (raiz.dataset.estacion || ESTACION_AHORA).toUpperCase();
    const titulo = raiz.dataset.titulo || "Ahora en Archidona";

    prepararRaiz(raiz, "pred-tarjeta", "pred-hoy", "pred-ahora");
    raiz.setAttribute("aria-label", titulo);

    cadaRato(async () => {
        try {
            pintar(raiz, titulo, await pedir(`/condiciones-actuales/${encodeURIComponent(estacion)}`));
        } catch (error) {
            pintar(raiz, titulo, null);
        }
    }, AHORA_CADA_MS);
}


function rumbo(grados) {
    return typeof grados === "number" && Number.isFinite(grados)
        ? RUMBOS_8[Math.round((((grados % 360) + 360) % 360) / 45) % 8]
        : null;
}


function hoyEnMadrid() {
    return new Intl.DateTimeFormat("es-ES", {
        day: "2-digit", month: "2-digit", year: "numeric", timeZone: ZONA
    }).format(new Date());
}


function pintar(raiz, tituloTexto, datos) {
    raiz.textContent = "";

    const titulo = crear("h2", "pred-hoy-titulo", tituloTexto);

    if (!datos) {
        raiz.append(titulo, crear("p", "pred-vacio",
            "Los datos de la estación no están disponibles en este momento."));
        return;
    }

    const fecha = datos.fecha_observacion_exterior || datos.fecha_observacion;
    const hora = datos.hora_observacion_exterior || datos.hora_observacion;
    const cuando = fecha && fecha !== hoyEnMadrid()
        ? `dato del ${fecha.slice(0, 5)} a las ${hora}`
        : `dato de las ${hora}`;

    const principal = crear("div", "pred-hoy-principal");
    const texto = crear("div", "pred-hoy-texto");
    texto.append(
        titulo,
        crear("div", "pred-hoy-temperatura", numero(datos.temperatura_c, "°")),
        crear("div", "pred-ahora-estacion",
            `Estación ${datos.nombre_estacion || "El Silo"} · MeteoArchidona · ${cuando}`)
    );
    principal.append(texto);

    const direccion = rumbo(datos.direccion_viento_grados);
    const velocidad = datos.viento_medio_10_min_kmh ?? datos.viento_actual_kmh;

    const cifras = crear("dl", "pred-hoy-cifras");
    [
        ["Humedad", numero(datos.humedad_pct, " %")],
        ["Viento", velocidad === null || velocidad === undefined
            ? "--"
            : `${direccion || ""} ${numero(velocidad, " km/h")}`.trim()],
        ["Racha", numero(datos.racha_10_min_kmh, " km/h")],
        ["Lluvia hoy", typeof datos.lluvia_dia_mm === "number"
            ? `${datos.lluvia_dia_mm.toLocaleString("es-ES", { maximumFractionDigits: 1 })} mm`
            : "--"],
        ["Presión", numero(datos.presion_hpa, " hPa")],
        ["Índice UV", numero(datos.indice_uv)]
    ].forEach(([etiqueta, valor]) => {
        const bloque = crear("div", "pred-cifra");
        bloque.append(crear("dt", null, etiqueta), crear("dd", null, valor));
        cifras.append(bloque);
    });

    raiz.append(principal, cifras);
}


/* Fin de fichero: js/prediccion/ahora.js */
