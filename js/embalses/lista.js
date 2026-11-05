/*
 * MeteoArchidona · Componente «Lista de embalses»
 *
 * Los embalses de un ámbito con su última lectura: porcentaje, barra de
 * agua y variación de la semana. Se puede buscar por nombre y ordenar
 * por porcentaje, por nombre o por capacidad. Cada nombre lleva a su
 * ficha en la página Embalses.
 *
 *     <div data-componente="embalses-lista"></div>                          (Andalucía)
 *     <div data-componente="embalses-lista" data-ambito="PROVINCIA" data-codigo="Málaga"></div>
 *     <div data-componente="embalses-lista" data-ambito="ESPANA" data-maximo="10"></div>
 *
 *     import {montarListaEmbalses} from "/js/embalses/lista.js?v=…";
 *     montarListaEmbalses(hueco);
 *
 * data-maximo: cuántos enseña antes del botón «Ver todos» (25 por
 * defecto). data-orden: PORCENTAJE (por defecto), NOMBRE o CAPACIDAD.
 * data-buscador="no" lo quita (para casillas pequeñas de un dashboard).
 *
 * En la página Embalses, al tocar un embalse avisa con el evento
 * «embalses:embalse» en vez de navegar (lo escucha js/embalses.js).
 *
 * API: GET /embalses/lista?ambito&codigo (solo los que tienen lectura
 * en las 4 últimas semanas).
 */

import {
    leerAmbito, consulta, pedir, enlacePagina,
    crear, vaciar, aviso, prepararRaiz, barra, pieBoletin,
    porcentaje, hm3, variacion, claseTendencia, NOMBRES_ESTADO
} from "./comun.js?v=20261105-embalses1";


const ORDENES = {
    PORCENTAJE: ["% lleno", (a, b) => (b.porcentaje ?? -1) - (a.porcentaje ?? -1)],
    NOMBRE: ["Nombre", (a, b) => a.nombre.localeCompare(b.nombre, "es")],
    CAPACIDAD: ["Capacidad", (a, b) => (b.capacidad ?? 0) - (a.capacidad ?? 0)]
};


function normalizar(texto) {
    return (texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function fila(embalse) {
    const elemento = crear("li", `emb-fila estado-${embalse.estado || "NINGUNO"}`);

    const nombre = crear("div", "emb-fila-nombre");
    const enlace = crear("a", null, embalse.nombre);
    enlace.href = enlacePagina({ embalse: embalse.codigo });
    enlace.dataset.embalse = embalse.codigo;
    nombre.appendChild(enlace);
    const lugar = [embalse.provincia, embalse.cuenca_nombre].filter(Boolean).join(" · ");
    nombre.appendChild(crear("small", null, `${lugar} · ${hm3(embalse.capacidad)}`));
    elemento.appendChild(nombre);

    const nivel = barra(embalse.porcentaje, embalse.estado);
    nivel.title = NOMBRES_ESTADO[embalse.estado] || "";
    elemento.appendChild(nivel);

    elemento.appendChild(crear("span", "emb-fila-porcentaje", porcentaje(embalse.porcentaje)));
    elemento.appendChild(crear("span", `emb-fila-variacion ${claseTendencia(embalse.variacion_semanal)}`, variacion(embalse.variacion_semanal, "")));

    return elemento;
}


export async function montarListaEmbalses(raiz) {
    prepararRaiz(raiz, "embalses-lista");
    aviso(raiz, "Cargando la lista de embalses…");

    const ambito = leerAmbito(raiz);
    const maximo = Math.max(1, parseInt(raiz.dataset.maximo, 10) || 25);
    let orden = ORDENES[(raiz.dataset.orden || "").toUpperCase()] ? raiz.dataset.orden.toUpperCase() : "PORCENTAJE";
    let todos = false;
    let busqueda = "";

    let datos;
    try {
        datos = await pedir(`/embalses/lista?${consulta(ambito)}`);
    } catch (error) {
        aviso(raiz, error.estado === 404
            ? "No hay embalses en ese ámbito."
            : "No se ha podido leer la lista de embalses. Se puede volver a intentar más tarde.", true);
        return;
    }

    const embalses = datos.embalses || [];
    raiz.textContent = "";

    if (!embalses.length) {
        aviso(raiz, "No hay embalses con lecturas recientes en este ámbito.");
        return;
    }

    const controles = crear("div", "emb-ordenes");

    if (raiz.dataset.buscador !== "no") {
        const buscador = crear("input", "emb-buscador");
        buscador.type = "search";
        buscador.placeholder = `Buscar entre ${embalses.length} embalses`;
        buscador.setAttribute("aria-label", "Buscar embalse");
        buscador.addEventListener("input", () => {
            busqueda = normalizar(buscador.value.trim());
            pintar();
        });
        raiz.appendChild(buscador);
    }

    const botones = [];
    for (const [clave, [texto]] of Object.entries(ORDENES)) {
        const boton = crear("button", "emb-boton", texto);
        boton.type = "button";
        boton.setAttribute("aria-pressed", String(clave === orden));
        boton.addEventListener("click", () => {
            orden = clave;
            botones.forEach(b => b.setAttribute("aria-pressed", String(b === boton)));
            pintar();
        });
        botones.push(boton);
        controles.appendChild(boton);
    }
    raiz.appendChild(controles);

    const lista = crear("ul", "emb-filas");
    raiz.appendChild(lista);

    const mas = crear("button", "emb-boton emb-mas");
    mas.type = "button";
    mas.addEventListener("click", () => {
        todos = !todos;
        pintar();
    });
    raiz.appendChild(mas);

    function pintar() {
        vaciar(lista);
        const filtrados = embalses
            .filter(e => !busqueda || normalizar(`${e.nombre} ${e.provincia || ""} ${e.cuenca_nombre}`).includes(busqueda))
            .sort(ORDENES[orden][1]);
        const visibles = todos || busqueda ? filtrados : filtrados.slice(0, maximo);

        for (const embalse of visibles) lista.appendChild(fila(embalse));

        if (!filtrados.length) {
            lista.appendChild(crear("li", "emb-aviso", "Ningún embalse coincide con la búsqueda."));
        }

        mas.hidden = busqueda !== "" || filtrados.length <= maximo;
        mas.textContent = todos ? "Ver menos" : `Ver los ${filtrados.length}`;
    }

    lista.addEventListener("click", evento => {
        const enlace = evento.target.closest("a[data-embalse]");
        if (!enlace) return;
        const peticion = new CustomEvent("embalses:embalse", {
            bubbles: true,
            cancelable: true,
            detail: { codigo: enlace.dataset.embalse }
        });
        if (!raiz.dispatchEvent(peticion)) evento.preventDefault();
    });

    pintar();
    pieBoletin(raiz, datos.ultima_fecha);
}


/* Fin de fichero: js/embalses/lista.js */
