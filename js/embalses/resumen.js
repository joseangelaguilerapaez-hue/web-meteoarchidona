/*
 * MeteoArchidona · Componente «Resumen de embalses»
 *
 * El agua embalsada de un ámbito la última semana del boletín: un vaso
 * lleno hasta su porcentaje (con la marca de la media de 10 años), los
 * hectómetros cúbicos, la variación de la semana y la comparación con
 * hace un año y con las medias de 5 y 10 años.
 *
 *     <div data-componente="embalses-resumen"></div>                       (Andalucía)
 *     <div data-componente="embalses-resumen" data-ambito="ESPANA"></div>
 *     <div data-componente="embalses-resumen" data-ambito="CUENCA" data-codigo="GUADALQUIVIR"></div>
 *
 *     import {montarResumenEmbalses} from "/js/embalses/resumen.js?v=…";
 *     montarResumenEmbalses(hueco);
 *
 * Opcional: data-titulo="no" para que no ponga el nombre del ámbito
 * (la página Embalses ya lo tiene en su cabecera).
 *
 * API: GET /embalses/resumen?ambito&codigo.
 */

import {
    leerAmbito, consulta, pedir,
    crear, aviso, prepararRaiz, estado, vaso, pieBoletin,
    porcentaje, hm3, variacion, puntos, claseTendencia
} from "./comun.js?v=20261105-embalses1";


export async function montarResumenEmbalses(raiz) {
    prepararRaiz(raiz, "embalses-resumen");
    aviso(raiz, "Cargando los embalses…");

    const ambito = leerAmbito(raiz);

    let datos;
    try {
        datos = await pedir(`/embalses/resumen?${consulta(ambito)}`);
    } catch (error) {
        aviso(raiz, error.estado === 404
            ? "No hay embalses en ese ámbito."
            : "No se han podido leer los embalses. Se puede volver a intentar más tarde.", true);
        return;
    }

    const resumen = datos.resumen;
    raiz.textContent = "";

    if (raiz.dataset.titulo !== "no") {
        const cabeza = crear("div");
        cabeza.appendChild(crear("div", "emb-etiqueta", "Embalses"));
        cabeza.appendChild(crear("h3", "emb-titulo", datos.ambito.nombre));
        raiz.appendChild(cabeza);
    }

    if (!resumen) {
        aviso(raiz, "Todavía no hay datos de este ámbito.");
        return;
    }

    const bloque = crear("div", "emb-resumen");
    bloque.appendChild(vaso(resumen.porcentaje, { marcas: [resumen.media_diez_anios] }));

    const textos = crear("div", "emb-resumen-datos");

    const principal = crear("p", "emb-resumen-principal");
    principal.appendChild(crear("strong", "emb-cifra", hm3(resumen.agua)));
    principal.appendChild(document.createTextNode(` de ${hm3(resumen.capacidad)} `));
    principal.appendChild(estado(resumen.estado));
    textos.appendChild(principal);

    const semana = crear("p", "emb-resumen-principal");
    semana.appendChild(document.createTextNode("Esta semana: "));
    semana.appendChild(crear("span", `emb-cifra ${claseTendencia(resumen.variacion_semanal)}`, variacion(resumen.variacion_semanal)));
    textos.appendChild(semana);

    const comparativas = crear("dl", "emb-comparativas");
    const filas = [
        ["Hace un año", resumen.porcentaje_hace_un_anio],
        ["Media 5 años", resumen.media_cinco_anios],
        ["Media 10 años", resumen.media_diez_anios]
    ];

    for (const [titulo, valor] of filas) {
        const caja = crear("div", "emb-comparativa");
        caja.appendChild(crear("dt", null, titulo));
        const cifra = crear("dd", null, porcentaje(valor));
        if (valor !== null && valor !== undefined && resumen.porcentaje !== null) {
            const diferencia = resumen.porcentaje - valor;
            cifra.appendChild(crear("small", claseTendencia(diferencia), `ahora ${puntos(diferencia)}`));
        }
        caja.appendChild(cifra);
        comparativas.appendChild(caja);
    }

    textos.appendChild(comparativas);
    bloque.appendChild(textos);
    raiz.appendChild(bloque);

    pieBoletin(raiz, resumen.fecha);
}


/* Fin de fichero: js/embalses/resumen.js */
