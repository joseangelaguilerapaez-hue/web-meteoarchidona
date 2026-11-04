/*
 * MeteoArchidona · Componente «Próximos 7 días»
 *
 * La predicción de AEMET día a día: cielo, probabilidad de lluvia,
 * mínima y máxima (con la barra de temperaturas) y viento.
 *
 *     <div data-componente="prediccion-dias"></div>
 *     <div data-componente="prediccion-dias" data-dias="3"></div>
 *
 *     import {montarDias} from "/js/prediccion/dias.js?v=20261104-componentes1";
 *     montarDias(hueco);
 *
 * Opciones: data-dias limita cuántos días (todos los que dé AEMET por
 * defecto; el título se ajusta); data-municipio, Archidona por defecto.
 */

import {
    PREDICCION_CADA_MS,
    crear, prepararRaiz, municipioDe, pedirPrediccion, numero, icono,
    flechaViento, fechaLocal, nombreDia, ponerFuente, sinPrediccion, cadaRato
} from "./comun.js?v=20261104-componentes1";


export function montarDias(raiz) {
    const municipio = municipioDe(raiz);
    const limite = parseInt(raiz.dataset.dias, 10) || null;

    prepararRaiz(raiz, "pred-tarjeta");
    raiz.dataset.auditoriaVisualizacion = "PREDICCION_DIAS";

    const titulo = crear("h2", "pred-titulo", limite ? `Próximos ${limite} días` : "Próximos 7 días");
    const cuerpo = crear("ol", "pred-dias");
    raiz.append(titulo, cuerpo);
    let pintada = false;

    cadaRato(async () => {
        try {
            const datos = await pedirPrediccion(municipio);
            const diaria = datos.diaria || [];
            pintar(cuerpo, limite ? diaria.slice(0, limite) : diaria);
            ponerFuente(raiz, datos);
            pintada = true;
        } catch (error) {
            sinPrediccion(raiz, cuerpo, pintada);
        }
    }, PREDICCION_CADA_MS);
}


function pintar(lista, diaria) {
    const hoy = fechaLocal(new Date());
    lista.textContent = "";

    const conDato = diaria.filter(d =>
        typeof d.temperatura_min_c === "number" && typeof d.temperatura_max_c === "number");
    const minimo = Math.min(...conDato.map(d => d.temperatura_min_c));
    const maximo = Math.max(...conDato.map(d => d.temperatura_max_c));
    const rango = Math.max(1, maximo - minimo);

    diaria.forEach(dia => {
        const fila = crear("li", "pred-dia");
        const dibujo = crear("div", "pred-dia-icono");
        dibujo.innerHTML = icono(dia.condicion, false);

        const barra = crear("div", "pred-dia-barra");
        const tramo = crear("span", "pred-dia-tramo");

        if (typeof dia.temperatura_min_c === "number" && typeof dia.temperatura_max_c === "number") {
            tramo.style.left = `${((dia.temperatura_min_c - minimo) / rango) * 100}%`;
            tramo.style.right = `${((maximo - dia.temperatura_max_c) / rango) * 100}%`;
        } else {
            tramo.hidden = true;
        }

        barra.append(tramo);

        const viento = crear("div", "pred-dia-viento");
        viento.append(flechaViento(dia.viento_direccion), numero(dia.viento_kmh, " km/h"));

        fila.append(
            crear("div", "pred-dia-nombre", nombreDia(dia.fecha, hoy)),
            dibujo,
            crear("div", "pred-dia-descripcion", dia.descripcion || ""),
            crear("div", "pred-dia-lluvia", numero(dia.prob_precipitacion_pct, "%")),
            crear("div", "pred-dia-min", numero(dia.temperatura_min_c, "°")),
            barra,
            crear("div", "pred-dia-max", numero(dia.temperatura_max_c, "°")),
            viento
        );
        lista.append(fila);
    });
}


/* Fin de fichero: js/prediccion/dias.js */
