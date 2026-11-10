/*
 * MeteoArchidona · Componente «Episodios de calima»
 *
 * Los episodios de calima de un año en Archidona (días seguidos con
 * polvo del Sáhara), con su nivel, su polvo máximo, si hubo lluvia de
 * barro y las notas del equipo, y el total de días con calima. Con un
 * selector de año.
 *
 *     <div data-componente="calima-episodios"></div>
 *     <div data-componente="calima-episodios" data-anio="2026" data-titulo="no"></div>
 *
 * Los episodios los crea la API con la previsión del modelo (desde el
 * 11-11-2026) y el equipo los revisa en Administración.
 *
 * API: GET /calima/episodios?localidad&anio
 */

import {
    pedir, crear, prepararRaiz, aviso, avisoError, titulo, pie, leerLocalidad, vaciar,
    pastillaCalima, microgramos, espesor, fechaCorta
} from "./comun.js?v=20261111-aire1";


const PRIMER_ANIO = 2026;


export async function montarEpisodiosCalima(raiz) {
    prepararRaiz(raiz, "calima-episodios");

    const actual = new Date().getFullYear();
    let anio = Number(raiz.dataset.anio) || actual;

    titulo(raiz, "Episodios de calima", "Polvo del Sáhara en Archidona");

    const controles = crear("div", "air-controles");
    const etiqueta = crear("label", null, "Año ");
    const selector = crear("select");
    for (let valor = actual; valor >= PRIMER_ANIO; valor -= 1) {
        const opcion = crear("option", null, String(valor));
        opcion.value = String(valor);
        if (valor === anio) opcion.selected = true;
        selector.appendChild(opcion);
    }
    etiqueta.appendChild(selector);
    controles.appendChild(etiqueta);
    raiz.appendChild(controles);

    const cuerpo = crear("div", "air-episodios-cuerpo");
    raiz.appendChild(cuerpo);

    async function pintar() {
        aviso(cuerpo, "Buscando episodios…");

        let datos;
        try {
            datos = await pedir(`/calima/episodios?localidad=${leerLocalidad(raiz)}&anio=${anio}`);
        } catch (error) {
            avisoError(cuerpo, error, "los episodios de calima");
            return;
        }

        vaciar(cuerpo);

        const resumen = crear("p", "air-episodios-resumen");
        const dias = datos.dias_con_calima;
        resumen.appendChild(crear("strong", "air-cifra", String(dias)));
        resumen.appendChild(document.createTextNode(
            ` ${dias === 1 ? "día" : "días"} con calima en ${datos.anio} · ${datos.episodios.length} ${datos.episodios.length === 1 ? "episodio" : "episodios"}`));
        cuerpo.appendChild(resumen);

        if (!datos.episodios.length) {
            cuerpo.appendChild(crear("p", "air-aviso", anio === PRIMER_ANIO
                ? "Todavía no hay episodios registrados: se guardan desde el 11 de noviembre de 2026."
                : "Ningún episodio registrado ese año."));
            return;
        }

        const lista = crear("ol", "air-episodios");

        for (const episodio of [...datos.episodios].reverse()) {
            const fila = crear("li", `calima-${episodio.nivel}`);
            const fechas = episodio.inicio === episodio.fin
                ? fechaCorta(episodio.inicio)
                : `${fechaCorta(episodio.inicio)} – ${fechaCorta(episodio.fin)}`;
            const cabeza = crear("div", "air-episodio-cabeza");
            cabeza.appendChild(crear("strong", null, fechas));
            cabeza.appendChild(crear("small", null, episodio.dias === 1 ? "1 día" : `${episodio.dias} días`));
            cabeza.appendChild(pastillaCalima(episodio.nivel, true));
            fila.appendChild(cabeza);

            const detalle = [];
            if (episodio.polvo_maximo !== null) detalle.push(`polvo máximo ${microgramos(episodio.polvo_maximo)}`);
            if (episodio.espesor_optico_maximo !== null) detalle.push(`turbidez ${espesor(episodio.espesor_optico_maximo)}`);
            if (episodio.lluvia_barro) detalle.push("con lluvia de barro");
            if (episodio.origen === "MANUAL") detalle.push("anotado por el equipo");
            if (detalle.length) fila.appendChild(crear("p", "air-episodio-detalle", detalle.join(" · ")));
            if (episodio.notas) fila.appendChild(crear("p", "air-episodio-notas", episodio.notas));

            lista.appendChild(fila);
        }

        cuerpo.appendChild(lista);
    }

    selector.addEventListener("change", () => {
        anio = Number(selector.value);
        pintar();
    });

    await pintar();
    pie(raiz, "Días seguidos con calima según el modelo CAMS europeo; revisados por MeteoArchidona.");
}


/* Fin de fichero: js/calidad-aire/episodios.js */
