/*
 * MeteoArchidona · Componente «Embalses por cuenca»
 *
 * Una tarjeta por cada cuenca con embalses en el ámbito: porcentaje,
 * barra de agua, variación de la semana y diferencia con hace un año.
 * Con un ámbito que no es España, cada tarjeta cuenta solo la parte de
 * la cuenca que cae dentro (la del Guadalquivir en Andalucía, por
 * ejemplo).
 *
 *     <div data-componente="embalses-cuencas"></div>                      (Andalucía)
 *     <div data-componente="embalses-cuencas" data-ambito="ESPANA"></div>
 *
 *     import {montarCuencasEmbalses} from "/js/embalses/cuencas.js?v=…";
 *     montarCuencasEmbalses(hueco);
 *
 * Al tocar una tarjeta se abre la página Embalses con esa cuenca. En la
 * propia página, en vez de navegar, avisa con el evento
 * «embalses:ambito» (lo escucha js/embalses.js).
 *
 * API: GET /embalses/cuencas?ambito&codigo.
 */

import {
    leerAmbito, consulta, pedir, enlacePagina,
    crear, aviso, prepararRaiz, barra, pieBoletin,
    porcentaje, variacion, puntos, claseTendencia
} from "./comun.js?v=20261105-embalses1";


function tarjeta(cuenca) {
    const resumen = cuenca.resumen;
    const caja = crear("article", `emb-cuenca estado-${resumen.estado || "NINGUNO"}`);
    caja.dataset.codigo = cuenca.codigo;
    caja.tabIndex = 0;
    caja.setAttribute("role", "link");

    const cabeza = crear("div", "emb-cuenca-cabeza");
    cabeza.appendChild(crear("h4", "emb-cuenca-nombre", cuenca.nombre));
    cabeza.appendChild(crear("span", "emb-cuenca-porcentaje", porcentaje(resumen.porcentaje)));
    caja.appendChild(cabeza);

    caja.appendChild(barra(resumen.porcentaje, resumen.estado));

    const detalle = crear("p", "emb-cuenca-detalle");
    detalle.appendChild(document.createTextNode("Semana: "));
    detalle.appendChild(crear("span", `emb-cifra ${claseTendencia(resumen.variacion_semanal)}`, variacion(resumen.variacion_semanal)));

    if (resumen.porcentaje_hace_un_anio !== null && resumen.porcentaje !== null) {
        const diferencia = resumen.porcentaje - resumen.porcentaje_hace_un_anio;
        detalle.appendChild(document.createTextNode(" · Hace un año: "));
        detalle.appendChild(crear("span", `emb-cifra ${claseTendencia(diferencia)}`, puntos(diferencia)));
    }

    caja.appendChild(detalle);
    return caja;
}


export async function montarCuencasEmbalses(raiz) {
    prepararRaiz(raiz, "embalses-cuencas");
    aviso(raiz, "Cargando las cuencas…");

    const ambito = leerAmbito(raiz);

    let datos;
    try {
        datos = await pedir(`/embalses/cuencas?${consulta(ambito)}`);
    } catch (error) {
        aviso(raiz, error.estado === 404
            ? "No hay embalses en ese ámbito."
            : "No se han podido leer las cuencas. Se puede volver a intentar más tarde.", true);
        return;
    }

    const cuencas = (datos.cuencas || []).filter(cuenca => cuenca.resumen);
    raiz.textContent = "";

    if (!cuencas.length) {
        aviso(raiz, "Todavía no hay datos de este ámbito.");
        return;
    }

    const rejilla = crear("div", "emb-cuencas");
    for (const cuenca of cuencas) {
        rejilla.appendChild(tarjeta(cuenca));
    }
    raiz.appendChild(rejilla);

    const abrir = codigo => {
        const evento = new CustomEvent("embalses:ambito", {
            bubbles: true,
            cancelable: true,
            detail: { ambito: "CUENCA", codigo }
        });
        // Si nadie lo atiende (un dashboard), se va a la página Embalses.
        if (raiz.dispatchEvent(evento)) {
            window.location.href = enlacePagina({ ambito: "CUENCA", codigo });
        }
    };

    rejilla.addEventListener("click", evento => {
        const caja = evento.target.closest(".emb-cuenca[data-codigo]");
        if (caja) abrir(caja.dataset.codigo);
    });

    rejilla.addEventListener("keydown", evento => {
        if (evento.key !== "Enter" && evento.key !== " ") return;
        const caja = evento.target.closest(".emb-cuenca[data-codigo]");
        if (caja) {
            evento.preventDefault();
            abrir(caja.dataset.codigo);
        }
    });

    pieBoletin(raiz, cuencas[0].resumen.fecha);
}


/* Fin de fichero: js/embalses/cuencas.js */
