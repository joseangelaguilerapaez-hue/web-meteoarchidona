/* ============================================================
   INTERFAZ - Gestión de UI, reloj, navegación
   ============================================================ */

import { asignarTexto, obtenerElemento } from "./utils.js";

export function actualizarReloj() {
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString("es-ES");
    const hora = ahora.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
    });

    asignarTexto("fecha-actual", fecha);
    asignarTexto("reloj-actual", hora);
}

export function inicializarReloj() {
    actualizarReloj();
    setInterval(actualizarReloj, 1000);
}

export function rutaDesdePanel(nombrePanel) {
    if (!nombrePanel) {
        return "/";
    }
    return `/${nombrePanel}`;
}

export function panelDesdeRuta(ruta) {
    if (ruta === "/" || ruta === "") {
        return "actualidad";
    }
    return ruta.replace(/^\//, "").replace(/\/$/, "");
}

const PANELES_VALIDOS = ["actualidad", "prediccion", "observaciones", "en-vivo", "info"];

export function activarPanel(nombrePanel) {
    if (!PANELES_VALIDOS.includes(nombrePanel)) {
        nombrePanel = "actualidad";
    }

    for (const panel of PANELES_VALIDOS) {
        const elemento = obtenerElemento(`panel-${panel}`);
        if (elemento) {
            elemento.hidden = panel !== nombrePanel;
        }
    }

    const ruta = rutaDesdePanel(nombrePanel);
    window.history.pushState({ panel: nombrePanel }, "", ruta);
}

export function inicializarNavegacion() {
    const ruta = window.location.pathname;
    const panel = panelDesdeRuta(ruta);
    activarPanel(panel);

    window.addEventListener("popstate", (evento) => {
        const panelRestaurado = evento.state?.panel || "actualidad";
        activarPanel(panelRestaurado);
    });
}
