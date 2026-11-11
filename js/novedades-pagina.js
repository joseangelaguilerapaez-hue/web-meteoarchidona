/*
 * MeteoArchidona · Página «Novedades y avisos»
 *
 * Decisión de José del 11-11-2026: una sección con todo lo que sale al
 * entrar en la web, para volver a consultarlo. Arriba, lo vigente
 * (avisos primero); debajo, lo de las últimas semanas, ya caducado.
 * Mismas piezas que la ventana de la portada (js/novedades.js).
 *
 * API: GET /novedades/archivo?dias=60.
 */

import { asegurarHoja, pintarNovedad } from "./novedades.js?v=20261111-avisos1";


const DIAS = 60;


function crear(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
}


function seccion(titulo, entradas, vacio) {
    const caja = crear("section", "novedades-pagina-seccion");
    caja.appendChild(crear("h2", "novedades-pagina-subtitulo", titulo));
    if (!entradas.length) {
        caja.appendChild(crear("p", "novedades-pagina-vacio", vacio));
        return caja;
    }
    const lista = crear("div", "novedades-pagina-lista");
    for (const entrada of entradas) {
        const tarjeta = crear("div", `novedades-pagina-tarjeta${entrada.vigente ? "" : " pasada"}`);
        tarjeta.appendChild(pintarNovedad(entrada));
        lista.appendChild(tarjeta);
    }
    caja.appendChild(lista);
    return caja;
}


async function montar() {
    const raiz = document.querySelector("[data-novedades-pagina]");
    if (!raiz) return;
    asegurarHoja();
    raiz.appendChild(crear("p", "novedades-pagina-vacio", "Cargando…"));

    let datos;
    try {
        const respuesta = await fetch(`${window.API_BASE || "/api"}/novedades/archivo?dias=${DIAS}`);
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        datos = await respuesta.json();
    } catch {
        raiz.textContent = "";
        raiz.appendChild(crear("p", "novedades-pagina-vacio", "No se han podido cargar las novedades. Prueba dentro de un rato."));
        return;
    }

    const todas = datos.novedades || [];
    // Lo vigente: avisos primero, luego novedades; cada grupo, de lo más reciente a lo más antiguo.
    const vigentes = todas.filter(n => n.vigente)
        .sort((a, b) => (a.tipo === "AVISO" ? 0 : 1) - (b.tipo === "AVISO" ? 0 : 1));
    const pasadas = todas.filter(n => !n.vigente);

    raiz.textContent = "";
    raiz.appendChild(seccion("Ahora", vigentes, "Ahora mismo no hay avisos ni novedades."));
    raiz.appendChild(seccion(`Últimos ${datos.dias || DIAS} días`, pasadas, "Nada más en estas semanas."));
}


montar();


/* Fin de fichero: js/novedades-pagina.js */
