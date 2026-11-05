/*
 * MeteoArchidona · Componente «Embalses de la comarca»
 *
 * Unos pocos embalses elegidos, cada uno con su vaso de agua, su
 * porcentaje y la variación de la semana. Por defecto, los que más
 * importan a Archidona y su entorno: Iznájar, Guadalhorce-Guadalteba,
 * Conde de Guadalhorce y La Viñuela (José, 5-11-2026).
 *
 *     <div data-componente="embalses-comarca"></div>
 *     <div data-componente="embalses-comarca"
 *          data-embalses="GUADALQUIVIR-IZNAJAR,MEDITERRANEA_ANDALUZA-LIMONERO"
 *          data-titulo="Mis embalses"></div>
 *
 *     import {montarComarcaEmbalses} from "/js/embalses/comarca.js?v=…";
 *     montarComarcaEmbalses(hueco);
 *
 * data-embalses: códigos separados por comas (los de la lista).
 * data-titulo: título del bloque; «no» para quitarlo.
 *
 * Cada embalse lleva a su ficha en la página Embalses; en la propia
 * página avisa con el evento «embalses:embalse».
 *
 * API: GET /embalses/ficha/{codigo}, uno por embalse.
 */

import {
    pedir, enlacePagina,
    crear, aviso, prepararRaiz, vaso, pieBoletin,
    hm3, variacion, claseTendencia
} from "./comun.js?v=20261105-embalses1";


export const EMBALSES_COMARCA = [
    "GUADALQUIVIR-IZNAJAR",
    "MEDITERRANEA_ANDALUZA-GUADALHORCE_GUADALTEBA",
    "MEDITERRANEA_ANDALUZA-CONDE_GUADALHORCE",
    "MEDITERRANEA_ANDALUZA-VINUELA_LA"
];


export async function montarComarcaEmbalses(raiz) {
    prepararRaiz(raiz, "embalses-comarca");
    aviso(raiz, "Cargando los embalses…");

    const codigos = (raiz.dataset.embalses || EMBALSES_COMARCA.join(","))
        .split(",")
        .map(codigo => codigo.trim().toUpperCase())
        .filter(Boolean);

    const fichas = await Promise.all(
        codigos.map(codigo => pedir(`/embalses/ficha/${encodeURIComponent(codigo)}`).catch(() => null))
    );
    const encontradas = fichas.filter(Boolean);

    raiz.textContent = "";

    if (!encontradas.length) {
        aviso(raiz, "No se han podido leer los embalses. Se puede volver a intentar más tarde.", true);
        return;
    }

    const titulo = raiz.dataset.titulo ?? "Embalses de la comarca";
    if (titulo !== "no") {
        raiz.appendChild(crear("h3", "emb-titulo", titulo));
    }

    const rejilla = crear("div", "emb-comarca");

    for (const { embalse, resumen } of encontradas) {
        const enlace = crear("a", "emb-comarca-embalse");
        enlace.href = enlacePagina({ embalse: embalse.codigo });
        enlace.dataset.embalse = embalse.codigo;
        enlace.appendChild(vaso(resumen ? resumen.porcentaje : embalse.porcentaje));
        enlace.appendChild(crear("span", "emb-comarca-nombre", embalse.nombre));

        const detalle = crear("span", "emb-comarca-detalle");
        detalle.appendChild(document.createTextNode(`${hm3(embalse.agua)} · `));
        detalle.appendChild(crear("span", claseTendencia(embalse.variacion_semanal), variacion(embalse.variacion_semanal)));
        enlace.appendChild(detalle);

        rejilla.appendChild(enlace);
    }

    rejilla.addEventListener("click", evento => {
        const enlace = evento.target.closest("a[data-embalse]");
        if (!enlace) return;
        const peticion = new CustomEvent("embalses:embalse", {
            bubbles: true,
            cancelable: true,
            detail: { codigo: enlace.dataset.embalse }
        });
        if (!raiz.dispatchEvent(peticion)) evento.preventDefault();
    });

    raiz.appendChild(rejilla);

    const conFecha = encontradas.find(ficha => ficha.resumen);
    if (conFecha) pieBoletin(raiz, conFecha.resumen.fecha);
}


/* Fin de fichero: js/embalses/comarca.js */
