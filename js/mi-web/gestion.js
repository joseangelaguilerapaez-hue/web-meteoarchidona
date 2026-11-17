/*
 * MeteoArchidona · Mi web · gestión (Mi cuenta → Mi web)
 *
 * Crear, renombrar y borrar las pestañas «Mi web» del registrado, hasta
 * tres, con su nombre corto (el del menú) y su descripción (el título de
 * la pestaña). José, 5 y 17-11-2026; docs/dashboards.md de la API.
 *
 * GET, POST /usuarios/mi-web · PATCH, DELETE /usuarios/mi-web/{id}
 *
 * El texto nunca se mete como HTML.
 */

import {
    MAXIMO_PESTANAS,
    avisarCambio,
    crear,
    direccionPestana,
    llamar
} from "./comun.js?v=20261117-miweb1";


let contenedor = null;
let pestanas = [];
let editando = null;


function boton(texto, clase, accion) {
    const nodo = crear("button", `mi-cuenta-boton ${clase || ""}`.trim(), texto);
    nodo.type = "button";
    nodo.addEventListener("click", accion);
    return nodo;
}


function campo(etiqueta, valor, maximo, ayuda) {
    const envoltorio = crear("label", "mi-cuenta-campo");
    envoltorio.appendChild(crear("span", null, etiqueta));
    const entrada = crear("input");
    entrada.type = "text";
    entrada.maxLength = maximo;
    entrada.required = true;
    entrada.value = valor || "";
    envoltorio.appendChild(entrada);
    if (ayuda) {
        envoltorio.appendChild(crear("small", "mi-cuenta-nota", ayuda));
    }
    return {envoltorio, entrada};
}


function estado(texto, tipo) {
    const nodo = contenedor.querySelector(".mi-web-gestion-estado");
    nodo.textContent = texto || "";
    nodo.dataset.tipo = tipo || "";
}


function formulario(pestana) {
    const form = crear("form", "mi-cuenta-formulario mi-web-gestion-formulario");
    form.noValidate = true;
    form.appendChild(crear("h3", null, pestana ? `Cambiar «${pestana.nombre}»` : "Nueva pestaña"));

    const campos = crear("div", "mi-cuenta-campos");
    const nombre = campo("Nombre en el menú", pestana?.nombre, 30, "Corto: hasta 30 letras.");
    const descripcion = campo("Descripción", pestana?.descripcion, 150, "Sale como título de la pestaña.");
    campos.append(nombre.envoltorio, descripcion.envoltorio);
    form.appendChild(campos);

    const acciones = crear("div", "mi-cuenta-acciones");
    const guardar = crear("button", "mi-cuenta-boton mi-cuenta-boton-principal", pestana ? "Guardar" : "Crear la pestaña");
    guardar.type = "submit";
    acciones.appendChild(guardar);
    if (pestana) {
        acciones.appendChild(boton("Cancelar", "", () => { editando = null; pintar(); }));
    }
    form.appendChild(acciones);

    form.addEventListener("submit", async evento => {
        evento.preventDefault();
        const datos = {nombre: nombre.entrada.value.trim(), descripcion: descripcion.entrada.value.trim()};
        if (!datos.nombre || !datos.descripcion) {
            estado("Pon el nombre y la descripción.", "error");
            return;
        }
        guardar.disabled = true;
        try {
            if (pestana) {
                await llamar("PATCH", `/usuarios/mi-web/${pestana.identificador}`, datos);
                estado(`Guardada «${datos.nombre}».`, "ok");
            } else {
                const nueva = await llamar("POST", "/usuarios/mi-web", datos);
                estado(`Creada «${nueva.nombre}». Ya está en el menú: entra para elegir o crear su dashboard.`, "ok");
            }
            editando = null;
            avisarCambio();
            await cargar();
        } catch (error) {
            estado(error.message, "error");
            guardar.disabled = false;
        }
    });

    return form;
}


function ficha(pestana) {
    const caja = crear("div", "mi-cuenta-ficha mi-web-gestion-ficha");

    const cabecera = crear("div", "mi-web-gestion-cabecera");
    cabecera.appendChild(crear("strong", null, pestana.nombre));
    cabecera.appendChild(crear("span", "mi-web-gestion-numero", `Pestaña ${pestana.orden}`));
    caja.appendChild(cabecera);
    caja.appendChild(crear("p", "mi-cuenta-nota", pestana.descripcion));

    const fijados = crear("p", "mi-web-gestion-fijados");
    fijados.textContent =
        `PC: ${pestana.dashboard_pc ? pestana.dashboard_pc.titulo : "sin dashboard"} · ` +
        `Móvil: ${pestana.dashboard_movil ? pestana.dashboard_movil.titulo : "sin dashboard"}`;
    caja.appendChild(fijados);

    const acciones = crear("div", "mi-cuenta-acciones");
    const abrir = crear("a", "mi-cuenta-boton mi-cuenta-boton-principal", "Abrir");
    abrir.href = direccionPestana(pestana.orden);
    acciones.appendChild(abrir);
    acciones.appendChild(boton("Cambiar nombre", "", () => { editando = pestana.identificador; pintar(); }));
    acciones.appendChild(boton("Borrar", "mi-cuenta-boton-peligro", async () => {
        if (!window.confirm(`¿Borrar la pestaña «${pestana.nombre}»? Tus dashboards no se borran.`)) {
            return;
        }
        try {
            await llamar("DELETE", `/usuarios/mi-web/${pestana.identificador}`);
            estado(`Borrada «${pestana.nombre}».`, "ok");
            avisarCambio();
            await cargar();
        } catch (error) {
            estado(error.message, "error");
        }
    }));
    caja.appendChild(acciones);

    if (editando === pestana.identificador) {
        caja.appendChild(formulario(pestana));
    }
    return caja;
}


function pintar() {
    const lista = contenedor.querySelector(".mi-web-gestion-lista");
    lista.replaceChildren();
    if (!pestanas.length) {
        lista.appendChild(crear("p", "mi-cuenta-vacio", "Todavía no tienes ninguna pestaña."));
    }
    for (const pestana of pestanas) {
        lista.appendChild(ficha(pestana));
    }

    const nueva = contenedor.querySelector(".mi-web-gestion-nueva");
    nueva.replaceChildren();
    if (pestanas.length < MAXIMO_PESTANAS) {
        nueva.appendChild(formulario(null));
    } else {
        nueva.appendChild(crear("p", "mi-cuenta-nota", `Ya tienes las ${MAXIMO_PESTANAS} pestañas. Borra una para crear otra.`));
    }
}


async function cargar() {
    pestanas = (await llamar("GET", "/usuarios/mi-web")).sort((a, b) => a.orden - b.orden);
    pintar();
}


/** Monta el apartado en el contenedor de Mi cuenta (con sesión). */
export async function montarGestionMiWeb(destino) {
    if (!destino) {
        return;
    }
    contenedor = destino;
    if (!contenedor.querySelector(".mi-web-gestion-lista")) {
        contenedor.replaceChildren(
            crear("div", "mi-web-gestion-estado mi-cuenta-estado"),
            crear("div", "mi-web-gestion-lista mi-cuenta-lista"),
            crear("div", "mi-web-gestion-nueva")
        );
        contenedor.querySelector(".mi-web-gestion-estado").setAttribute("role", "status");
        contenedor.querySelector(".mi-web-gestion-estado").setAttribute("aria-live", "polite");
    }
    try {
        await cargar();
    } catch (error) {
        estado(error.message, "error");
    }
}


/* Fin de fichero: js/mi-web/gestion.js */
