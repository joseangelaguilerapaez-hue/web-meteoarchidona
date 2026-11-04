/*
 * MeteoArchidona · Componente «Próximas horas»
 *
 * La predicción de AEMET hora a hora: cielo, temperatura, probabilidad
 * de lluvia y viento. Se desplaza de lado; un cambio de día lleva su
 * marca.
 *
 *     <div data-componente="prediccion-horas"></div>
 *     <div data-componente="prediccion-horas" data-horas="12"></div>
 *
 *     import {montarHoras} from "/js/prediccion/horas.js?v=20261104-componentes1";
 *     montarHoras(hueco);
 *
 * Opciones: data-horas limita cuántas horas se enseñan (todas las que dé
 * AEMET por defecto); data-municipio, Archidona por defecto.
 */

import {
    PREDICCION_CADA_MS,
    crear, prepararRaiz, municipioDe, pedirPrediccion, numero, icono,
    flechaViento, fechaLocal, nombreDia, formatoSoloHora,
    ponerFuente, sinPrediccion, cadaRato
} from "./comun.js?v=20261104-componentes1";


export function montarHoras(raiz) {
    const municipio = municipioDe(raiz);
    const limite = parseInt(raiz.dataset.horas, 10) || null;

    prepararRaiz(raiz, "pred-tarjeta");
    raiz.dataset.auditoriaVisualizacion = "PREDICCION_HORAS";

    const titulo = crear("h2", "pred-titulo", "Próximas horas");
    const cuerpo = crear("div", "pred-horas");
    cuerpo.tabIndex = 0;
    cuerpo.setAttribute("aria-label", "Predicción por horas; se desplaza de lado");
    raiz.append(titulo, cuerpo);
    let pintada = false;

    cadaRato(async () => {
        try {
            const datos = await pedirPrediccion(municipio);
            const horaria = datos.horaria || [];
            pintar(cuerpo, limite ? horaria.slice(0, limite) : horaria);
            ponerFuente(raiz, datos);
            pintada = true;
        } catch (error) {
            sinPrediccion(raiz, cuerpo, pintada);
        }
    }, PREDICCION_CADA_MS);
}


function pintar(cuerpo, horaria) {
    cuerpo.textContent = "";
    let diaAnterior = null;

    horaria.forEach((hora, i) => {
        const instante = new Date(hora.instante);
        const dia = fechaLocal(instante);
        const celda = crear("div", "pred-hora");

        if (diaAnterior !== null && dia !== diaAnterior) {
            celda.classList.add("pred-hora-nuevo-dia");
            celda.dataset.dia = nombreDia(dia, fechaLocal(new Date()));
        }

        diaAnterior = dia;

        const etiqueta = i === 0 ? "Ahora" : `${formatoSoloHora.format(instante)} h`;
        const dibujo = crear("div", "pred-hora-icono");
        dibujo.innerHTML = icono(hora.condicion, hora.es_noche);
        dibujo.title = hora.descripcion || "";

        const viento = crear("div", "pred-hora-viento");
        viento.append(flechaViento(hora.viento_direccion), numero(hora.viento_kmh));

        celda.append(
            crear("div", "pred-hora-etiqueta", etiqueta),
            dibujo,
            crear("div", "pred-hora-temperatura", numero(hora.temperatura_c, "°")),
            crear("div", "pred-hora-lluvia", numero(hora.prob_precipitacion_pct, "%")),
            viento
        );
        cuerpo.append(celda);
    });
}


/* Fin de fichero: js/prediccion/horas.js */
