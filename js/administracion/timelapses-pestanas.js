
"use strict";

/*
 * MeteoArchidona
 * Administración · Navegación interna de Timelapses.
 *
 * Pestañas:
 * - Configuración
 * - Productos
 *
 * No modifica programaciones ni productos.
 */

const ID_MODULO = "modulo-timelapses";
const ID_NAVEGACION = "navegacionTimelapses";
const ID_CONFIGURACION = "panelConfiguracionTimelapses";
const ID_PRODUCTOS = "contenedorProductosTimelapses";

let pestanaActiva = "configuracion";

export function activarPestanaTimelapses(nombre) {

    if (!["configuracion", "productos"].includes(nombre)) {
        return;
    }

    pestanaActiva = nombre;

    const configuracion =
        document.getElementById(ID_CONFIGURACION);

    const productos =
        document.getElementById(ID_PRODUCTOS);

    if (!configuracion || !productos) {
        return;
    }

    configuracion.hidden = nombre !== "configuracion";
    productos.hidden = nombre !== "productos";

    document.querySelectorAll(
        `#${ID_NAVEGACION} [data-pestana-timelapse]`
    ).forEach(boton => {

        const seleccionada =
            boton.dataset.pestanaTimelapse === nombre;

        boton.setAttribute(
            "aria-selected",
            String(seleccionada)
        );

        boton.tabIndex = seleccionada ? 0 : -1;

        boton.classList.toggle(
            "activo",
            seleccionada
        );

    });

}

export function configurarPestanasTimelapses() {

    const modulo =
        document.getElementById(ID_MODULO);

    if (!modulo) {
        return false;
    }

    if (document.getElementById(ID_NAVEGACION)) {
        activarPestanaTimelapses(pestanaActiva);
        return true;
    }

    const contenido =
        modulo.querySelector(":scope > .admin-grid");

    if (!contenido) {
        return false;
    }

    const navegacion = document.createElement("div");

    navegacion.id = ID_NAVEGACION;
    navegacion.className = "acciones";
    navegacion.setAttribute("role", "tablist");
    navegacion.setAttribute(
        "aria-label",
        "Secciones de Timelapses"
    );

    const configuracion = document.createElement("div");

    configuracion.id = ID_CONFIGURACION;
    configuracion.setAttribute("role", "tabpanel");
    configuracion.setAttribute(
        "aria-label",
        "Configuración de timelapses"
    );

    contenido.replaceWith(configuracion);
    configuracion.appendChild(contenido);

    const productos = document.createElement("div");

    productos.id = ID_PRODUCTOS;
    productos.setAttribute("role", "tabpanel");
    productos.setAttribute(
        "aria-label",
        "Productos timelapse"
    );

    [
        ["configuracion", "Configuración"],
        ["productos", "Productos"]
    ].forEach(([nombre, etiqueta]) => {

        const boton = document.createElement("button");

        boton.type = "button";
        boton.className = "boton boton-secundario";
        boton.dataset.pestanaTimelapse = nombre;
        boton.textContent = etiqueta;
        boton.setAttribute("role", "tab");
        boton.setAttribute(
            "aria-controls",
            nombre === "configuracion"
                ? ID_CONFIGURACION
                : ID_PRODUCTOS
        );

        boton.addEventListener("click", () => {
            activarPestanaTimelapses(nombre);
        });

        navegacion.appendChild(boton);

    });

    modulo.prepend(navegacion);
    modulo.appendChild(productos);

    activarPestanaTimelapses(pestanaActiva);

    return true;

}

// Fin de fichero: js/administracion/timelapses-pestanas.js
