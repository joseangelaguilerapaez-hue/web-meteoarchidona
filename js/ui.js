/* ============================================================
   INTERFAZ - Gestión de UI, reloj, navegación
   ============================================================

   La lista de secciones sale de js/rutas.js (window.RUTAS_NAVEGACION),
   que es el único sitio donde se definen. Se lee en cada llamada
   y no al cargar el módulo, porque rutas.js es un script normal
   y este es un módulo: si se leyera arriba, el orden de carga
   podría dejar la lista vacía.
   ============================================================ */

import { asignarTexto } from "./utils.js";

const PANEL_DE_RESERVA = "actualidad";

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

export function panelesValidos() {
    const rutas = globalThis.window?.RUTAS_NAVEGACION;

    if (Array.isArray(rutas) && rutas.length > 0) {
        return rutas.map((ruta) => ruta.id);
    }

    return [PANEL_DE_RESERVA];
}

export function panelPorDefecto() {
    return globalThis.window?.RUTA_POR_DEFECTO || panelesValidos()[0] || PANEL_DE_RESERVA;
}

/*
La navegación entre secciones va por hash (#prediccion) y no por
ruta (/prediccion): con ruta, al recargar el navegador pide una
página que no existe y además se rompen los enlaces relativos.
*/
export function hashDesdePanel(nombrePanel) {
    if (!nombrePanel || !panelesValidos().includes(nombrePanel)) {
        return "";
    }

    return `#${nombrePanel}`;
}

export function panelDesdeHash(hash) {
    if (typeof hash !== "string") {
        return panelPorDefecto();
    }

    const panel = hash.replace(/^#+/, "").trim().toLowerCase();

    return panelesValidos().includes(panel) ? panel : panelPorDefecto();
}

/*
Muestra una sección y oculta las demás. Los paneles se marcan con
la clase .activo, que es lo que espera la hoja de estilos, y los
enlaces de la navegación se marcan igual.
*/
export function activarPanel(nombrePanel, actualizarRuta = true) {
    const paneles = document.querySelectorAll("[data-panel-contenido]");
    const enlaces = document.querySelectorAll(".navegacion [data-panel]");

    let panelEncontrado = false;

    paneles.forEach((panel) => {
        const activo = panel.dataset.panelContenido === nombrePanel;

        panel.classList.toggle("activo", activo);
        panel.setAttribute("aria-hidden", String(!activo));

        if (activo) {
            panelEncontrado = true;
        }
    });

    if (!panelEncontrado) {
        return;
    }

    enlaces.forEach((enlace) => {
        const activo = enlace.dataset.panel === nombrePanel;

        enlace.classList.toggle("activo", activo);

        if (activo) {
            enlace.setAttribute("aria-current", "page");
        } else {
            enlace.removeAttribute("aria-current");
        }
    });

    if (actualizarRuta) {
        history.replaceState({ panel: nombrePanel }, "", hashDesdePanel(nombrePanel));
    }

    window.scrollTo({ top: 0, behavior: "auto" });
}

export function inicializarNavegacion() {
    document.querySelectorAll("[data-panel]").forEach((control) => {
        control.addEventListener("click", (evento) => {
            const nombrePanel = control.dataset.panel;

            if (!nombrePanel) {
                return;
            }

            evento.preventDefault();
            activarPanel(nombrePanel);
        });
    });

    activarPanel(panelDesdeHash(window.location.hash), false);

    window.addEventListener("popstate", () => {
        activarPanel(panelDesdeHash(window.location.hash), false);
    });
}
