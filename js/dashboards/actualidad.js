/*
 * MeteoArchidona · Dashboards · Actualidad
 *
 * Actualidad pintada como dashboard (José, 5-11-2026; docs/dashboards.md
 * de la API, 7). De momento solo se ve con /actualidad?dashboard, para
 * revisarla antes de sustituir la página de siempre.
 *
 * - El visitante ve el dashboard predeterminado de MeteoArchidona de su
 *   formato: móvil por debajo de 850 px (el mismo corte de Actualidad),
 *   PC por encima.
 * - El registrado tiene arriba el selector con los dashboards de ese
 *   formato (los de MeteoArchidona y los suyos) y «Fijar», que lo guarda
 *   para Actualidad. Elegir en el selector solo lo enseña (&ver=…);
 *   «Fijar» lo deja para siempre.
 *
 * Cambiar de dashboard recarga la página: los componentes llevan sus
 * propios refrescos periódicos y así no se quedan funcionando detrás.
 */

import {pintarDashboard} from "./pintor.js?v=20261108-sismo2";


const CORTE_MOVIL = "(max-width: 850px)";


function urlApi() {
    return window.API_BASE || "/api";
}


function formatoActual() {
    return window.matchMedia(CORTE_MOVIL).matches ? "MOVIL" : "PC";
}


async function pedir(ruta, opciones = {}) {
    const respuesta = await fetch(`${urlApi()}${ruta}`, {
        credentials: "same-origin",
        cache: "no-store",
        ...opciones,
        headers: {"Content-Type": "application/json", ...(opciones.headers || {})}
    });

    if (!respuesta.ok) {
        const error = new Error(`${ruta}: HTTP ${respuesta.status}`);
        error.estado = respuesta.status;
        throw error;
    }

    return respuesta.status === 204 ? null : respuesta.json();
}


function parametroVer() {
    return new URLSearchParams(window.location.search).get("ver");
}


function irA(ver) {
    const consulta = ver ? `?dashboard&ver=${encodeURIComponent(ver)}` : "?dashboard";
    window.location.href = `${window.location.pathname}${consulta}`;
}


async function barraSelector(contenedor, formato, mostrado, fijado) {

    let disponibles;

    try {
        disponibles = await pedir(`/dashboards?formato=${formato}`);
    } catch (error) {
        // Sin sesión (401) no hay selector: el visitante ve el de MeteoArchidona.
        return;
    }

    const barra = document.createElement("div");
    barra.className = "dash-barra";

    const etiqueta = document.createElement("label");
    etiqueta.htmlFor = "dash-selector";
    etiqueta.textContent = formato === "MOVIL" ? "Tu Actualidad (móvil):" : "Tu Actualidad (PC):";

    const selector = document.createElement("select");
    selector.id = "dash-selector";

    const opcionPredeterminado = document.createElement("option");
    opcionPredeterminado.value = "";
    opcionPredeterminado.textContent = "El de MeteoArchidona";
    selector.appendChild(opcionPredeterminado);

    for (const dashboard of disponibles) {
        if (dashboard.predeterminado) {
            continue;
        }
        const opcion = document.createElement("option");
        opcion.value = dashboard.identificador;
        opcion.textContent = `${dashboard.titulo}${dashboard.propio ? " (tuyo)" : ""} — ${dashboard.descripcion}`;
        selector.appendChild(opcion);
    }

    const valorMostrado = mostrado && !mostrado.predeterminado ? mostrado.identificador : "";
    selector.value = valorMostrado;

    const boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = "Fijar";

    const estado = document.createElement("span");
    estado.className = "dash-barra-estado";

    // Fijar el de MeteoArchidona es lo mismo que no fijar nada.
    const valorFijado = fijado && !fijado.predeterminado ? fijado.identificador : "";

    function pintarEstado() {
        const igual = selector.value === valorFijado;
        boton.disabled = igual;
        estado.textContent = igual ? "Es el que tienes fijado." : "Vista previa: pulsa «Fijar» para quedártelo.";
    }

    selector.addEventListener("change", () => irA(selector.value || null));

    boton.addEventListener("click", async () => {
        boton.disabled = true;
        estado.textContent = "Guardando…";
        try {
            await pedir("/usuarios/actualidad/dashboard", {
                method: "PUT",
                body: JSON.stringify({formato, dashboard: selector.value || null})
            });
            irA(null);
        } catch (error) {
            console.error("Actualidad: no se pudo fijar el dashboard.", error);
            estado.textContent = "No se ha podido guardar. Inténtalo de nuevo.";
            boton.disabled = false;
        }
    });

    barra.append(etiqueta, selector, boton, estado);
    contenedor.prepend(barra);
    pintarEstado();
}


export async function arrancarActualidadDashboard(contenedor) {

    // Fuera lo de siempre; se queda el título para lectores de pantalla.
    for (const hijo of [...contenedor.children]) {
        if (!hijo.classList.contains("solo-lectores")) {
            hijo.remove();
        }
    }

    const formato = formatoActual();
    const ver = parametroVer();

    let dashboard = null;
    let fijado = null;

    try {
        if (ver) {
            dashboard = await pedir(`/dashboards/${encodeURIComponent(ver)}`);
        }
    } catch (error) {
        console.warn("Actualidad: no se ha podido abrir ese dashboard.", error);
    }

    try {
        const contenido = await pedir(`/dashboards/actualidad?formato=${formato}`);
        if (contenido.fijado) {
            fijado = contenido.dashboard;
        }
        if (!dashboard) {
            dashboard = contenido.dashboard;
        }
    } catch (error) {
        console.error("Actualidad: no se ha podido leer su dashboard.", error);
    }

    const zona = document.createElement("div");
    contenedor.appendChild(zona);

    await barraSelector(contenedor, formato, dashboard, fijado);

    if (!dashboard) {
        const vacio = document.createElement("p");
        vacio.className = "dash-vacio";
        vacio.textContent = "Todavía no hay un dashboard de Actualidad para esta pantalla.";
        zona.appendChild(vacio);
        return;
    }

    // Si se cruza el corte de móvil, se recarga con el otro formato.
    window.matchMedia(CORTE_MOVIL).addEventListener("change", () => irA(null), {once: true});

    await pintarDashboard(zona, dashboard);
}


/* Fin de fichero: js/dashboards/actualidad.js */
