/*
 * MeteoArchidona · Componente «Polen hoy»
 *
 * El semáforo del polen de hoy en Archidona según el modelo CAMS: un
 * sello con el peor nivel del día y, debajo, cada tipo (olivo, gramíneas
 * y artemisa) con su media del día y su nivel. El nivel sale siempre de
 * la media diaria, no del máximo (José, 6-11-2026).
 *
 *     <div data-componente="polen-hoy"></div>
 *     <div data-componente="polen-hoy" data-localidad="29017" data-titulo="no"></div>
 *
 * Fuera de la temporada del modelo (el olivo va de enero a junio y las
 * gramíneas de febrero a agosto) no hay previsión y lo dice.
 *
 * API: GET /polen/prevision?localidad&dias=4 (la misma petición que el
 * componente de próximos días, que se comparte).
 */

import {
    pedir, crear, aviso, prepararRaiz, titulo, pie, pastillaNivel,
    granos, fechaLarga, horaActualizacion, NOMBRES_NIVEL, FUENTE_MODELO
} from "./comun.js?v=20261106-polen1";


export function rutaPrevision(raiz) {
    const localidad = raiz.dataset.localidad || "29017";
    return `/polen/prevision?localidad=${encodeURIComponent(localidad)}&dias=4`;
}


export async function montarPolenHoy(raiz) {
    prepararRaiz(raiz, "polen-hoy");
    aviso(raiz, "Mirando el polen de hoy…");

    let datos;

    try {
        datos = await pedir(rutaPrevision(raiz));
    } catch (error) {
        aviso(raiz, error.estado === 404
            ? "No hay previsión de polen para esa localidad."
            : "No se ha podido leer la previsión del polen. Se puede volver a intentar más tarde.", true);
        return;
    }

    raiz.textContent = "";
    titulo(raiz, "Polen hoy", datos.nombre_localidad);

    const hoy = datos.dias[0];

    if (!hoy || hoy.tipos.every(tipo => tipo.nivel === "NULO")) {
        raiz.appendChild(crear("p", "pol-aviso", hoy
            ? "El modelo no ve polen de olivo, gramíneas ni artemisa en el aire hoy."
            : "Ahora no hay previsión del modelo: solo calcula el olivo de enero a junio y las gramíneas de febrero a agosto. Fuera de esa época, lo último medido en Granada da la referencia."));
        pie(raiz, FUENTE_MODELO);
        return;
    }

    const caja = crear("div", "pol-hoy");

    const sello = crear("div", `pol-hoy-sello nivel-${hoy.nivel}`);
    sello.setAttribute("role", "img");
    sello.setAttribute("aria-label", `Nivel de polen de hoy: ${NOMBRES_NIVEL[hoy.nivel] || "sin dato"}`);
    const textoSello = crear("div");
    textoSello.appendChild(crear("small", null, "Hoy"));
    textoSello.appendChild(crear("strong", null, NOMBRES_NIVEL[hoy.nivel] || "—"));
    sello.appendChild(textoSello);
    caja.appendChild(sello);

    const lista = crear("ul", "pol-tipos");

    for (const tipo of hoy.tipos) {
        const fila = crear("li", `pol-tipo nivel-${tipo.nivel}`);
        fila.appendChild(crear("span", "pol-tipo-nombre", tipo.nombre));
        fila.appendChild(crear("span", "pol-tipo-cifra pol-cifra", granos(tipo.media)));
        fila.appendChild(pastillaNivel(tipo.nivel));
        fila.title = `Media del día ${granos(tipo.media)}; máximo horario ${granos(tipo.maximo)}`;
        lista.appendChild(fila);
    }

    caja.appendChild(lista);
    raiz.appendChild(caja);

    const actualizada = horaActualizacion(datos.actualizada);
    pie(raiz, `${fechaLarga(hoy.fecha)} · media del día · ${FUENTE_MODELO}${actualizada ? ` · ${actualizada}` : ""}`);
}


/* Fin de fichero: js/polen/hoy.js */
