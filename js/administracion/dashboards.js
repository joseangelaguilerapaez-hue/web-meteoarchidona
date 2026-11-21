/*
 * MeteoArchidona
 * Administración · Dashboards
 *
 * Los dashboards de MeteoArchidona (docs/dashboards.md de la API; José,
 * 4, 5 y 17-11-2026): lista por formato con el predeterminado marcado, y
 * «Nuevo», «Editar», «Copiar», «Borrar» y «Predeterminado». La rejilla se
 * edita con el editor común (js/dashboards/editor.js), el mismo que usarán
 * las pestañas «Mi web».
 *
 * GET y POST /admin/dashboards · GET, PUT y DELETE /admin/dashboards/{id}
 * PUT /admin/dashboards/{id}/predeterminado
 *
 * El predeterminado solo lo usa hoy la versión de prueba de Actualidad
 * (/actualidad?dashboard): Actualidad sigue siendo una sección fija (José,
 * 17-11-2026). También se puede fijar en las pestañas.
 *
 * El texto nunca se mete como HTML.
 */

import {
    $,
    mostrarEstado
} from "./estado.js?v=20261026-cache1";

import {
    peticionAdministrativa,
    peticionJson
} from "./api.js?v=20261026-cache1";

import {abrirEditor} from "../dashboards/editor.js?v=20261121-llenar1";


const RUTA = "/admin/dashboards";

const NOMBRE_FORMATO = {PC: "PC", MOVIL: "Móvil"};

const FECHA = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
});

let configurado = false;


function crear(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
}


function boton(texto, clase, accion) {
    const nodo = crear("button", `boton ${clase}`, texto);
    nodo.type = "button";
    nodo.addEventListener("click", accion);
    return nodo;
}


function estado(texto, tipo) {
    mostrarEstado($("estadoDashboards"), texto, tipo);
}


function mostrarLista() {
    $("editorDashboard").hidden = true;
    $("contenedorEditorDashboard").textContent = "";
    $("listaDashboardsPanel").hidden = false;
}


/* ==========================================================
   LISTA
   ========================================================== */

function tarjeta(dashboard) {
    const fila = crear("div", "dash-admin-fila");

    const texto = crear("div", "dash-admin-texto");
    const titulo = crear("div", "dash-admin-titulo", dashboard.titulo);
    if (dashboard.predeterminado) {
        titulo.appendChild(crear("span", "dash-admin-marca", "Predeterminado"));
    }
    texto.appendChild(titulo);
    texto.appendChild(crear("div", "dash-admin-descripcion", dashboard.descripcion));
    texto.appendChild(crear("div", "dash-admin-fecha", `Cambiado el ${FECHA.format(new Date(dashboard.fecha_actualizacion))}`));
    fila.appendChild(texto);

    const acciones = crear("div", "dash-admin-acciones");
    acciones.append(
        boton("Editar", "boton-principal boton-mini", () => editar(dashboard.identificador, false)),
        boton("Copiar", "boton-secundario boton-mini", () => editar(dashboard.identificador, true)),
        boton(
            dashboard.predeterminado ? "Quitar predeterminado" : "Predeterminado",
            "boton-secundario boton-mini",
            () => marcarPredeterminado(dashboard)
        ),
        boton("Borrar", "boton-peligro boton-mini", () => borrar(dashboard))
    );
    fila.appendChild(acciones);
    return fila;
}


export async function cargarDashboards() {
    const lista = $("listaDashboards");
    if (!lista) {
        return;
    }

    const dashboards = await peticionJson(RUTA);
    lista.textContent = "";

    for (const formato of ["PC", "MOVIL"]) {
        const grupo = crear("section", "dash-admin-grupo");
        const deEste = dashboards.filter(d => d.formato === formato);
        grupo.appendChild(crear("h3", "dash-admin-grupo-titulo", `${NOMBRE_FORMATO[formato]} (${deEste.length})`));
        if (!deEste.length) {
            grupo.appendChild(crear("p", "dash-admin-vacio", "Ninguno todavía."));
        }
        for (const dashboard of deEste) {
            grupo.appendChild(tarjeta(dashboard));
        }
        lista.appendChild(grupo);
    }

    estado("", "info");
}


/* ==========================================================
   EDITAR, COPIAR Y NUEVO
   ========================================================== */

async function abrir(dashboard, copia, formato) {
    $("listaDashboardsPanel").hidden = true;
    $("editorDashboard").hidden = false;
    $("tituloEditorDashboard").textContent = !dashboard
        ? "Nuevo dashboard"
        : copia ? `Copia de «${dashboard.titulo}»` : `Editar «${dashboard.titulo}»`;

    const contenedor = $("contenedorEditorDashboard");
    await abrirEditor(contenedor, {
        dashboard,
        copia,
        formato,
        guardar: async datos => {
            if (dashboard && !copia) {
                const {formato: _, ...cambio} = datos;
                await peticionJson(`${RUTA}/${dashboard.identificador}`, {method: "PUT", body: JSON.stringify(cambio)});
            } else {
                await peticionJson(RUTA, {method: "POST", body: JSON.stringify(datos)});
            }
            mostrarLista();
            await cargarDashboards();
            estado(`Guardado «${datos.titulo}».`, "ok");
        },
        cancelar: () => {
            mostrarLista();
            estado("", "info");
        }
    });
    $("editorDashboard").scrollIntoView({behavior: "smooth", block: "start"});
}


async function editar(identificador, copia) {
    try {
        const dashboard = await peticionJson(`${RUTA}/${identificador}`);
        await abrir(dashboard, copia);
    } catch (error) {
        mostrarLista();
        estado(error.message || "No se ha podido abrir el dashboard.", "error");
    }
}


/* ==========================================================
   PREDETERMINADO Y BORRAR
   ========================================================== */

async function marcarPredeterminado(dashboard) {
    try {
        await peticionJson(`${RUTA}/${dashboard.identificador}/predeterminado`, {
            method: "PUT",
            body: JSON.stringify({predeterminado: !dashboard.predeterminado})
        });
        await cargarDashboards();
        estado(
            dashboard.predeterminado
                ? `«${dashboard.titulo}» ya no es el predeterminado.`
                : `«${dashboard.titulo}» es ahora el predeterminado de ${NOMBRE_FORMATO[dashboard.formato]}.`,
            "ok"
        );
    } catch (error) {
        estado(error.message || "No se ha podido cambiar el predeterminado.", "error");
    }
}


async function borrar(dashboard) {
    if (!window.confirm(
        `¿Borrar «${dashboard.titulo}»? No se puede deshacer. ` +
        "Las pestañas de los usuarios que lo tengan fijado se quedarán vacías."
    )) {
        return;
    }
    try {
        await peticionAdministrativa(`${RUTA}/${dashboard.identificador}`, {method: "DELETE"});
        await cargarDashboards();
        estado(`Borrado «${dashboard.titulo}».`, "ok");
    } catch (error) {
        estado(error.message || "No se ha podido borrar.", "error");
    }
}


/* ==========================================================
   EVENTOS
   ========================================================== */

export function configurarEventosDashboards() {
    if (configurado || !$("modulo-dashboards")) {
        return;
    }
    configurado = true;

    $("botonRecargarDashboards").addEventListener("click", async () => {
        try {
            await cargarDashboards();
            estado("Lista actualizada.", "ok");
        } catch (error) {
            estado(error.message || "No se han podido cargar los dashboards.", "error");
        }
    });

    $("botonNuevoDashboardPc").addEventListener("click", () => abrir(null, false, "PC"));
    $("botonNuevoDashboardMovil").addEventListener("click", () => abrir(null, false, "MOVIL"));
}


/* Fin de fichero: js/administracion/dashboards.js */
