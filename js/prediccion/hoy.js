/*
 * MeteoArchidona · Componente «Hoy · predicción de AEMET»
 *
 * Cielo, máxima, mínima, probabilidad de lluvia, viento, racha e índice
 * UV de hoy según AEMET.
 *
 *     <div data-componente="prediccion-hoy"></div>
 *
 *     import {montarHoy} from "/js/prediccion/hoy.js?v=20261104-componentes1";
 *     montarHoy(hueco);
 *
 * Lee GET /prediccion/{municipio} (data-municipio; Archidona por defecto),
 * compartida con «Próximas horas» y «Próximos 7 días».
 */

import {
    PREDICCION_CADA_MS,
    crear, prepararRaiz, municipioDe, pedirPrediccion, numero, icono,
    ponerFuente, sinPrediccion, cadaRato
} from "./comun.js?v=20261104-componentes1";


export function montarHoy(raiz) {
    const municipio = municipioDe(raiz);

    prepararRaiz(raiz, "pred-tarjeta", "pred-hoy-tarjeta");
    raiz.setAttribute("aria-label", "Hoy en Archidona");
    raiz.dataset.auditoriaVisualizacion = "PREDICCION_HOY";

    const cuerpo = crear("div", "pred-hoy");
    raiz.append(cuerpo);
    let pintada = false;

    cadaRato(async () => {
        try {
            const datos = await pedirPrediccion(municipio);
            pintar(cuerpo, datos);
            ponerFuente(raiz, datos);
            pintada = true;
        } catch (error) {
            sinPrediccion(raiz, cuerpo, pintada);
        }
    }, PREDICCION_CADA_MS);
}


function pintar(cuerpo, datos) {
    const dia = (datos.diaria || [])[0];
    const hora = (datos.horaria || [])[0];
    cuerpo.textContent = "";

    if (!dia) {
        cuerpo.append(crear("p", "pred-vacio", "No hay predicción para hoy."));
        return;
    }

    // Cielo de la hora en curso si AEMET lo da; si no, el del día.
    const noche = hora ? Boolean(hora.es_noche) : false;
    const condicion = hora ? hora.condicion : dia.condicion;
    const descripcion = dia.descripcion || (hora ? hora.descripcion : "");

    const principal = crear("div", "pred-hoy-principal");
    const dibujo = crear("div", "pred-hoy-icono");
    dibujo.innerHTML = icono(condicion, noche);

    const texto = crear("div", "pred-hoy-texto");
    texto.append(
        crear("h2", "pred-hoy-titulo", "Hoy · predicción de AEMET"),
        crear("div", "pred-hoy-descripcion", descripcion || "")
    );
    principal.append(dibujo, texto);

    const cifras = crear("dl", "pred-hoy-cifras");
    [
        ["Máxima", numero(dia.temperatura_max_c, " °C"), "pred-max"],
        ["Mínima", numero(dia.temperatura_min_c, " °C"), "pred-min"],
        ["Prob. de lluvia", numero(dia.prob_precipitacion_pct, " %"), "pred-lluvia"],
        ["Viento", dia.viento_kmh === null || dia.viento_kmh === undefined
            ? "--"
            : `${dia.viento_direccion || ""} ${numero(dia.viento_kmh, " km/h")}`.trim(), ""],
        ["Racha máxima", numero(dia.racha_max_kmh, " km/h"), ""],
        ["Índice UV", numero(dia.uv_max), ""]
    ].forEach(([etiqueta, valor, clase]) => {
        const bloque = crear("div", "pred-cifra");
        bloque.append(crear("dt", null, etiqueta), crear("dd", clase, valor));
        cifras.append(bloque);
    });

    cuerpo.append(principal, cifras);
}


/* Fin de fichero: js/prediccion/hoy.js */
